# File Processor Design

## Goal

Add export (Excel, CSV, PDF) and import (Excel, CSV) capabilities to the project management system, orchestrated via Inngest background jobs with files stored on S3.

## Architecture

**Libraries:** `exceljs` (Excel + CSV read/write) + `pdfkit` (PDF generation)

**Flow (export):**
1. Client sends `POST /api/file-processor/export` with entity, projectId, format
2. API validates auth + project access, fires Inngest event `file-processor/export`
3. Inngest function queries DB, generates file in memory, uploads to S3 (`exports/{projectId}/{jobId}-{entity}.{ext}`)
4. Creates `attachments` record with `entityType: "export"`
5. Sends Socket.IO notification to user with download link
6. User downloads via existing `GET /api/storage/file/:id` route

**Flow (import):**
1. Client uploads file via `POST /api/file-processor/import` (multipart) with entity, projectId
2. API validates auth (gestor+), uploads raw file to S3 (`imports/{projectId}/{jobId}-{entity}.{ext}`)
3. Fires Inngest event `file-processor/import`
4. Inngest function downloads file, parses rows, validates against Zod schemas
5. Bulk inserts valid rows, creates audit log
6. Sends Socket.IO notification with result (imported count, error count, error details)

**Sync mode:** For small exports (<100 rows), optional `sync: true` parameter streams the file directly in the HTTP response, skipping Inngest.

## File Structure

```
src/lib/file-processor/
  ├── excel.ts           # ExcelJS workbook builders per entity
  ├── csv.ts             # CSV export/import (wrapper over ExcelJS CSV methods)
  ├── pdf/
  │   ├── core.ts        # PDFKit shared: styles, headers, table helpers
  │   ├── tap.ts         # TAP (Termo de Abertura) document generator
  │   └── summary.ts     # Project summary report generator
  └── import.ts          # Parse uploaded files → validate → bulk insert

src/lib/inngest/functions/
  └── file-processor.ts  # Inngest functions for export + import jobs

src/server/routes/
  └── file-processor.ts  # Hono routes: export, import, status
```

## Exportable Entities

### Excel/CSV Exports

| Entity | Columns |
|--------|---------|
| Tasks | Fase, Título, Descrição, Status, Prioridade, Responsável, Stakeholder, Data Início, Data Fim |
| Stakeholders | Nome, Papel, Nível, Email |
| Quality Metrics | Nome, Meta, Valor Atual |
| Quality Checklists | Item, Concluído (Sim/Não) |
| Communication Plans | Informação, Partes Interessadas, Frequência, Meio |
| Procurement Suppliers | Nome, Item/Serviço, Contato |
| Procurement Contracts | Descrição, Valor (BRL), Validade, Status |
| Milestones | Nome, Data Prevista (DD/MM/YYYY), Fase |
| Audit Logs | Data, Usuário, Ação, Recurso, Detalhes (admin only) |

Excel formatting: bold header row, auto-width columns, title row with project name + export date.

### PDF Documents

**TAP (Termo de Abertura do Projeto):**
- Header: org logo + project name + date
- Sections: Justificativa, Objetivos SMART (table), Critérios de Sucesso
- Footer: page numbers
- Formal style for printing/signing

**Project Summary Report:**
- Header: org name + project name
- Overview: type, status, progress
- Phases: list with task counts and completion %
- Stakeholders table
- Quality KPIs
- Recent activity (last 10 audit logs)

## Import Specifications

### Task Import

| Column (flexible matching) | Maps to | Required | Validation |
|---|---|---|---|
| Título / Title | title | Yes | Non-empty string |
| Descrição / Description | description | No | String |
| Status | status | No | todo, in_progress, done (default: todo) |
| Prioridade / Priority | priority | No | low, medium, high, urgent (default: medium) |
| Data Início / Start Date | startDate | No | DD/MM/YYYY or YYYY-MM-DD |
| Data Fim / End Date | endDate | No | Date |
| Fase / Phase | Phase lookup | No | Matches existing phase name |

### Stakeholder Import

| Column | Maps to | Required | Validation |
|---|---|---|---|
| Nome / Name | name | Yes | Non-empty string |
| Papel / Role | role | No | String |
| Nível / Level | level | No | key_stakeholder, primary, secondary (default: secondary) |
| Email | email | No | Valid email format |

**Import behavior:**
- All rows validated first, errors reported before inserting
- Row-level errors skip the row, continue processing
- Auto-assigns `order` incrementally
- Creates audit log with import source metadata
- Notification includes: total, imported count, error count with row numbers

## API Routes

```
POST /api/file-processor/export
  Body: { entity, projectId, format: "xlsx" | "csv" | "pdf", sync?: boolean }
  Auth: requireAuth + canAccessProject (viewers can export)
  Returns: { jobId } (async) or file stream (sync)

POST /api/file-processor/import
  Body: multipart (file + entity + projectId)
  Auth: requireAuth + canAccessProject + gestor+ role
  Returns: { jobId }

GET /api/file-processor/status/:jobId
  Returns: { status: "pending" | "processing" | "completed" | "failed", attachmentId?, error? }
```

## UI Integration

**Export buttons** (added to existing views):
- Tasks (phase-list): "Exportar" dropdown → Excel / CSV
- Stakeholders tab: "Exportar" dropdown → Excel / CSV
- Project header: "Relatórios" dropdown → TAP (PDF) / Resumo (PDF)
- Quality, Procurement, Communication tabs: "Exportar" → Excel / CSV

**Import buttons** (tasks + stakeholders only):
- "Importar" button → dialog with react-dropzone (already installed)
- Accepts .xlsx, .csv files
- Shows processing status via toast + Socket.IO notification

**UX flow:**
1. Export: click → toast "Gerando..." → notification when ready → download
2. Import: click → drop file → toast "Processando..." → notification with results → UI refreshes

## Authorization

- Export: any authenticated user with project access (including viewers)
- Import: gestor or secretario role (viewers cannot import)
- Audit log export: super_admin only
- All operations create audit log entries

## Dependencies

New: `exceljs`, `pdfkit`
Existing (reused): `inngest`, S3 storage, `socket.io`, `react-dropzone`, `zod`, `drizzle-orm`
