# Plan: Project Type & Status Fields

## Overview
Add `type` and `status` fields to the `projects` table to enable better categorization and tracking. These fields will be selectable via a dropdown (Select) in the creation and edit forms.

## Project Type
**WEB** (Full Stack Implementation)

## Success Criteria
- [ ] Database schema updated with `type` and `status` columns.
- [ ] API endpoints (Create/Update Project) accept new fields.
- [ ] "Create Project" dialog includes Select inputs for Type and Status.
- [ ] "Project Settings" or Details page allows editing these fields.
- [ ] Dashboard charts use real database values for these fields.

## Tech Stack
- **Database:** PostgreSQL (Drizzle ORM)
- **Backend:** Hono (API)
- **Frontend:** React, Shadcn UI (Select component), TanStack Query

## Data Model Changes

### `projects` Table
- **New Column:** `type` (text, not null)
    -   **Options:**
        -   `Obra` (Construction)
        -   `Trabalho Social` (Social Work)
        -   `Programa` (Program)
        -   `Serviço` (Service)
        -   `Aquisição` (Acquisition)
        -   `Evento` (Event)
        -   `Estudo` (Study) - *New*
        -   `Capacitação` (Training) - *New*
        -   `Inovação` (Innovation) - *New*
        -   `TIC` (ICT) - *New (generic tech)*

- **New Column:** `status` (text, not null, default: 'em_andamento')
    -   **Options:**
        -   `em_andamento` (In Progress)
        -   `concluido` (Completed)
        -   `suspenso` (Suspended)
        -   `cancelado` (Cancelled)
    -   *Note on "Atrasado" (Late):* This will be a **computed state** in the UI based on `endDate < today` AND `status === 'em_andamento'`. We will not store "Atrasado" as a rigid database state to avoid staleness, but users can see it as a status indicator.

## Task Breakdown

### Phase 1: Database & Backend (P0)
- [ ] **DB-1:** Add `type` and `status` columns to `projects` table in `db/schema.ts`. <!-- agent: database-architect -->
    -   Input: `db/schema.ts`
    -   Output: Schema definition with new columns.
- [ ] **DB-2:** Clean/Reset Database (since we are in dev/prototype phase with no migrations yet). <!-- agent: database-architect -->
    -   Input: `reset.ts` or manual drop/push.
    -   Output: Database with new columns.
- [ ] **API-1:** Update `project.routes.ts` validation schema (Zod) to include `type` and `status`. <!-- agent: backend-specialist -->
    -   Input: `src/api/projects/[projectId].ts`, `src/api/projects/index.ts`
    -   Output: Updated Zod schemas.

### Phase 2: Frontend Implementation (P1)
- [ ] **UI-1:** Update `CreateProjectDialog` to include `Select` for Type and Status. <!-- agent: frontend-specialist -->
    -   Input: `src/components/dashboard/create-project-dialog.tsx`
    -   Output: Form with new fields.
- [ ] **UI-2:** Update `ProjectHeader` or Settings to allow editing Type/Status. <!-- agent: frontend-specialist -->
    -   Input: `src/components/dashboard/project-header.tsx`
    -   Output: Editable fields or "Edit" button triggering a dialog.
- [ ] **UI-3:** Update `OverviewCharts` data fetching to use real `type` and `status` from DB. <!-- agent: frontend-specialist -->
    -   Input: `src/pages/dashboard.astro`
    -   Output: Real visualization data.

## Phase X: Verification
- [ ] **Schema Check:** Verify columns exist in DB.
- [ ] **Create Flow:** Create a project with Type="Inovação" -> Verify in List.
- [ ] **Edit Flow:** Change status to "Suspenso" -> Verify update.
- [ ] **Dashboard:** Verify charts reflect the new project types.
