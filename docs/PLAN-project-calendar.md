# PROJ-004: Project Calendar Implementation

> **Goal**: Implement a custom calendar view for project tasks matching the specific "Dark Green" aesthetic provided by the user.

## 1. Context & Scope

-   **User Request**: "structure the calender page looks like the image... see and add appointments"
-   **Current State**: Calendar link exists in sidebar, but page is missing (`/projects/[id]/calendar`).
-   **Architecture**: Astro + React + Hono + Postgres.
-   **Visuals**: Custom UI with `react-day-picker`. Left side: Calendar Grid. Right side: Selected Day Details.

## 2. Technical Decisions

### Libraries
-   **Calendar Core**: `react-day-picker` (requires installation).
-   **Icons**: `lucide-react`.
-   **Date Manipulation**: `date-fns` (requires installation).
-   **State**: `useState` for selected date, `useQuery` for fetching tasks.

### Data Model
-   **"Appointments"**: We will map `tasks.due_date` to the calendar.
-   **Fetch**: Reuse `GET /api/board/:projectId`.

## 3. Implementation Steps

### Phase 1: Dependencies & Setup
- [x] Install `react-day-picker` and `date-fns`.
- [x] Create page `src/pages/projects/[id]/calendar.astro`.

### Phase 2: Calendar UI (Left Panel)
- [x] Create `src/components/calendar/calendar-view.tsx`.
- [x] Implement `react-day-picker` with custom CSS/Tailwind.
- [ ] **Styling**: `styles/calendar.css` (or inline Tailwind) to match the dark green header/selected state.

### Phase 3: Task List (Right Panel)
- [x] Create `DayTaskList` component.
- [x] Display tasks for selected date.
- [x] Add "Empty State" (e.g. "Nenhuma tarefa para este dia").

### Phase 4: Integration
- [x] Fetch tasks in wrapper `CalendarPage`.
- [x] Pass tasks to Calendar (for indicators) and List.

## 4. Verification
- [x] Verify `npm install` worked.
- [x] Check `/projects/[id]/calendar` loads.
- [ ] Verify selection logic (Dark Green highlight).

