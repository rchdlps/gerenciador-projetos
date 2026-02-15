# Performance Optimization Design

**Date:** 2026-02-15
**Status:** Approved
**Scope:** Server-side query optimization, client-side caching, bundle optimization

## Context

After a comprehensive performance audit of the entire codebase (21 route files, 6 query helpers, 10+ Astro pages, middleware, schema, and React components), we identified several categories of performance issues. The application already has good foundations (session caching in auth middleware, parallelized queries via Promise.all, fire-and-forget audit logs) but has gaps in database query patterns, client-side caching, and bundle loading strategy.

## Phase 1: Quick Wins

### 1.1 Add Missing Database Indexes

**File:** `db/schema.ts`

Add composite indexes for frequently-filtered columns:

```typescript
// tasks table — calendar/schedule queries use startDate/endDate
index('task_dates_idx').on(t.startDate, t.endDate)

// projects table — org-scoped filtering
index('project_org_status_idx').on(t.organizationId, t.status)
```

**Why:** Calendar queries (`getDatedTasks`) filter on `startDate/endDate` with no index. Project listings filter by `(organizationId, status)` on every dashboard load.

### 1.2 Configure Connection Pool

**File:** `src/lib/db.ts`

```typescript
export const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 5,
})
```

**Why:** Currently uses postgres-js defaults with no explicit pool config. On Vercel serverless, each function instance should have a reasonable pool limit.

### 1.3 Default staleTime on React QueryClient

**File:** `src/components/providers.tsx`

```typescript
const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,  // 30 seconds
            gcTime: 5 * 60_000, // 5 minutes (already default)
            retry: 1,
        },
    },
}))
```

**Why:** Current default `staleTime: 0` means every component mount triggers an immediate API refetch. With `staleTime: 30s`, navigating back to a previously-viewed page reuses cached data for 30 seconds. This single change eliminates the most common source of redundant API calls.

### 1.4 Add `loading="lazy"` to Images

**Files:** `src/components/attachments/attachment-list.tsx`, avatar components, `src/components/layout/header.tsx`

Add `loading="lazy"` attribute to all `<img>` tags that are not above the fold.

## Phase 2: Server Caching & Query Fixes

### 2.1 Fix N+1 in getProjectPhases

**File:** `src/lib/queries/phases.ts`

**Current pattern (N+1):**
```
Query 1: SELECT * FROM project_phases WHERE project_id = ?
Query 2: SELECT * FROM tasks WHERE phase_id = ? (per phase)
Query 3: SELECT * FROM tasks WHERE phase_id = ? (per phase)
... N more queries
```

**New pattern (single query):**
```typescript
const rows = await db
    .select({
        phase: projectPhases,
        task: tasks,
        assigneeName: users.name,
        assigneeImage: users.image,
        stakeholderName: stakeholders.name,
    })
    .from(projectPhases)
    .leftJoin(tasks, eq(tasks.phaseId, projectPhases.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
    .where(eq(projectPhases.projectId, projectId))
    .orderBy(projectPhases.order, tasks.order)

// Group rows by phase in-memory
const phaseMap = new Map()
for (const row of rows) {
    if (!phaseMap.has(row.phase.id)) {
        phaseMap.set(row.phase.id, { ...row.phase, tasks: [] })
    }
    if (row.task) {
        phaseMap.get(row.phase.id).tasks.push({
            ...row.task,
            assignee: row.assigneeName ? { name: row.assigneeName, image: row.assigneeImage } : null,
            stakeholder: row.stakeholderName ? { name: row.stakeholderName } : null,
        })
    }
}
return [...phaseMap.values()]
```

**Impact:** For a project with 5 phases: 1 query instead of 6. For 10 phases: 1 query instead of 11.

### 2.2 Cache activeOrganizationId in Auth Middleware

**File:** `src/server/middleware/auth.ts`

Extend `AuthVariables` to include `activeOrgId`:

```typescript
export type AuthVariables = {
    user: typeof auth.$Infer.Session.user
    session: typeof auth.$Infer.Session.session
    membership?: typeof memberships.$inferSelect
    activeOrgId: string | null  // NEW
}
```

In `requireAuth`, after getting the cached session, fetch the session row once and set `activeOrgId`:

```typescript
const [sessionRow] = await db.select({ activeOrganizationId: sessions.activeOrganizationId })
    .from(sessions).where(eq(sessions.id, session.session.id))
c.set('activeOrgId', sessionRow?.activeOrganizationId || null)
```

Then remove redundant `db.select().from(sessions)` calls from:
- `src/server/routes/projects.ts`
- `src/server/routes/tasks.ts`
- `src/server/routes/appointments.ts`

**Impact:** Eliminates 1 DB query per request in 3 high-traffic routes.

### 2.3 In-Memory Organization Cache

**New file:** `src/lib/cache.ts`

Generic TTL cache helper:

```typescript
export function createTTLCache<K, V>(ttlMs: number, maxEntries = 100) {
    const cache = new Map<K, { value: V; expiresAt: number }>()

    return {
        get(key: K): V | undefined {
            const entry = cache.get(key)
            if (!entry || entry.expiresAt < Date.now()) {
                cache.delete(key)
                return undefined
            }
            return entry.value
        },
        set(key: K, value: V) {
            cache.set(key, { value, expiresAt: Date.now() + ttlMs })
            if (cache.size > maxEntries) { /* cleanup oldest */ }
        },
        invalidate(key?: K) {
            key ? cache.delete(key) : cache.clear()
        },
    }
}
```

Usage for organizations:

```typescript
const orgCache = createTTLCache<string, Organization[]>(5 * 60_000) // 5 min

export async function getAllOrganizations(): Promise<Organization[]> {
    const cached = orgCache.get('all')
    if (cached) return cached
    const orgs = await db.select().from(organizations)
    orgCache.set('all', orgs)
    return orgs
}
```

Invalidate on org create/update/delete in admin routes.

## Phase 3: Client-Side Optimizations

### 3.1 Migrate NotificationBell to React Query

**File:** `src/components/notifications/NotificationBell.tsx`

Replace raw `fetch()` calls with React Query:

```typescript
const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetch('/api/notifications/unread-count').then(r => r.json()),
    refetchInterval: 30_000, // Poll every 30s as backup
})

// Pusher real-time update:
usePusher(userId, (notification) => {
    queryClient.setQueryData(['notifications', 'unread-count'], (old) => (old ?? 0) + 1)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
})
```

**Benefits:** Deduplication with other notification queries, cached across navigation, Pusher updates integrated into cache.

### 3.2 Migrate OrgContext to React Query

**File:** `src/components/org-context.tsx`

Replace direct fetch with React Query:

```typescript
const { data: orgSession } = useQuery({
    queryKey: ['org-session'],
    queryFn: () => fetch('/api/org-session').then(r => r.json()),
    staleTime: 60_000, // 1 min
})

// On org switch:
const switchOrg = useMutation({
    mutationFn: (orgId) => fetch('/api/org-session', { method: 'POST', body: ... }),
    onSuccess: () => {
        queryClient.invalidateQueries() // Invalidate ALL queries (org change affects everything)
    },
})
```

Remove `window.location.reload()` — React Query invalidation handles cache refresh.

### 3.3 Query Deduplication

No code changes needed. Once `staleTime: 30_000` is set (Phase 1.3), React Query automatically deduplicates queries with the same `queryKey`. Multiple components fetching `['stakeholders', projectId]` will share a single cache entry.

## Phase 4: Bundle & Hydration

### 4.1 Change Heavy Components to client:visible

**Files:** Astro pages that mount heavy React components

```astro
<!-- BEFORE -->
<OverviewCharts client:load ... />

<!-- AFTER -->
<OverviewCharts client:visible ... />
```

Components to change:
- `OverviewCharts` (dashboard) — charts are below the fold
- `CalendarPage` (calendar) — heavy date/calendar library

Keep `client:load` for components requiring immediate interaction: `ProjectPage`, `AdminDashboard`, `ProfileForm`.

### 4.2 Lazy-Load Recharts

**File:** `src/components/dashboard/overview-charts.tsx`

```typescript
const BarChart = React.lazy(() => import('recharts').then(m => ({ default: m.BarChart })))
const PieChart = React.lazy(() => import('recharts').then(m => ({ default: m.PieChart })))

// In render:
<Suspense fallback={<ChartSkeleton />}>
    <BarChart ... />
</Suspense>
```

**Impact:** 130KB+ of Recharts code only loads when the chart component renders.

## Phase 5: Dashboard Query Optimization

### 5.1 Dashboard Aggregate Queries

**File:** `src/pages/dashboard.astro` (SSR data fetching) or new `src/lib/queries/dashboard.ts`

Replace loading all projects + tasks with targeted aggregates:

```typescript
const [projectStats, taskStats, recentProjects, totalUsers] = await Promise.all([
    // Project count by status
    db.select({
        status: projects.status,
        count: sql<number>`count(*)::int`,
    }).from(projects).where(orgFilter).groupBy(projects.status),

    // Task count by status (via subquery)
    db.select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
    }).from(tasks)
      .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
      .innerJoin(projects, eq(projectPhases.projectId, projects.id))
      .where(orgFilter)
      .groupBy(tasks.status),

    // Recent projects (top 10, basic fields only)
    db.select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        type: projects.type,
        updatedAt: projects.updatedAt,
    }).from(projects).where(orgFilter).orderBy(desc(projects.updatedAt)).limit(10),

    // Total user count
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.isActive, true)),
])
```

**Impact:** Instead of loading 10,000+ rows (100 projects x 5 phases x 20 tasks), loads ~50 aggregate rows.

### 5.2 Admin Pagination

**File:** `src/server/routes/admin.ts`

Add `limit` and `offset` query params to `GET /admin/users` and `GET /admin/organizations`:

```typescript
app.get('/users', zValidator('query', z.object({
    limit: z.coerce.number().default(50),
    offset: z.coerce.number().default(0),
    search: z.string().optional(),
})), async (c) => {
    const { limit, offset, search } = c.req.valid('query')

    const [data, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause),
    ])

    return c.json({ items: data, total: countResult[0].count })
})
```

## Implementation Order

1. **Phase 1** (Quick wins) — 30 min total
2. **Phase 2** (Server caching) — 2 hours total
3. **Phase 3** (Client React Query) — 1.5 hours total
4. **Phase 4** (Bundle/hydration) — 45 min total
5. **Phase 5** (Dashboard/admin) — 2 hours total

Total estimated implementation: ~7 hours across 14 changes.
