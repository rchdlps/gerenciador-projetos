# Plan: Project Manager Migration

> **Goal**: Migrate the existing `index.html` prototype to a robust, scalable full-stack application using modern web technologies.

## 1. Project Overview
The "Gerenciador de Projetos" is a comprehensive management dashboard integrating Project Planning (Budget, Stakeholders, Knowledge Areas) with Execution (Scrumban Board). This plan covers the migration from a static HTML prototype to a dynamic, database-backed application.

### Success Criteria
- [ ] **Feature Parity**: All visual elements from `index.html` (Stakeholders, Scrumban, etc.) implemented as React components.
- [ ] **Dynamic Data**: All forms and boards persist data to Postgres.
- [ ] **Secure**: Robust authentication using Better Auth (Self-hosted).
- [ ] **Responsive**: Fully responsive UI/UX using Tailwind CSS.
- [ ] **Type-Safe**: End-to-end TypeScript (Frontend + Backend).

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **Astro** | Excellent performance, flexible integration of React islands, handles SSR/SSG. |
| **UI Library** | **React** | Robust ecosystem for complex interactive components (Scrumban, Forms). |
| **Styling** | **Tailwind CSS** | Utility-first, consistently requested, matches modern standards. |
| **Components** | **shadcn/ui** | accessible, customizable component primitives (Radix UI based). |
| **Routing** | **TanStack Router** | Type-safe, powerful routing for the SPA-like portions of the dashboard. |
| **State Management** | **TanStack Query** | Async state management for API data. |
| **Backend API** | **Hono (Node.js)** | Lightweight, fast, standards-compliant web standard API (runs in Node adapter). |
| **Database** | **PostgreSQL** | Relational data integrity for complex project schemas. |
| **ORM** | **Drizzle ORM** | Lightweight, type-safe SQL-like ORM (Best fit for Hono/TS). |
| **Auth** | **Better Auth** | Modern, type-safe authentication library (Self-hosted). |

---

## 3. Architecture & File Structure

We will use a Monolith structure within Astro, where Hono serves the API routes.

```
/
├── db/                     # Database Schema & Migrations (Drizzle)
│   ├── schema.ts
│   └── migrations/
├── src/
│   ├── components/         # React Components
│   │   ├── ui/             # shadcn/ui primitives
│   │   ├── dashboard/      # Business components (Stakeholders, Board)
│   │   ├── layout/         # Header, Sidebar
│   │   └── common/
│   ├── layouts/            # Astro Layouts (MainLayout, AuthLayout)
│   ├── pages/              # Astro Routes
│   │   ├── index.astro     # Landing / Dashboard
│   │   ├── api/            # Hono Entry point (all API routes via [...path].ts)
│   │   └── [monitor]/      # TanStack Router catch-all (optional if SPA mode preferred for app)
│   ├── lib/                # Utilities
│   │   ├── auth.ts         # Better Auth config
│   │   ├── db.ts           # DB Connection
│   │   └── api-client.ts   # RPC or Fetch client
│   └── styles/
│       └── globals.css     # Tailwind imports
├── drizzle.config.ts
├── astro.config.mjs
└── package.json
```

---

## 4. Implementation Phase Breakdown

### Phase 1: Foundation Setup (P0)
**Goal**: Working generic app with Auth and DB connection.
- [ ] **Init Project**: Create Astro project + Tailwind + React integration.
- [ ] **UI setup**: Install `shadcn/ui` and initialize base components (Button, Input, Card, Dialog).
- [ ] **Backend Setup**: Configure Hono to run under Astro middleware or API routes.
- [ ] **DB Setup**: Initialize Postgres (Docker or Local), setup Drizzle ORM, create `User` and `Session` schema.
- [ ] **Auth Implementation**: Configure Better Auth with Email/Password (Self-hosted). Create Login/Register pages.
- [ ] **Verification**: User can sign up, log in, and see a protected "Dashboard" page.

### Phase 2: Core Domain Modeling (P1)
**Goal**: Persist Project and Stakeholder data.
- [ ] **Schema Migration**: Define `projects`, `stakeholders`, `knowledge_areas` tables in Drizzle.
- [ ] **API Development**: Create Hono endpoints for CRUD (`/api/projects`, `/api/stakeholders`).
- [ ] **Project Config UI**: Port the "Project Config Card" (Name edit) to a React component.
- [ ] **Stakeholders UI**: Port "Stakeholders Card" to React. Implement Add/Edit/Delete modal using `shadcn/dialog`.
- [ ] **Verification**: Create a project, add stakeholders, refresh page -> Data persists.

### Phase 3: Complex Features (P1.5)
**Goal**: Knowledge Areas and Interactive Board.
- [ ] **Knowledge Areas**: Create the Accordion/Grid layout (`knowledge-areas-container`). 
    - Implement the dynamic fields for Scope, Time, Cost, etc.
- [ ] **Scrumban Board Schema**: Define `columns`, `cards`, `card_movements` schema.
- [ ] **Scrumban UI**: Implement Drag-and-Drop board using `@dnd-kit/core` or `react-beautiful-dnd`.
    - Columns: To Do, Doing, Done.
    - Card creation/editing.
- [ ] **Verification**: Move cards between columns, verify persistence.

### Phase 4: Polish & Refinement (P2)
**Goal**: Aesthetics and UX.
- [ ] **Theming**: Replicate the specific gradients and colors from `index.html` (the green/gold theme) into `tailwind.config`.
- [ ] **Micro-interactions**: Hover states, smooth transitions (Framer Motion optionally).
- [ ] **Responsiveness**: Ensure Layout breaks down correctly for Mobile.
- [ ] **SEO/Meta**: Add title tags and metadata in Astro layouts.

### Phase 5: Testing & Deployment (P3)
- [ ] **CI/CD**: Dockerfile creation.
- [ ] **Linting**: ESLint + Prettier config.
- [ ] **E2E Testing**: Basic Playwright test for critical flow (Login -> Create Project -> Add Card).

---

## 5. Task Breakdown (Detailed)

### 5.1 Infrastructure
- [ ] **Setup Astro+Hono**: `npm create astro@latest`, add React, Hono.
- [ ] **Setup Database**: `docker-compose.yml` for Postgres.
- [ ] **Setup Drizzle**: Connect Drizzle to Postgres.

### 5.2 Authentication
- [ ] **API Auth**: Better Auth implementation in `lib/auth.ts`.
- [ ] **Auth Pages**: `/login`, `/register` using Shadcn forms.

### 5.3 Features - Migration from index.html
- [ ] **Header Component**: Migrate `.header` styles to Tailwind component.
- [ ] **Breadcrumbs**: Create dynamic Breadcrumb component.
- [ ] **Project Settings**: "Configuração do Projeto" component.
- [ ] **Stakeholders List**: "Partes Interessadas" component with Avatar generator.
- [ ] **Knowledge Areas**: "Áreas de Conhecimento" - Dynamic Accordion Grid.
- [ ] **Scrumban**: Full Board implementation.

---

## ✅ Phase X: Verification Checklist
- **Functionality**:
    - [ ] Can register and login?
    - [ ] Can update Project Name?
    - [ ] Stakeholders are saved to DB?
    - [ ] Kanban cards move and save state?
- **Code Quality**:
    - [ ] `npm run lint` passes.
    - [ ] `npm run build` succeeds without errors.
- **Design**:
    - [ ] Matches the "Premium" look of the prototype (Gradients, Shadows).
    - [ ] Responsive on mobile.
