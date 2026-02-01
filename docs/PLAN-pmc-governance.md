# Plan: PMC Governance System Evolution

> **Goal**: Evolve the "Gerenciador de Projetos" into a hierarchical Governance System for the **Prefeitura Municipal de Cuiabá**, managed by the *Secretaria de Planejamento Estratégico e Orçamento*.

## 1. Project Overview
The system will transition from a flat project list to a **multi-tenant-like governance platform**. Projects will strictly belong to a **Secretaria (Unidade Orçamentária)**. Access will be controlled via robust RBAC (Role-Based Access Control).

### Success Criteria
- [ ] **Hierarchy**: Projects are organized by Secretariat.
- [ ] **RBAC**: 4 distinct roles (Super Admin, Secretário, Gestor, Cidadão).
- [ ] **Identity**: UI reflects the official "Cuiabá Prefeitura" brand (Green/Gold/White).
- [ ] **Migration**: Existing data safely moved to a "Secretaria de Demonstração".

---

## 2. Architecture & Schema Changes

### 2.1 New/Modified Tables (Drizzle)

#### `organizations` (New)
Represents "Secretarias" and "Unidades Orçamentárias".
- `id`: uuid
- `name`: string (e.g., "Secretaria de Saúde")
- `code`: string (e.g., "SMS")
- `logo_url`: string (optional)

#### `users` (Modify)
- Add `global_role`: enum('super_admin', 'user')

#### `memberships` (New - Junction Table)
Links users to organizations with specific roles.
- `user_id`: uuid
- `organization_id`: uuid
- `role`: enum('secretario', 'gestor', 'viewer')

#### `projects` (Modify)
- Add `organization_id`: uuid (Foreign Key to organizations)
- *Migration Note*: Existing projects will be linked to a placeholder organization.

---

## 3. Permissions (RBAC) Architecture

| Role | Scope | Permissions |
|------|-------|-------------|
| **Super Admin** | Global | Create Secretarias, Assign Secretários, View All Projects, Audit Logs |
| **Secretário** | Organization | Edit Org Details, Manage Org Members (Gestores), View/Edit All Org Projects |
| **Gestor** | Project | Edit assigned Projects, Update Status, Manage Stakeholders |
| **Cidadão** | Public/Global | Read-only view of "Public" projects (Future/Optional) |

---

## 4. Visual Identity (Cuiabá Brand)

Based on provided reference:
- **Header**: Deep Green Background using official tone.
- **Logo**: "Prefeitura de Cuiabá" logo on left.
- **Title**: "Sistema de Gestão de Projetos".
- **Subtitle**: "Secretaria de Planejamento Estratégico e Orçamento | Diretoria Técnica de Governança".
- **Footer**: Gold strip accent.

---

## 5. Implementation Task Breakdown

### Phase 1: Schema & Data Migration (P0)
- [ ] **Schema Update**: Create `organizations` and `memberships` tables. Add `organization_id` to `projects`.
- [ ] **Seed Data**: Create "Secretaria de Planejamento" (Admin) and "Secretaria de Demonstração".
- [ ] **Migration Script**: Move existing 3 projects to "Secretaria de Demonstração".
- [ ] **Auth Update**: Update `session` or `auth` hooks to include `organization` context.

### Phase 2: Role-Based Access Control (P1)
- [ ] **Middleware**: Create `requireRole` and `requireOrgAccess` middleware in Hono.
- [ ] **Admin Panel**: UI for Super Admin to create Secretarias and Invite Secretários.
- [ ] **Org Switching**: UI for users belonging to multiple Secretarias (if applicable).

### Phase 3: UI/UX Overhaul (P2)
- [ ] **Official Header**: Rebuild `Header.tsx` to match the "Cuiabá" visual identity exactly.
- [ ] **Dashboard Redesign**: Group projects by Secretariat on the main dashboard (for Admins).
- [ ] **Sidebar/Navigation**: Add hierarchy navigation.

### Phase 4: Refinement (P3)
- [ ] **Audit Logs**: Track who moved cards or edited budgets (Governance requirement).
- [ ] **Performance**: Ensure dashboard loads fast with hierarchy.

---

## ✅ Phase X: Verification Checklist
- [ ] **Hierarchy**: Can create a new Secretariat?
- [ ] **Isolation**: A "Health Secretary" CANNOT see "Education" projects?
- [ ] **Migration**: Are the old "ERP" and "AWS" projects visible under "Secretaria de Demonstração"?
- [ ] **Visuals**: Does the header match the uploaded image?
