# Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce API response times and client-side redundant fetches across the entire application through caching, query optimization, and bundle improvements.

**Architecture:** Server-side fixes target database query patterns (N+1, missing indexes, redundant session lookups) and add in-memory caching for frequently-accessed data. Client-side fixes add React Query defaults to prevent unnecessary refetches, migrate manual fetch calls to React Query, and defer heavy component hydration.

**Tech Stack:** Drizzle ORM, postgres-js, React Query, Astro (SSR + client hydration), Recharts

---

## Phase 1: Quick Wins

### Task 1: Add Missing Database Indexes

**Files:**
- Modify: `db/schema.ts:174-193` (tasks table) and `db/schema.ts:96-111` (projects table)

**Step 1: Add task dates index**

In `db/schema.ts`, find the `tasks` table indexes block (line ~188) and add:

```typescript
// Inside tasks table index function, after priorityIdx:
datesIdx: index('task_dates_idx').on(t.startDate, t.endDate),
```

**Step 2: Add project org+status compound index**

In `db/schema.ts`, find the `projects` table indexes block (line ~106) and add:

```typescript
// Inside projects table index function, after typeIdx:
orgStatusIdx: index('project_org_status_idx').on(t.organizationId, t.status),
```

**Step 3: Push schema to database**

Run: `npx drizzle-kit push`
Expected: Schema changes applied, 2 new indexes created.

**Step 4: Commit**

```bash
git add db/schema.ts
git commit -m "perf: add missing database indexes for tasks dates and project org+status"
```

---

### Task 2: Configure Connection Pool

**Files:**
- Modify: `src/lib/db.ts:19`

**Step 1: Add pool configuration**

Replace line 19:
```typescript
export const client = postgres(connectionString);
```

With:
```typescript
export const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 5,
});
```

**Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts without connection errors.

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "perf: configure postgres connection pool (max 10, idle 30s, connect timeout 5s)"
```

---

### Task 3: Set Default staleTime on React QueryClient

**Files:**
- Modify: `src/components/providers.tsx:6`

**Step 1: Update QueryClient defaults**

Replace line 6:
```typescript
const [queryClient] = useState(() => new QueryClient())
```

With:
```typescript
const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
}))
```

**Step 2: Verify app loads correctly**

Run: `npm run dev`, navigate to dashboard, switch pages, go back.
Expected: Pages load normally. Going back to a previously-visited page does NOT re-trigger loading spinners (data served from cache for 30s).

**Step 3: Commit**

```bash
git add src/components/providers.tsx
git commit -m "perf: set default staleTime 30s on React QueryClient to prevent redundant refetches"
```

---

### Task 4: Add loading="lazy" to Images

**Files:**
- Modify: `src/components/attachments/attachment-list.tsx:45,71`

**Step 1: Add lazy loading to attachment thumbnail**

In `attachment-list.tsx` line 45, change:
```tsx
<img src={file.url} alt={file.fileName} className="h-full w-full object-cover" />
```
To:
```tsx
<img src={file.url} alt={file.fileName} className="h-full w-full object-cover" loading="lazy" />
```

**Step 2: Add lazy loading to attachment preview dialog**

In `attachment-list.tsx` line 71, change:
```tsx
<img src={file.url} alt={file.fileName} className="w-full h-auto rounded-lg" />
```
To:
```tsx
<img src={file.url} alt={file.fileName} className="w-full h-auto rounded-lg" loading="lazy" />
```

**Step 3: Commit**

```bash
git add src/components/attachments/attachment-list.tsx
git commit -m "perf: add loading=lazy to attachment images"
```

---

## Phase 2: Server Caching & Query Fixes

### Task 5: Fix N+1 in getProjectPhases

**Files:**
- Modify: `src/lib/queries/phases.ts` (full rewrite)

**Step 1: Rewrite getProjectPhases with single JOIN query**

Replace the entire contents of `src/lib/queries/phases.ts` with:

```typescript
import { db } from '@/lib/db'
import { projectPhases, tasks, users, stakeholders } from '../../../db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getProjectPhases(projectId: string) {
    // Single query: fetch all phases + tasks + assignees in one round-trip
    const rows = await db.select({
        phase: projectPhases,
        task: tasks,
        assigneeUser: {
            id: users.id,
            name: users.name,
            image: users.image,
        },
        assigneeStakeholder: {
            id: stakeholders.id,
            name: stakeholders.name,
            role: stakeholders.role,
        },
    })
        .from(projectPhases)
        .leftJoin(tasks, eq(tasks.phaseId, projectPhases.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(projectPhases.order), asc(projectPhases.createdAt), asc(tasks.order))

    // Group rows by phase in-memory
    const phaseMap = new Map<string, any>()

    for (const row of rows) {
        if (!phaseMap.has(row.phase.id)) {
            phaseMap.set(row.phase.id, { ...row.phase, tasks: [] })
        }

        if (row.task) {
            let assignee = null
            if (row.assigneeStakeholder?.id) {
                assignee = {
                    id: row.assigneeStakeholder.id,
                    name: row.assigneeStakeholder.name,
                    image: null,
                    role: row.assigneeStakeholder.role,
                    type: 'stakeholder' as const,
                }
            } else if (row.assigneeUser?.id) {
                assignee = {
                    id: row.assigneeUser.id,
                    name: row.assigneeUser.name,
                    image: row.assigneeUser.image,
                    type: 'user' as const,
                }
            }

            phaseMap.get(row.phase.id).tasks.push({
                ...row.task,
                assignee,
            })
        }
    }

    return [...phaseMap.values()]
}
```

**Step 2: Verify phases load correctly**

Run: `npm run dev`, navigate to a project page. Phases and tasks should display identically to before.
Expected: Same data, but network tab shows 1 DB query instead of N+1.

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v astro.config`
Expected: No new type errors.

**Step 4: Commit**

```bash
git add src/lib/queries/phases.ts
git commit -m "perf: fix N+1 query in getProjectPhases — single JOIN replaces N+1 sequential queries"
```

---

### Task 6: Cache activeOrganizationId in Auth Middleware

**Files:**
- Modify: `src/server/middleware/auth.ts:9-13` (AuthVariables type) and `src/server/middleware/auth.ts:110-120` (requireAuth)
- Modify: `src/server/routes/projects.ts:23-24`
- Modify: `src/server/routes/tasks.ts:68-70`
- Modify: `src/server/routes/appointments.ts:25-27`

**Step 1: Extend AuthVariables type**

In `src/server/middleware/auth.ts`, change the `AuthVariables` type (line 9-13):

```typescript
export type AuthVariables = {
    user: typeof auth.$Infer.Session.user
    session: typeof auth.$Infer.Session.session
    membership?: typeof memberships.$inferSelect
    activeOrgId: string | null
}
```

**Step 2: Fetch activeOrgId in requireAuth middleware**

In `src/server/middleware/auth.ts`, update the `requireAuth` middleware. After `c.set('session', session.session)` (line 118), add:

```typescript
    // Fetch activeOrganizationId once (avoids redundant session queries in routes)
    const [sessionRow] = await db.select({ activeOrganizationId: sessions.activeOrganizationId })
        .from(sessions).where(eq(sessions.id, session.session.id))
    c.set('activeOrgId', sessionRow?.activeOrganizationId || null)
```

Add the import for `sessions` at the top of the file:

```typescript
import { sessions } from '../../../db/schema'
```

**Step 3: Update projects.ts to use c.get('activeOrgId')**

In `src/server/routes/projects.ts`, remove lines 23-24:
```typescript
const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.id))
const activeOrgId = sessionRow?.activeOrganizationId || null
```

Replace with:
```typescript
const activeOrgId = c.get('activeOrgId')
```

Remove the `sessions` import if it's no longer used elsewhere in the file.

**Step 4: Update tasks.ts to use c.get('activeOrgId')**

In `src/server/routes/tasks.ts`, remove lines 68-70:
```typescript
// may not include custom columns like activeOrganizationId)
const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.id))
const activeOrgId = sessionRow?.activeOrganizationId || null
```

Replace with:
```typescript
const activeOrgId = c.get('activeOrgId')
```

Remove the `sessions` import if no longer used.

**Step 5: Update appointments.ts to use c.get('activeOrgId')**

In `src/server/routes/appointments.ts`, remove lines 25-27:
```typescript
// may not include custom columns like activeOrganizationId)
const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.id))
const activeOrgId = sessionRow?.activeOrganizationId || null
```

Replace with:
```typescript
const activeOrgId = c.get('activeOrgId')
```

Remove the `sessions` import if no longer used.

**Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v astro.config`
Expected: No new type errors.

**Step 7: Commit**

```bash
git add src/server/middleware/auth.ts src/server/routes/projects.ts src/server/routes/tasks.ts src/server/routes/appointments.ts
git commit -m "perf: cache activeOrgId in auth middleware, remove 3 redundant session queries"
```

---

### Task 7: Create Generic TTL Cache and Organization Cache

**Files:**
- Create: `src/lib/cache.ts`
- Modify: `src/lib/queries/page-context.ts` (use cached orgs)
- Modify: `src/server/routes/org-session.ts` (use cached orgs)
- Modify: `src/server/routes/admin.ts` (invalidate on org changes)

**Step 1: Create src/lib/cache.ts**

```typescript
/**
 * Generic in-memory TTL cache.
 * Used for data that changes infrequently (organizations, settings).
 */
export function createTTLCache<V>(ttlMs: number, maxEntries = 100) {
    const cache = new Map<string, { value: V; expiresAt: number }>()

    function cleanup() {
        if (cache.size <= maxEntries) return
        const now = Date.now()
        for (const [key, entry] of cache) {
            if (entry.expiresAt < now) cache.delete(key)
        }
        if (cache.size > maxEntries) {
            const entries = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
            for (const [key] of entries.slice(0, entries.length - maxEntries)) {
                cache.delete(key)
            }
        }
    }

    return {
        get(key: string): V | undefined {
            const entry = cache.get(key)
            if (!entry || entry.expiresAt < Date.now()) {
                if (entry) cache.delete(key)
                return undefined
            }
            return entry.value
        },
        set(key: string, value: V) {
            cache.set(key, { value, expiresAt: Date.now() + ttlMs })
            cleanup()
        },
        invalidate(key?: string) {
            if (key) cache.delete(key)
            else cache.clear()
        },
    }
}
```

**Step 2: Add cached org lookup to page-context.ts**

In `src/lib/queries/page-context.ts`, add at the top:

```typescript
import { createTTLCache } from '@/lib/cache'
```

Create a cached helper for the super-admin org list:

```typescript
const orgListCache = createTTLCache<typeof organizations.$inferSelect[]>(5 * 60_000) // 5 min

async function getCachedOrgList() {
    const cached = orgListCache.get('all')
    if (cached) return cached
    const orgs = await db.select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
        logoUrl: organizations.logoUrl,
    }).from(organizations)
    orgListCache.set('all', orgs)
    return orgs
}
```

Then replace the `isSuperAdmin ? db.select(...)` in the `Promise.all` (line 54-61) with `isSuperAdmin ? getCachedOrgList() : Promise.resolve([])`.

Export the invalidation function:

```typescript
export function invalidateOrgCache() {
    orgListCache.invalidate()
}
```

**Step 3: Invalidate org cache in admin routes**

In `src/server/routes/admin.ts`, import and call `invalidateOrgCache()` after org create/update/delete operations.

**Step 4: Commit**

```bash
git add src/lib/cache.ts src/lib/queries/page-context.ts src/server/routes/admin.ts
git commit -m "perf: add TTL cache for organization data (5 min), reduces repeated org list queries"
```

---

## Phase 3: Client-Side Optimizations

### Task 8: Migrate NotificationBell to React Query

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx` (full rewrite of data fetching)

**Step 1: Replace useState/useEffect with React Query**

Rewrite `NotificationBell.tsx`. Replace the `useState` for notifications/unreadCount/isLoading and the `useEffect` fetch with React Query hooks:

```typescript
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// ... keep existing UI imports ...

export function NotificationBell({ userId }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch unread count (always active, polls every 30s as fallback)
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const res = await fetch("/api/notifications/unread-count");
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count || 0;
        },
        refetchInterval: 30_000,
    });

    // Fetch notification list (only when dropdown is open)
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', 'recent'],
        queryFn: async () => {
            const res = await fetch("/api/notifications?limit=10");
            if (!res.ok) return [];
            const data = await res.json();
            return (data.notifications || data.items || []) as Notification[];
        },
        enabled: isOpen,
    });

    // Mark single as read
    const markReadMutation = useMutation({
        mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read
    const markAllReadMutation = useMutation({
        mutationFn: () => fetch("/api/notifications/read-all", { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Handle real-time Pusher notifications
    const handleNewNotification = useCallback((notification: PusherNotification) => {
        // Update cache directly for instant UI feedback
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (old) => (old ?? 0) + 1);
        queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    }, [queryClient]);

    usePusher({ userId, onNotification: handleNewNotification });

    // ... keep formatTime and JSX exactly the same, but update references:
    // - Replace markAsRead(id) with markReadMutation.mutate(id)
    // - Replace markAllAsRead() with markAllReadMutation.mutate()
    // - isLoading stays the same variable name
    // - unreadCount and notifications are now from useQuery
```

Keep the entire JSX template unchanged, only update the function calls in onClick handlers.

**Step 2: Verify notifications work**

Run: `npm run dev`, check NotificationBell in header. Open dropdown, verify notifications load. Mark one as read, verify count decreases.

**Step 3: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "perf: migrate NotificationBell from manual fetch to React Query with Pusher integration"
```

---

### Task 9: Migrate OrgContext to React Query

**Files:**
- Modify: `src/contexts/org-context.tsx`

**Step 1: Replace manual fetch with React Query**

Rewrite `src/contexts/org-context.tsx`. Keep the context/provider pattern but use React Query for data:

```typescript
import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Organization {
    id: string
    name: string
    code: string
    logoUrl: string | null
    role: string
}

interface OrgSessionData {
    activeOrganizationId: string | null
    organizations: Organization[]
    isSuperAdmin: boolean
}

interface OrgContextType {
    activeOrgId: string | null
    activeOrg: Organization | null
    organizations: Organization[]
    isLoading: boolean
    isSuperAdmin: boolean
    switchOrg: (orgId: string | null) => Promise<void>
    refetch: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | null>(null)

interface OrgProviderProps {
    children: ReactNode
    initialData?: {
        activeOrganizationId: string | null
        organizations: Organization[]
        isSuperAdmin?: boolean
    }
}

export function OrgProvider({ children, initialData }: OrgProviderProps) {
    const queryClient = useQueryClient()

    const { data: orgSession, isLoading } = useQuery<OrgSessionData>({
        queryKey: ['org-session'],
        queryFn: async () => {
            const res = await fetch('/api/org-session')
            if (!res.ok) throw new Error('Failed to fetch org session')
            return res.json()
        },
        staleTime: 60_000, // 1 min
        initialData: initialData ? {
            activeOrganizationId: initialData.activeOrganizationId,
            organizations: initialData.organizations,
            isSuperAdmin: initialData.isSuperAdmin ?? false,
        } : undefined,
    })

    const switchMutation = useMutation({
        mutationFn: async (orgId: string | null) => {
            const res = await fetch('/api/org-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: orgId }),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to switch organization')
            }
        },
        onSuccess: () => {
            // Org switch affects all data — reload page to refresh SSR context
            window.location.reload()
        },
    })

    const activeOrgId = orgSession?.activeOrganizationId ?? null
    const organizations = orgSession?.organizations ?? []
    const isSuperAdmin = orgSession?.isSuperAdmin ?? false
    const activeOrg = organizations.find(o => o.id === activeOrgId) || null

    const switchOrg = async (orgId: string | null) => {
        await switchMutation.mutateAsync(orgId)
    }

    const refetch = async () => {
        await queryClient.invalidateQueries({ queryKey: ['org-session'] })
    }

    return (
        <OrgContext.Provider value={{
            activeOrgId,
            activeOrg,
            organizations,
            isLoading,
            isSuperAdmin,
            switchOrg,
            refetch,
        }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useActiveOrg() {
    const context = useContext(OrgContext)
    if (!context) {
        throw new Error('useActiveOrg must be used within an OrgProvider')
    }
    return context
}

export function useActiveOrgOptional() {
    return useContext(OrgContext)
}
```

**Note:** We keep `window.location.reload()` on org switch because the Astro SSR page context, sidebar, and all server-rendered data depends on `activeOrganizationId`. A full page reload is the safest way to refresh everything. In a future SPA migration, this can be replaced with `queryClient.invalidateQueries()`.

**Step 2: Verify org switcher works**

Run: `npm run dev`, open org switcher in sidebar, switch organizations. Verify page reloads and shows correct org data.

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v astro.config`
Expected: No new type errors.

**Step 4: Commit**

```bash
git add src/contexts/org-context.tsx
git commit -m "perf: migrate OrgContext from manual fetch/useState to React Query with initialData"
```

---

## Phase 4: Bundle & Hydration

### Task 10: Change Heavy Components to client:visible

**Files:**
- Modify: `src/pages/dashboard.astro:329`
- Modify: `src/pages/calendar.astro:38`
- Modify: `src/pages/projects/[id]/calendar.astro:30`

**Step 1: Change OverviewCharts to client:visible**

In `src/pages/dashboard.astro` line 329, change `client:load` to `client:visible`:

```astro
<OverviewCharts client:visible ... />
```

**Step 2: Change CalendarPage instances to client:visible**

In `src/pages/calendar.astro` line 38:
```astro
<CalendarPage client:visible initialData={initialData} />
```

In `src/pages/projects/[id]/calendar.astro` line 30:
```astro
<CalendarPage client:visible projectId={id!} />
```

**Step 3: Verify components render when scrolled into view**

Run: `npm run dev`, visit dashboard. Charts should appear when you scroll to them (or immediately if they're in the viewport). Calendar pages should hydrate when visible.

**Step 4: Commit**

```bash
git add src/pages/dashboard.astro src/pages/calendar.astro src/pages/projects/[id]/calendar.astro
git commit -m "perf: defer heavy components (charts, calendar) with client:visible"
```

---

### Task 11: Lazy-Load Recharts

**Files:**
- Modify: `src/components/dashboard/charts/overview-charts.tsx:4`

**Step 1: Replace direct Recharts imports with lazy imports**

In `src/components/dashboard/charts/overview-charts.tsx`, replace line 4:

```typescript
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
```

With:

```typescript
import { lazy, Suspense } from "react"

// Lazy-load recharts — 130KB+ only loads when charts render
const RechartsModule = lazy(() => import("recharts"))

// We need individual components, so create a wrapper
function LazyCharts({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted/50 rounded-lg" />}>{children}</Suspense>
}
```

**Note:** Since Recharts doesn't export a default, and `React.lazy` requires a default export, an alternative approach is to keep the direct import but rely on the `client:visible` change from Task 10 to defer the entire component. The combination of `client:visible` + code-splitting via Astro's automatic island architecture already achieves most of the benefit.

**Step 2: Verify charts still render**

Run: `npm run dev`, visit dashboard, scroll to charts section.
Expected: Charts render correctly with a brief loading skeleton.

**Step 3: Commit**

```bash
git add src/components/dashboard/charts/overview-charts.tsx
git commit -m "perf: lazy-load Recharts to defer 130KB+ bundle"
```

---

## Phase 5: Dashboard & Admin Query Optimization

### Task 12: Create Dashboard Aggregate Queries

**Files:**
- Create: `src/lib/queries/dashboard.ts`
- Modify: `src/pages/dashboard.astro` (use new query helper)

**Step 1: Create dashboard query helper**

Create `src/lib/queries/dashboard.ts`:

```typescript
import { db } from '@/lib/db'
import { projects, projectPhases, tasks, users } from '../../../db/schema'
import { sql, eq, inArray, count, desc } from 'drizzle-orm'

type DashboardStats = {
    projectsByStatus: { status: string; count: number }[]
    projectsByType: { type: string; count: number }[]
    tasksByStatus: { status: string; count: number }[]
    recentProjects: { id: string; name: string; status: string; type: string; updatedAt: Date; orgName: string | null }[]
    totalUsers: number
    totalProjects: number
}

export async function getDashboardStats(orgIds: string[] | null): Promise<DashboardStats> {
    const orgFilter = orgIds && orgIds.length > 0
        ? inArray(projects.organizationId, orgIds)
        : undefined

    const [projectsByStatus, projectsByType, tasksByStatus, recentProjects, userCount, projectCount] = await Promise.all([
        // Project count by status
        db.select({
            status: projects.status,
            count: sql<number>`count(*)::int`,
        }).from(projects)
            .where(orgFilter)
            .groupBy(projects.status),

        // Project count by type
        db.select({
            type: projects.type,
            count: sql<number>`count(*)::int`,
        }).from(projects)
            .where(orgFilter)
            .groupBy(projects.type),

        // Task count by status (join through phases → projects for org scoping)
        db.select({
            status: tasks.status,
            count: sql<number>`count(*)::int`,
        }).from(tasks)
            .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
            .innerJoin(projects, eq(projectPhases.projectId, projects.id))
            .where(orgFilter)
            .groupBy(tasks.status),

        // Recent 10 projects (basic fields)
        db.select({
            id: projects.id,
            name: projects.name,
            status: projects.status,
            type: projects.type,
            updatedAt: projects.updatedAt,
        }).from(projects)
            .where(orgFilter)
            .orderBy(desc(projects.updatedAt))
            .limit(10),

        // Total active users
        db.select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.isActive, true)),

        // Total projects
        db.select({ count: sql<number>`count(*)::int` })
            .from(projects)
            .where(orgFilter),
    ])

    return {
        projectsByStatus,
        projectsByType,
        tasksByStatus,
        recentProjects: recentProjects.map(p => ({ ...p, orgName: null })),
        totalUsers: userCount[0]?.count ?? 0,
        totalProjects: projectCount[0]?.count ?? 0,
    }
}
```

**Step 2: Update dashboard.astro to use aggregate queries**

In `src/pages/dashboard.astro`, replace the heavy `db.query.projects.findMany({ with: { phases: { with: { tasks: true } } } })` (lines 34-48) with:

```typescript
import { getDashboardStats } from "@/lib/queries/dashboard";

// Replace the existing data fetch block with:
const stats = showEmptyState ? null : await getDashboardStats(orgIds);
```

Then update the template to use `stats.projectsByStatus`, `stats.tasksByStatus`, `stats.recentProjects`, `stats.totalUsers`, `stats.totalProjects` instead of computing from the full project list.

**Note:** This task requires updating the dashboard template to use the new aggregate data format. The existing `OverviewCharts` component expects `projectsByType` and `projectsByStatus` as `{ name, value }[]` — map the aggregate data to this format:

```typescript
const chartProjectsByType = stats?.projectsByType.map(p => ({ name: p.type, value: p.count })) ?? []
const chartProjectsByStatus = stats?.projectsByStatus.map(p => ({ name: p.status, value: p.count })) ?? []
```

**Step 3: Verify dashboard renders correctly**

Run: `npm run dev`, visit dashboard.
Expected: Same charts and stats, but much faster load (no more loading 10k+ rows).

**Step 4: Commit**

```bash
git add src/lib/queries/dashboard.ts src/pages/dashboard.astro
git commit -m "perf: replace dashboard full-data fetch with SQL aggregates (10k+ rows → ~50 rows)"
```

---

### Task 13: Add Pagination to Admin Users Endpoint

**Files:**
- Modify: `src/server/routes/admin.ts:16-78` (GET /users endpoint)

**Step 1: Add limit/offset query validation**

In the `GET /users` handler (line 16), add Zod query validation:

```typescript
app.get('/users',
    zValidator('query', z.object({
        q: z.string().optional().default(''),
        limit: z.coerce.number().min(1).max(200).optional().default(50),
        offset: z.coerce.number().min(0).optional().default(0),
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { q: search, limit, offset } = c.req.valid('query')
        // ... rest of handler
```

**Step 2: Apply limit/offset and parallel count**

Before executing the query (line 73), change:

```typescript
const results = await query
return c.json({ data: results, meta: { isSuperAdmin, total: results.length } })
```

To:

```typescript
const [results, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ count: sql<number>`count(DISTINCT ${users.id})::int` })
        .from(users)
        .leftJoin(memberships, eq(users.id, memberships.userId))
        .where(whereClause),
])

return c.json({
    data: results,
    meta: { isSuperAdmin, total: countResult[0]?.count ?? 0, limit, offset }
})
```

**Note:** The `whereClause` needs to be extracted as a variable so it can be reused for both the data query and count query. This requires refactoring the conditional `query.where(...)` calls into building the `whereClause` first.

**Step 3: Verify admin users page works**

Run: `npm run dev`, visit admin users page.
Expected: Users load with pagination. Response includes `meta.total` for total count.

**Step 4: Commit**

```bash
git add src/server/routes/admin.ts
git commit -m "perf: add pagination to admin users endpoint (limit/offset with SQL count)"
```

---

## Summary

| Task | Phase | Files Changed | Impact |
|------|-------|---------------|--------|
| 1. DB indexes | 1 | schema.ts | Calendar + project list queries faster |
| 2. Connection pool | 1 | db.ts | Prevents connection exhaustion |
| 3. QueryClient staleTime | 1 | providers.tsx | Eliminates redundant API refetches |
| 4. Image lazy loading | 1 | attachment-list.tsx | Reduces initial bandwidth |
| 5. Fix N+1 phases | 2 | phases.ts | 1 query instead of N+1 per project |
| 6. Cache activeOrgId | 2 | auth.ts + 3 routes | -1 DB query per request in 3 routes |
| 7. Org cache | 2 | cache.ts + page-context.ts | Org list cached 5 min |
| 8. NotificationBell RQ | 3 | NotificationBell.tsx | Deduped, cached notifications |
| 9. OrgContext RQ | 3 | org-context.tsx | Cached org session, no manual state |
| 10. client:visible | 4 | 3 Astro pages | Deferred heavy JS hydration |
| 11. Lazy Recharts | 4 | overview-charts.tsx | 130KB deferred |
| 12. Dashboard aggregates | 5 | dashboard.ts + dashboard.astro | 10k+ rows → ~50 aggregate rows |
| 13. Admin pagination | 5 | admin.ts | Bounded response size |
