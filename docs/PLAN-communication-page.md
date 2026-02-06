# PLAN-communication-page

## 1. Context & Objectives
The goal is to implement the "Comunicação" (Communication) subpage within the Project Knowledge Areas. 
Based on the provided references, this page requires structured data entry rather than simple text fields.

**Visual reference:**
1. **Notas Gerais**: A free-text section with a yellow informational banner.
2. **Plano de Comunicação**: A form to define communication strategy (What, Who, When, Medium) and a list of added items.
3. **Registro de Reuniões**: A form to log meetings (Subject, Date, Decisions) and a list of past meetings.

## 2. Architecture & Database
We need to store structured data. We will add new tables to `db/schema.ts` to support this, linked to the `projects` table (or `knowledge_areas` if we want strict hierarchy, but linking to `project_id` is usually more flexible for queries).

### Schema Updates
*   **Table**: `project_communication_plans`
    *   `id` (PK)
    *   `project_id` (FK -> projects)
    *   `info` (text) - "O que será comunicado"
    *   `stakeholders` (text) - "Para Quem" (Could specific stakeholders linked, but text is simpler for now as per UI)
    *   `frequency` (text) - "Quando" (Diário, Semanal, etc.)
    *   `medium` (text) - "Meio" (E-mail, Reunião, etc.)

*   **Table**: `project_meetings`
    *   `id` (PK)
    *   `project_id` (FK -> projects)
    *   `subject` (text) - "Assunto"
    *   `date` (timestamp) - "Data"
    *   `decisions` (text) - "Principais Decisões"

*   **Table/Field**: `project_communication_notes`
    *   We can assume "Notas Gerais" is unique per project/area.
    *   Option A: Add `communication_notes` column to `projects` (messy).
    *   Option B: Use the generic `knowledge_areas` table if it exists and store in `content` field where `area = 'Comunicacao'`.
    *   **Decision**: Check if `knowledge_areas` table is suitable. It has `area` and `content`. We will use this for the "Notas Gerais".

## 3. Frontend Implementation
We will create a specific component for the Communication area that renders these three sections.

### Components
*   `src/components/projects/knowledge-areas/communication/communication-view.tsx`: Main container.
*   `src/components/projects/knowledge-areas/communication/general-notes.tsx`: Textarea with auto-save or save button.
*   `src/components/projects/knowledge-areas/communication/communication-plan-list.tsx`: List + Form for communication items.
*   `src/components/projects/knowledge-areas/communication/meeting-register.tsx`: List + Form for meetings.

### UI/UX Details (from images)
*   **Colors**: 
    *   Notes: Yellow alert (`bg-yellow-50 text-yellow-800 border-yellow-200`).
    *   Communication: Blue theme (`bg-blue-50` for header/info).
    *   Meetings: Green theme (`bg-green-50` for header/info).
*   **Forms**: Inline forms with "Adicionar" buttons.
*   **Empty States**: "Nenhum item no plano", "Nenhuma reunião registrada".

## 4. API Routes
*   `GET /api/projects/:id/communication`: Fetch all data (Plan, Meetings, Note).
*   `POST /api/projects/:id/communication/plan`: Add plan item.
*   `DELETE /api/projects/:id/communication/plan/:itemId`: Remove item.
*   `POST /api/projects/:id/communication/meeting`: Add meeting.
*   `DELETE /api/projects/:id/communication/meeting/:itemId`: Remove meeting.
*   `PUT /api/projects/:id/communication/notes`: Update general notes.

## 5. Verification Checklist
- [ ] Database migration created and pushed.
- [ ] API Endpoints tested and working.
- [ ] "Notas Gerais" saves and persists.
- [ ] "Plano de Comunicação" items can be added and listed.
- [ ] "Registro de Reuniões" items can be added and listed.
- [ ] UI matches the visual style (colors and layout) of the provided images.
