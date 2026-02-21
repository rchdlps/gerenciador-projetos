# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **project management system** (Gerenciador de Projetos) for municipal government departments (Secretarias) in Brazil. It's built with **Astro + React** on the frontend, **Hono** as the API framework, **Drizzle ORM** with **PostgreSQL (Neon)**, and uses **better-auth** for authentication. File uploads are handled via **S3-compatible storage** (Hetzner Object Storage).

The application manages projects across multiple organizations (secretarias), with role-based access control, knowledge area tracking based on project management methodologies (PMBoK-inspired), task management, stakeholders, calendaring, procurement, communication plans, quality metrics, comprehensive audit logging, and a real-time notification system.

## Common Commands

### Development
```bash
npm run dev              # Start development server at localhost:4321
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run lint             # Run Astro type checking
```

### Database
```bash
npx drizzle-kit generate         # Generate migrations from schema
npx drizzle-kit push             # Push schema changes to database
npx drizzle-kit studio           # Open Drizzle Studio GUI
npx tsx db/seed.ts               # Seed database with sample data
npx tsx scripts/seed-knowledge.ts # Seed knowledge areas only
```

### Testing
```bash
npm test                             # Run unit and integration tests in watch mode
npm run test:ui                      # Open Vitest UI for interactive testing
npm run test:run                     # Run tests once (CI mode)
npm run test:coverage                # Run tests with coverage report
npx vitest run src/path/to/file      # Run a single test file
npm run test:e2e                     # Run end-to-end tests with Playwright
npm run test:e2e:ui                  # Open Playwright UI for interactive E2E testing
npm run test:e2e:debug               # Run E2E tests in debug mode
```

## Architecture Overview

### Hybrid Astro + React Architecture

**Routing & Pages:** Astro file-based routing in `src/pages/`. Astro pages are server-rendered shells that hydrate React components.

**API Layer:** All API routes go through `src/pages/api/[...path].ts`, which forwards requests to the Hono app (`src/server/app.ts`). The Hono app registers route modules from `src/server/routes/*.ts`.

**Components:** React components in `src/components/` use client-side interactivity. They call the API via `@tanstack/react-query` (see `src/lib/api-client.ts`).

### Authentication Flow

- **Library:** `better-auth` with Drizzle adapter
- **Configuration:** `src/lib/auth.ts` sets up email/password auth
- **API Endpoints:** `src/pages/api/auth/[...all].ts` handles auth routes
- **Middleware:** `src/server/middleware/auth.ts` provides:
  - `getSession`: Optionally loads session (uses in-memory cache)
  - `requireAuth`: Enforces authentication (uses in-memory cache)
  - `requireOrgAccess(role?)`: Checks organization membership and role hierarchy
  - `getCachedSession(headers)`: Exported cached session resolver (used by SSR `getPageContext()`)
  - `invalidateSessionCache(token?)`: Clears cached session (call after org-switch, sign-out)
- **Session Cache:** In-memory cache with 30s TTL avoids hitting the DB on every API request. Concurrent requests with the same token share a single in-flight promise (deduplication). Max 500 entries with LRU-style cleanup.
- **User Roles:**
  - **Global Roles:** `super_admin` (full access) | `user` (normal)
  - **Organization Roles:** `secretario` > `gestor` > `viewer` (hierarchical permissions)

### Multi-Tenancy Model

**Organizations** represent Secretarias. **Memberships** link users to organizations with roles. Users can belong to multiple organizations.

**Project Access:** Projects belong to an organization. Users access projects via their organization memberships. Super admins bypass all restrictions.

### Database Schema

**Core Tables:**
- `organizations`: Secretarias with metadata (name, code, logoUrl, leaders)
- `users`: User accounts (managed by better-auth)
- `memberships`: User-Organization-Role junction table
- `projects`: Projects linked to organizations
- `project_phases`: Phases within a project (Iniciação, Planejamento, etc.)
- `tasks`: Tasks within phases (with assignees, stakeholders, priorities, status)
- `stakeholders`: Project stakeholders (name, role, level)
- `board_columns` / `board_cards`: Kanban boards for projects
- `knowledge_areas`: PMBoK-style knowledge area content (escopo, cronograma, custos, etc.)
- `appointments`: Calendar events per project
- `audit_logs`: Audit trail for all key actions

**Extended Tables:**
- `project_charters`: TAP (Termo de Abertura do Projeto) with justification, SMART objectives, success criteria
- `project_milestones`: Key milestones with expected dates and phases
- `project_dependencies`: Task dependencies (predecessor → successor)
- `project_quality_metrics`: Quality KPIs (target vs current value)
- `project_quality_checklists`: Checklist items for quality gates
- `project_communication_plans`: Communication strategies per project
- `project_meetings`: Meeting records with decisions
- `procurement_suppliers`: Supplier registry per project
- `procurement_contracts`: Contract tracking (value, status, validity)
- `knowledge_area_changes`: Change control records for knowledge areas
- `attachments`: File metadata for S3-stored files

**Schema Location:** `db/schema.ts` (single-file Drizzle schema with relations)

### API Route Patterns

All Hono routes follow a consistent pattern:

1. **Import:** Use Hono, zValidator, db, and schemas
2. **Middleware:** Apply `requireAuth` or `requireOrgAccess(role?)` at route or app level
3. **Validation:** Use `zValidator('json', schema)` for request body validation with Zod
4. **Authorization:** Use `c.get('user')` from middleware — never call `auth.api.getSession()` again inside handlers. For project-scoped routes, use `canAccessProject()` from `@/lib/queries/scoped`
5. **Database Operations:** Use Drizzle ORM queries. Parallelize independent queries with `Promise.all`
6. **Audit Logging:** Call `createAuditLog()` fire-and-forget (no `await`) for CREATE/UPDATE/DELETE actions
7. **Response:** Return JSON with proper status codes

**Example Routes:**
- `GET /api/projects` - List projects user has access to (via memberships)
- `POST /api/projects` - Create project (checks org access and role)
- `GET /api/projects/:id` - Get single project (checks access)
- Nested resources: `/api/projects/:projectId/stakeholders`, `/api/tasks/:id`, etc.

**Route Organization:**
- `src/server/routes/projects.ts` - Project CRUD
- `src/server/routes/tasks.ts` - Task management
- `src/server/routes/phases.ts` - Phase management
- `src/server/routes/stakeholders.ts` - Stakeholder CRUD
- `src/server/routes/board.ts` - Kanban board columns/cards
- `src/server/routes/knowledge-areas.ts` - Knowledge area content management
- `src/server/routes/admin.ts` - Admin endpoints (user/org management, audit logs)
- `src/server/routes/admin-notifications.ts` - Admin notification management (scheduling, broadcast)
- `src/server/routes/notifications.ts` - User notification inbox (read/unread)
- `src/server/routes/members.ts` - Organization membership management
- `src/server/routes/org-session.ts` - Organization context switching
- `src/server/routes/storage.ts` - S3 pre-signed URL generation
- And more: appointments, schedule, quality, communication, procurement, project-charter

### File Upload Flow

**Storage:** S3-compatible (MinIO/Hetzner Object Storage)

**Process:**
1. Client requests pre-signed upload URL from `POST /api/storage/upload-url`
2. Server generates pre-signed PUT URL and returns it
3. Client uploads file directly to S3 using pre-signed URL (bypasses server)
4. Client sends file metadata to create `attachments` record
5. To download: Request pre-signed GET URL from `GET /api/storage/download-url?key=...`

**Key File:** `src/lib/storage.ts` (S3 client, pre-signed URL helpers)

### State Management

**Client-side:** `@tanstack/react-query` for server state (fetching, caching, mutations)

**API Client:** `src/lib/api-client.ts` exports typed Hono client

**Example Usage:**
```tsx
import { useQuery, useMutation } from '@tanstack/react-query'
import { client } from '@/lib/api-client'

const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const res = await client.api.projects.$get()
    return res.json()
  }
})
```

### Audit Logging

**Function:** `createAuditLog()` in `src/lib/audit-logger.ts`

**Usage:** Call fire-and-forget (no `await`) after CREATE/UPDATE/DELETE operations in API routes. Errors are logged but never fail the main operation or block the response.

**Fields:**
- `userId`: Who performed the action
- `organizationId`: Context (optional)
- `action`: CREATE | UPDATE | DELETE
- `resource`: Type (e.g., 'project', 'task', 'user')
- `resourceId`: ID of the affected resource
- `metadata`: JSON object with additional context

### Notification System

The notification system has two delivery paths:

**Real-time:** Socket.IO (`socket.io` / `socket.io-client`) delivers notifications instantly via WebSocket. The server attaches Socket.IO to the same HTTP server in `server.mjs`; the React client subscribes using the `useSocket` hook (`src/hooks/useSocket.ts`). Auth is handled via session cookie validation on connection.

**Background Jobs:** Inngest (`inngest` package) handles scheduled/batch notification delivery. Functions are defined in `src/lib/inngest/functions/` and served at `src/pages/api/inngest.ts`. Admin can schedule notifications via `src/server/routes/admin-notifications.ts`.

**Email:** Resend (`resend` package) sends transactional emails (e.g., invitations, password reset). Templates are in `src/lib/email/`.

**Database tables:** `notifications` (per-user inbox), referenced by `src/server/routes/notifications.ts`.

### Reusable Query Helpers

`src/lib/queries/` contains shared Drizzle query functions used across multiple routes (e.g., checking project access, fetching org memberships). Prefer extracting common queries here rather than duplicating them across route files.

### SSR Page Context

**File:** `src/lib/queries/page-context.ts`

`getPageContext(headers)` is the shared SSR helper for all authenticated Astro pages. It fetches auth session, active org, and scoped org IDs in 2 sequential batches (down from 6-10 sequential queries):

- **Batch 1:** `getCachedSession(headers)` — session validation using the in-memory cache
- **Batch 2:** `Promise.all([sessionRow, membershipsWithOrgs, allOrgs?])` — session row + memberships (with org details via `with: { organization: true }`) + all orgs (super admin only)

Returns `{ session, user, sessionRow, isSuperAdmin, activeOrgId, orgIds, orgSessionData }`. Pages pass `session` and `orgSessionData` to `DashboardLayout` to avoid duplicate client-side fetches.

## Performance Patterns

The codebase follows consistent performance patterns across all API routes and SSR pages. These patterns were applied systematically to every route file in `src/server/routes/`.

### 1. Session Caching (auth middleware)

`auth.api.getSession()` hits the database on every call (~600-800ms with remote DB). The auth middleware caches sessions in-memory:

- **30-second TTL** — sessions are re-validated at most once every 30 seconds per token
- **In-flight deduplication** — concurrent requests with the same token share a single DB call
- **Max 500 entries** with LRU-style cleanup
- **Cache invalidation** — call `invalidateSessionCache(token)` after org-switch or sign-out

```typescript
// In route handlers: NEVER call auth.api.getSession() directly
// Use c.get('user') and c.get('session') from middleware instead
const user = c.get('user')    // Already cached by middleware
const session = c.get('session')

// In SSR pages: use getCachedSession() instead of auth.api.getSession()
import { getCachedSession } from '@/server/middleware/auth'
const session = await getCachedSession(headers)
```

### 2. Never Re-fetch User Data

The `requireAuth` middleware already provides the authenticated user via `c.get('user')`. Never call `db.select().from(users).where(eq(users.id, ...))` to re-fetch the same user — it's redundant.

```typescript
// WRONG — redundant DB call
const [user] = await db.select().from(users).where(eq(users.id, c.get('user').id))

// CORRECT — already available from middleware
const user = c.get('user')
const isSuperAdmin = user.globalRole === 'super_admin'
```

### 3. Parallelize Independent Queries

Use `Promise.all` for queries that don't depend on each other:

```typescript
// WRONG — sequential (each query waits for the previous)
const members = await db.query.memberships.findMany(...)
const org = await db.select().from(organizations).where(...)
const invitations = await db.select().from(invitations).where(...)

// CORRECT — parallel (all queries run simultaneously)
const [members, org, invitations] = await Promise.all([
    db.query.memberships.findMany(...),
    db.select().from(organizations).where(...),
    db.select().from(invitations).where(...),
])
```

### 4. Fire-and-Forget Audit Logs

Audit logs should never block the API response. Don't `await` them:

```typescript
// WRONG — blocks response until audit log is written
await createAuditLog({ ... })
return c.json(result)

// CORRECT — fire and forget
createAuditLog({ ... })
return c.json(result)
```

### 5. Use canAccessProject() for Project-Scoped Routes

Instead of manually querying memberships + project + org, use the centralized helper:

```typescript
import { canAccessProject } from '@/lib/queries/scoped'

const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
if (!allowed) return c.json({ error: 'Forbidden' }, 403)
```

### 6. Batch Inserts

When creating multiple rows, use a single insert with an array of values:

```typescript
// WRONG — 5 sequential inserts
for (const phase of phases) {
    await db.insert(projectPhases).values(phase)
}

// CORRECT — single batched insert
await db.insert(projectPhases).values(phases)
```

### 7. Include Relations in Queries

Avoid sequential lookups by including related data via `with`:

```typescript
// WRONG — fetch memberships, then loop to fetch each org
const memberships = await db.query.memberships.findMany({ where: ... })
for (const m of memberships) {
    const org = await db.select().from(organizations).where(eq(organizations.id, m.organizationId))
}

// CORRECT — include org details in one query
const memberships = await db.query.memberships.findMany({
    where: ...,
    with: { organization: true },
})
```

### 8. Parallel Notification Delivery

When sending notifications to multiple users, use `Promise.allSettled` for parallel delivery with error tracking:

```typescript
const results = await Promise.allSettled(
    userIds.map(userId => emitNotification({ userId, ... }))
)
const sentCount = results.filter(r => r.status === 'fulfilled').length
const failedCount = results.filter(r => r.status === 'rejected').length
```

### 9. Resilient Fan-Out Pattern (Notifications)

`emitNotification()` in `src/lib/notification.ts` uses a resilient fan-out:
1. **DB store** (critical path) — notification is persisted immediately
2. **Socket.IO** (real-time) — fire-and-forget `.catch()` for instant delivery
3. **Inngest** (side-effects) — fire-and-forget `.catch()` for email/analytics

The DB is the source of truth. Socket.IO and Inngest are best-effort — failures don't block or lose notifications.

### 10. better-auth Session Pitfalls

- `activeOrganizationId` is on the `sessions` DB table but **NOT** in `session.additionalFields`
- **NEVER** read from `(session as any).activeOrganizationId` — it's unreliable
- **ALWAYS** query the session row directly: `db.select().from(sessions).where(eq(sessions.id, session.id))`
- The session create hook in `auth.ts` uses a targeted `SELECT isActive` query (not full user row) for performance

## Important Conventions

### Type Safety

- Use Drizzle's `$inferSelect` and `$inferInsert` for database types
- Hono provides type-safe API routes via `AppType` export
- Components should define explicit prop types

### Error Handling

- Use `HTTPException` from `hono/http-exception` for API errors
- Return proper HTTP status codes (401, 403, 404, 500)
- Audit logging errors should not fail the main operation

### Access Control

- **Super Admin Bypass:** Always check `user.globalRole === 'super_admin'` to allow full access
- **Organization Access:** Use `requireOrgAccess()` middleware or manually check memberships
- **Role Hierarchy:** `secretario` > `gestor` > `viewer`
- **Viewer Restrictions:** Viewers can read but not create/update/delete

### Database Queries

- Use Drizzle query builder (prefer `db.query.*` for relations, especially with `with:` for joins)
- For complex queries, use `db.select().from().where()`
- Always handle cascading deletes via schema foreign keys or manual cleanup
- Use transactions for multi-table operations
- Parallelize independent queries with `Promise.all` (see Performance Patterns)
- Use batch inserts (`db.insert().values([...])`) instead of loops
- Never re-fetch user data that middleware already provides via `c.get('user')`

### Component Patterns

- **Astro Pages:** Server-rendered shells, minimal interactivity
- **React Components:** Client-side interactivity, use `client:load` directive in Astro
- **UI Components:** Located in `src/components/ui/` (Radix UI + Tailwind)
- **Feature Components:** Organized by feature (dashboard, phases, knowledge, admin)

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL`: Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Auth secret key
- `BETTER_AUTH_URL`: Base URL for auth callbacks
- `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET_NAME`: Hetzner Object Storage
- `RESEND_API_KEY`: Email delivery via Resend
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`: Inngest background jobs
- Real-time notifications use Socket.IO (self-hosted, no external service or env vars needed)
- `SENTRY_AUTH_TOKEN`: Error tracking
- `PUBLIC_URL`: Base URL for the app (used in email links, etc.)

## Database Seeding

**Full Seed:** `npx tsx db/seed.ts`

Creates:
- 5 Organizations (SMPO, DEMO, SMS, SME, SMOB)
- 4 Users with different roles (super_admin, org members)
- 15 Projects (3 per organization)
- Phases, Tasks, Stakeholders, Board Columns/Cards
- Knowledge Areas, Appointments, Audit Logs
- TAP, Milestones, Dependencies, Quality Metrics/Checklists
- Communication Plans, Meetings, Procurement Suppliers/Contracts

**Default Credentials:** All seeded users have password `password123`

**Example Users:**
- `admin@cuiaba.mt.gov.br` - Super Admin
- `saude@cuiaba.mt.gov.br` - Gestor Saúde
- `obras@cuiaba.mt.gov.br` - Gestor Obras
- `educacao@cuiaba.mt.gov.br` - Fiscal Educação (viewer role)

## Key Features

### Knowledge Areas

Based on PMBoK methodology, each project can have rich markdown content for:
- **Escopo** (Scope)
- **Cronograma** (Schedule)
- **Custos** (Costs)
- **Qualidade** (Quality)
- **Comunicação** (Communication)
- **Riscos** (Risks)
- **Aquisições** (Procurement)

Each area supports markdown editing and change tracking via `knowledge_area_changes` table.

### TAP (Termo de Abertura do Projeto)

Project Charter with:
- **Justification:** Why the project exists, strategic alignment
- **SMART Objectives:** Specific, Measurable, Achievable, Relevant, Time-bound goals
- **Success Criteria:** Mandatory, desirable, and acceptance criteria

### Quality Management

- **Metrics:** Track KPIs with target vs current values
- **Checklists:** Quality gates and checklist items (completed/pending)

### Procurement

- **Suppliers:** Registry of suppliers per project
- **Contracts:** Track contracts with value, status, validity dates

### Communication

- **Communication Plans:** Define what info, to whom, how often, via which medium
- **Meetings:** Record meeting subjects, dates, and key decisions

### Audit Trail

Every significant action (create project, update task, delete stakeholder, etc.) is logged to `audit_logs` with full metadata for compliance and tracking.

## Deployment

**Platform:** Railway (Docker-based)

**Adapter:** `@astrojs/node` in standalone mode

**Entry Point:** `server.mjs` wraps Astro's handler + Socket.IO on the same HTTP server. Uses `ASTRO_NODE_AUTOSTART=disabled` to prevent Astro from starting its own server.

**Build:** `npm run build` produces output in `dist/`. Production runs via `node server.mjs`.

**Database:** PostgreSQL (Neon)

## Testing Strategy

This project uses a comprehensive 3-tier testing approach:

### 1. Unit Tests (Vitest)

**Location:** `src/**/__tests__/*.test.ts`

**Purpose:** Test individual functions, utilities, and helper modules in isolation.

**Examples:**
- `src/lib/__tests__/utils.test.ts` - Test `cn()` class merger and `formatBytes()` utility
- `src/lib/__tests__/audit-logger.test.ts` - Test audit logging with mocked database

**Running:**
```bash
npm test                    # Watch mode
npm run test:run            # Single run
npm run test:coverage       # With coverage report
```

**Best Practices:**
- Mock external dependencies (db, auth, storage)
- Test edge cases and error handling
- Use descriptive test names
- Keep tests focused and independent

### 2. API Integration Tests (Vitest + Hono)

**Location:** `src/server/routes/__tests__/*.test.ts`, `src/server/middleware/__tests__/*.test.ts`

**Purpose:** Test API routes with mocked authentication and database to ensure correct behavior, authorization, and validation.

**Examples:**
- `src/server/routes/__tests__/projects.test.ts` - Test project CRUD, org access control, super admin bypass
- `src/server/routes/__tests__/tasks.test.ts` - Test task management, date filtering, org membership
- `src/server/middleware/__tests__/auth.test.ts` - Test auth middleware, role hierarchy, session handling

**Test Utilities:**
- `src/test/mocks.ts` - Mock factories for users, organizations, projects, sessions, db
- `src/test/helpers.ts` - Test helpers like `testRoute()`, `createAuthHeaders()`, `generateTestId()`
- `src/test/setup.ts` - Vitest setup with mocked environment variables

**Best Practices:**
- Mock `@/lib/auth` to control session state
- Mock `@/lib/db` to avoid database dependencies
- Test authorization (super_admin bypass, role hierarchy, org access)
- Test validation errors (Zod schemas)
- Verify audit log calls for CREATE/UPDATE/DELETE actions
- Use `testRoute()` helper for cleaner test code

**Example Test Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testRoute, createAuthHeaders } from '../../../test/helpers'
import { mockUser, mockSuperAdmin } from '../../../test/mocks'

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}))

describe('API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow access for authenticated user', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: mockUser,
      session: { id: 'session-1' }
    })

    const result = await testRoute(app, 'GET', '/endpoint', {
      headers: createAuthHeaders()
    })

    expect(result.status).toBe(200)
  })
})
```

### 3. End-to-End Tests (Playwright)

**Location:** `e2e/*.spec.ts`

**Purpose:** Test critical user flows in a real browser environment against the running application.

**Examples:**
- `e2e/auth.spec.ts` - Login, logout, registration, session persistence, authorization
- `e2e/projects.spec.ts` - Project CRUD, tasks, stakeholders, kanban board, access control

**Configuration:** `playwright.config.ts` - Runs dev server automatically before tests

**Running:**
```bash
npm run test:e2e           # Run all E2E tests headlessly
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:debug     # Debug mode with inspector
```

**Best Practices:**
- Use seeded test data (from `db/seed.ts`)
- Test with different user roles (admin, gestor, viewer)
- Use data-testid attributes for stable selectors
- Handle async operations with proper waits
- Test both success and error paths
- Clean up created test data or use isolated test environments

**Seeded Test Credentials:**
- `admin@cuiaba.mt.gov.br` / `password123` - Super Admin (full access)
- `saude@cuiaba.mt.gov.br` / `password123` - Gestor Saúde (org-specific access)
- `obras@cuiaba.mt.gov.br` / `password123` - Gestor Obras
- `educacao@cuiaba.mt.gov.br` / `password123` - Fiscal Educação (viewer role)

### Test Database Setup

**For Integration Tests:**
1. Set `TEST_DATABASE_URL` environment variable to a separate test database
2. Run migrations: `npx drizzle-kit push`
3. Seed with test data: `npx tsx db/seed.ts`
4. Tests use mocked db by default, but can connect to real test DB if needed

**For E2E Tests:**
1. Ensure development database is seeded: `npx tsx db/seed.ts`
2. Run dev server: `npm run dev`
3. Playwright will use the running dev server

### Coverage Goals

- **Unit Tests:** 80%+ coverage for utilities and helpers
- **Integration Tests:** All API routes with auth/validation/error cases
- **E2E Tests:** Critical user journeys (auth, project creation, task management)

### Continuous Integration

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### Adding New Tests

**When adding a new API route:**
1. Create test file in `src/server/routes/__tests__/`
2. Mock auth and db
3. Test: authentication, authorization, validation, success/error cases
4. Verify audit logging if applicable

**When adding a new utility:**
1. Create test file in `src/lib/__tests__/`
2. Test all branches and edge cases
3. Mock external dependencies

**When adding a new user flow:**
1. Create or update E2E spec in `e2e/`
2. Use seeded test users
3. Test happy path and error handling
4. Verify UI feedback (success messages, errors)
