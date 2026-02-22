# File Processor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add export (Excel/CSV/PDF) and import (Excel/CSV) capabilities orchestrated via Inngest background jobs with files stored on S3.

**Architecture:** Hono API routes accept export/import requests, fire Inngest events for background processing. Inngest functions generate files using ExcelJS/PDFKit, upload to S3 via existing storage service, create attachment records, and notify users via Socket.IO. Sync mode available for small exports.

**Tech Stack:** ExcelJS (Excel + CSV), PDFKit (PDF), Inngest (job orchestration), S3 (file storage), Socket.IO (real-time notifications), Zod (validation), Drizzle ORM (database)

---

### Task 1: Install Dependencies and Register Inngest Events

**Files:**
- Modify: `package.json`
- Modify: `src/lib/inngest/client.ts` (add new event types)

**Step 1: Install exceljs and pdfkit**

Run:
```bash
npm install exceljs pdfkit @types/pdfkit
```

**Step 2: Add Inngest event types**

Open `src/lib/inngest/client.ts`. Add two new events to the `AppEvents` type:

```typescript
"file-processor/export": {
    data: {
        jobId: string
        entity: string
        projectId: string
        format: "xlsx" | "csv" | "pdf"
        userId: string
        organizationId?: string
    }
}
"file-processor/import": {
    data: {
        jobId: string
        entity: string
        projectId: string
        fileKey: string
        userId: string
        organizationId?: string
    }
}
```

Add these inside the existing `AppEvents` type alongside `"notification/activity"`, `"image/process"`, etc.

**Step 3: Verify build**

Run:
```bash
npx astro check 2>&1 | grep -c "error"
```

Expected: same error count as before (16 pre-existing errors).

**Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/inngest/client.ts
git commit -m "feat: install exceljs + pdfkit and add file-processor Inngest events"
```

---

### Task 2: Excel Export Service

**Files:**
- Create: `src/lib/file-processor/excel.ts`
- Test: `src/lib/file-processor/__tests__/excel.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/__tests__/excel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildExcelWorkbook } from '../excel'

describe('buildExcelWorkbook', () => {
    it('should create a workbook with header row and data rows for tasks', async () => {
        const rows = [
            { Fase: 'Iniciação', Título: 'Tarefa 1', Descrição: 'Desc', Status: 'A Fazer', Prioridade: 'Média', Responsável: 'João', Stakeholder: '', 'Data Início': '01/01/2026', 'Data Fim': '15/01/2026' },
            { Fase: 'Iniciação', Título: 'Tarefa 2', Descrição: '', Status: 'Em Andamento', Prioridade: 'Alta', Responsável: '', Stakeholder: 'Maria', 'Data Início': '', 'Data Fim': '' },
        ]

        const buffer = await buildExcelWorkbook({
            sheetName: 'Tarefas',
            projectName: 'Projeto Teste',
            rows,
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)

        // Verify by reading back
        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.getWorksheet('Tarefas')!
        expect(ws).toBeDefined()
        // Row 1 = title, Row 2 = empty, Row 3 = headers, Row 4+ = data
        expect(ws.getRow(3).getCell(1).value).toBe('Fase')
        expect(ws.getRow(3).getCell(2).value).toBe('Título')
        expect(ws.getRow(4).getCell(2).value).toBe('Tarefa 1')
        expect(ws.getRow(5).getCell(2).value).toBe('Tarefa 2')
    })

    it('should create a workbook for stakeholders', async () => {
        const rows = [
            { Nome: 'João Silva', Papel: 'Gerente', Nível: 'Chave', Email: 'joao@test.com' },
        ]

        const buffer = await buildExcelWorkbook({
            sheetName: 'Stakeholders',
            projectName: 'Projeto Teste',
            rows,
        })

        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.getWorksheet('Stakeholders')!
        expect(ws.getRow(3).getCell(1).value).toBe('Nome')
        expect(ws.getRow(4).getCell(1).value).toBe('João Silva')
    })

    it('should handle empty rows array', async () => {
        const buffer = await buildExcelWorkbook({
            sheetName: 'Vazio',
            projectName: 'Projeto Teste',
            rows: [],
        })

        expect(buffer).toBeInstanceOf(Buffer)
        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.getWorksheet('Vazio')!
        expect(ws).toBeDefined()
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/__tests__/excel.test.ts`
Expected: FAIL — module `../excel` not found.

**Step 3: Implement the Excel export service**

Create `src/lib/file-processor/excel.ts`:

```typescript
import ExcelJS from 'exceljs'

export interface ExcelBuildOptions {
    sheetName: string
    projectName: string
    rows: Record<string, string | number | boolean | null | undefined>[]
}

/**
 * Build an Excel workbook from rows of data.
 * Returns a Buffer of the .xlsx file.
 */
export async function buildExcelWorkbook(options: ExcelBuildOptions): Promise<Buffer> {
    const { sheetName, projectName, rows } = options
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Gerenciador de Projetos'
    wb.created = new Date()

    const ws = wb.addWorksheet(sheetName)

    // Title row
    const titleRow = ws.addRow([`${projectName} — ${sheetName}`])
    titleRow.font = { bold: true, size: 14 }
    ws.addRow([]) // spacer

    if (rows.length === 0) {
        ws.addRow(['Nenhum dado encontrado'])
        const buf = await wb.xlsx.writeBuffer()
        return Buffer.from(buf)
    }

    // Header row from first row's keys
    const columns = Object.keys(rows[0])
    const headerRow = ws.addRow(columns)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0369A1' }, // sky-700
        }
        cell.alignment = { horizontal: 'center' }
    })

    // Data rows
    for (const row of rows) {
        ws.addRow(columns.map(col => row[col] ?? ''))
    }

    // Auto-width columns
    ws.columns.forEach((col) => {
        let maxLen = 10
        col.eachCell?.({ includeEmpty: false }, (cell) => {
            const len = String(cell.value ?? '').length
            if (len > maxLen) maxLen = len
        })
        col.width = Math.min(maxLen + 4, 60)
    })

    const buf = await wb.xlsx.writeBuffer()
    return Buffer.from(buf)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/__tests__/excel.test.ts`
Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/excel.ts src/lib/file-processor/__tests__/excel.test.ts
git commit -m "feat: add Excel export service with ExcelJS"
```

---

### Task 3: CSV Export Service

**Files:**
- Create: `src/lib/file-processor/csv.ts`
- Test: `src/lib/file-processor/__tests__/csv.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/__tests__/csv.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvBuffer } from '../csv'

describe('buildCsvBuffer', () => {
    it('should create a CSV with header and data rows', () => {
        const rows = [
            { Nome: 'João', Papel: 'Gerente', Email: 'joao@test.com' },
            { Nome: 'Maria', Papel: 'Analista', Email: 'maria@test.com' },
        ]

        const buffer = buildCsvBuffer(rows)
        const text = buffer.toString('utf-8')

        expect(text).toContain('Nome,Papel,Email')
        expect(text).toContain('João,Gerente,joao@test.com')
        expect(text).toContain('Maria,Analista,maria@test.com')
    })

    it('should handle values with commas by quoting them', () => {
        const rows = [
            { Nome: 'Silva, João', Papel: 'Gerente' },
        ]

        const buffer = buildCsvBuffer(rows)
        const text = buffer.toString('utf-8')

        expect(text).toContain('"Silva, João"')
    })

    it('should return header-only CSV for empty rows', () => {
        const buffer = buildCsvBuffer([])
        const text = buffer.toString('utf-8')
        expect(text.trim()).toBe('')
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/__tests__/csv.test.ts`
Expected: FAIL.

**Step 3: Implement CSV export**

Create `src/lib/file-processor/csv.ts`:

```typescript
/**
 * Build a CSV buffer from rows of data.
 * Handles quoting for values containing commas or newlines.
 */
export function buildCsvBuffer(rows: Record<string, string | number | boolean | null | undefined>[]): Buffer {
    if (rows.length === 0) return Buffer.from('', 'utf-8')

    const columns = Object.keys(rows[0])

    const escapeCell = (val: unknown): string => {
        const str = String(val ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    const lines: string[] = []
    lines.push(columns.map(escapeCell).join(','))

    for (const row of rows) {
        lines.push(columns.map(col => escapeCell(row[col])).join(','))
    }

    // BOM + content for Excel compatibility with accented chars
    const bom = '\uFEFF'
    return Buffer.from(bom + lines.join('\n'), 'utf-8')
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/__tests__/csv.test.ts`
Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/csv.ts src/lib/file-processor/__tests__/csv.test.ts
git commit -m "feat: add CSV export service"
```

---

### Task 4: Entity Data Mappers

**Files:**
- Create: `src/lib/file-processor/mappers.ts`
- Test: `src/lib/file-processor/__tests__/mappers.test.ts`

These functions query the DB for a given entity + projectId and return `Record<string, string>[]` rows ready for Excel/CSV export.

**Step 1: Write the test**

Create `src/lib/file-processor/__tests__/mappers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(),
        query: {
            projectPhases: { findMany: vi.fn() },
            stakeholders: { findMany: vi.fn() },
            projectQualityMetrics: { findMany: vi.fn() },
            projectQualityChecklists: { findMany: vi.fn() },
            projectCommunicationPlans: { findMany: vi.fn() },
            procurementSuppliers: { findMany: vi.fn() },
            procurementContracts: { findMany: vi.fn() },
            projectMilestones: { findMany: vi.fn() },
        },
    },
}))

import { mapTasksForExport, mapStakeholdersForExport, ENTITY_MAPPERS } from '../mappers'
import { db } from '@/lib/db'

describe('Entity Mappers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should map tasks with phase names and translated labels', async () => {
        vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([
            {
                id: 'p1',
                name: 'Iniciação',
                projectId: 'proj1',
                description: null,
                order: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                tasks: [
                    {
                        id: 't1',
                        phaseId: 'p1',
                        title: 'Tarefa 1',
                        description: 'Desc',
                        status: 'todo',
                        priority: 'high',
                        startDate: new Date('2026-01-01'),
                        endDate: new Date('2026-01-15'),
                        assigneeId: null,
                        stakeholderId: null,
                        order: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        assignee: null,
                        stakeholder: null,
                    },
                ],
            },
        ] as any)

        const rows = await mapTasksForExport('proj1')

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            Fase: 'Iniciação',
            Título: 'Tarefa 1',
            Descrição: 'Desc',
            Status: 'A Fazer',
            Prioridade: 'Alta',
        })
    })

    it('should map stakeholders with translated levels', async () => {
        vi.mocked(db.query.stakeholders.findMany).mockResolvedValue([
            { id: 's1', name: 'João', role: 'Gerente', level: 'key_stakeholder', email: 'j@t.com', projectId: 'proj1', createdAt: new Date(), updatedAt: new Date() },
        ] as any)

        const rows = await mapStakeholdersForExport('proj1')

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            Nome: 'João',
            Papel: 'Gerente',
            Nível: 'Chave',
            Email: 'j@t.com',
        })
    })

    it('should have all entity mappers registered', () => {
        expect(ENTITY_MAPPERS).toHaveProperty('tasks')
        expect(ENTITY_MAPPERS).toHaveProperty('stakeholders')
        expect(ENTITY_MAPPERS).toHaveProperty('quality-metrics')
        expect(ENTITY_MAPPERS).toHaveProperty('quality-checklists')
        expect(ENTITY_MAPPERS).toHaveProperty('communication-plans')
        expect(ENTITY_MAPPERS).toHaveProperty('procurement-suppliers')
        expect(ENTITY_MAPPERS).toHaveProperty('procurement-contracts')
        expect(ENTITY_MAPPERS).toHaveProperty('milestones')
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/__tests__/mappers.test.ts`
Expected: FAIL.

**Step 3: Implement entity mappers**

Create `src/lib/file-processor/mappers.ts`:

```typescript
import { db } from '@/lib/db'
import {
    stakeholders,
    projectQualityMetrics,
    projectQualityChecklists,
    projectCommunicationPlans,
    procurementSuppliers,
    procurementContracts,
    projectMilestones,
} from '../../../db/schema'
import { eq } from 'drizzle-orm'

type ExportRow = Record<string, string>

const STATUS_LABELS: Record<string, string> = {
    todo: 'A Fazer',
    in_progress: 'Em Andamento',
    done: 'Concluído',
}

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
}

const LEVEL_LABELS: Record<string, string> = {
    key_stakeholder: 'Chave',
    primary: 'Primário',
    secondary: 'Secundário',
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return ''
    const date = d instanceof Date ? d : new Date(d)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('pt-BR')
}

export async function mapTasksForExport(projectId: string): Promise<ExportRow[]> {
    const phases = await db.query.projectPhases.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
        with: {
            tasks: {
                with: { assignee: true, stakeholder: true },
                orderBy: (t, { asc }) => [asc(t.order)],
            },
        },
        orderBy: (t, { asc }) => [asc(t.order)],
    })

    const rows: ExportRow[] = []
    for (const phase of phases) {
        for (const task of phase.tasks) {
            rows.push({
                Fase: phase.name,
                Título: task.title,
                Descrição: task.description || '',
                Status: STATUS_LABELS[task.status] || task.status,
                Prioridade: PRIORITY_LABELS[task.priority] || task.priority,
                Responsável: task.assignee?.name || '',
                Stakeholder: task.stakeholder?.name || '',
                'Data Início': formatDate(task.startDate),
                'Data Fim': formatDate(task.endDate),
            })
        }
    }
    return rows
}

export async function mapStakeholdersForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.stakeholders.findMany({
        where: eq(stakeholders.projectId, projectId),
    })
    return items.map(s => ({
        Nome: s.name,
        Papel: s.role || '',
        Nível: LEVEL_LABELS[s.level] || s.level || '',
        Email: s.email || '',
    }))
}

export async function mapQualityMetricsForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.projectQualityMetrics.findMany({
        where: eq(projectQualityMetrics.projectId, projectId),
    })
    return items.map(m => ({
        Nome: m.name,
        Meta: m.target,
        'Valor Atual': m.currentValue,
    }))
}

export async function mapQualityChecklistsForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.projectQualityChecklists.findMany({
        where: eq(projectQualityChecklists.projectId, projectId),
    })
    return items.map(c => ({
        Item: c.item,
        Concluído: c.completed ? 'Sim' : 'Não',
    }))
}

export async function mapCommunicationPlansForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.projectCommunicationPlans.findMany({
        where: eq(projectCommunicationPlans.projectId, projectId),
    })
    return items.map(p => ({
        Informação: p.info,
        'Partes Interessadas': p.stakeholders,
        Frequência: p.frequency,
        Meio: p.medium,
    }))
}

export async function mapProcurementSuppliersForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.procurementSuppliers.findMany({
        where: eq(procurementSuppliers.projectId, projectId),
    })
    return items.map(s => ({
        Nome: s.name,
        'Item/Serviço': s.itemService,
        Contato: s.contact,
    }))
}

export async function mapProcurementContractsForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.procurementContracts.findMany({
        where: eq(procurementContracts.projectId, projectId),
    })
    return items.map(c => ({
        Descrição: c.description,
        Valor: c.value,
        Validade: formatDate(c.validity),
        Status: c.status,
    }))
}

export async function mapMilestonesForExport(projectId: string): Promise<ExportRow[]> {
    const items = await db.query.projectMilestones.findMany({
        where: eq(projectMilestones.projectId, projectId),
    })
    return items.map(m => ({
        Nome: m.name,
        'Data Prevista': formatDate(m.expectedDate),
        Fase: m.phase || '',
    }))
}

/** Registry of entity → mapper function */
export const ENTITY_MAPPERS: Record<string, (projectId: string) => Promise<ExportRow[]>> = {
    tasks: mapTasksForExport,
    stakeholders: mapStakeholdersForExport,
    'quality-metrics': mapQualityMetricsForExport,
    'quality-checklists': mapQualityChecklistsForExport,
    'communication-plans': mapCommunicationPlansForExport,
    'procurement-suppliers': mapProcurementSuppliersForExport,
    'procurement-contracts': mapProcurementContractsForExport,
    milestones: mapMilestonesForExport,
}

/** Human-readable sheet names for each entity */
export const ENTITY_SHEET_NAMES: Record<string, string> = {
    tasks: 'Tarefas',
    stakeholders: 'Stakeholders',
    'quality-metrics': 'Métricas de Qualidade',
    'quality-checklists': 'Checklist de Qualidade',
    'communication-plans': 'Plano de Comunicação',
    'procurement-suppliers': 'Fornecedores',
    'procurement-contracts': 'Contratos',
    milestones: 'Marcos',
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/__tests__/mappers.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/mappers.ts src/lib/file-processor/__tests__/mappers.test.ts
git commit -m "feat: add entity data mappers for export"
```

---

### Task 5: PDF Core Helpers

**Files:**
- Create: `src/lib/file-processor/pdf/core.ts`
- Test: `src/lib/file-processor/pdf/__tests__/core.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/pdf/__tests__/core.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createPdfBuffer, COLORS, FONTS } from '../core'

describe('PDF Core', () => {
    it('should create a valid PDF buffer from a builder function', async () => {
        const buffer = await createPdfBuffer((doc) => {
            doc.fontSize(20).text('Test Document', { align: 'center' })
            doc.moveDown()
            doc.fontSize(12).text('Hello, world!')
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        // PDF magic bytes: %PDF
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })

    it('should export color and font constants', () => {
        expect(COLORS).toHaveProperty('primary')
        expect(COLORS).toHaveProperty('text')
        expect(FONTS).toHaveProperty('title')
        expect(FONTS).toHaveProperty('body')
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/core.test.ts`
Expected: FAIL.

**Step 3: Implement PDF core**

Create `src/lib/file-processor/pdf/core.ts`:

```typescript
import PDFDocument from 'pdfkit'

export const COLORS = {
    primary: '#0369A1',    // sky-700
    secondary: '#64748B',  // slate-500
    text: '#1E293B',       // slate-800
    lightBg: '#F1F5F9',   // slate-100
    border: '#CBD5E1',     // slate-300
    white: '#FFFFFF',
    success: '#059669',    // emerald-600
    warning: '#D97706',    // amber-600
}

export const FONTS = {
    title: 18,
    subtitle: 14,
    sectionTitle: 12,
    body: 10,
    small: 8,
}

export const PAGE = {
    margin: 50,
    width: 595.28, // A4
    height: 841.89,
    contentWidth: 595.28 - 100, // minus margins
}

/**
 * Create a PDF buffer by calling a builder function with the PDFDocument.
 * Handles stream collection and returns a Promise<Buffer>.
 */
export function createPdfBuffer(
    builder: (doc: PDFKit.PDFDocument) => void,
    options?: { landscape?: boolean }
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            layout: options?.landscape ? 'landscape' : 'portrait',
            margin: PAGE.margin,
            bufferPages: true,
            info: {
                Title: 'Gerenciador de Projetos',
                Author: 'Sistema de Gerenciamento',
            },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        try {
            builder(doc)
        } catch (err) {
            reject(err)
            return
        }

        // Add page numbers to all pages
        const totalPages = doc.bufferedPageRange().count
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i)
            doc.fontSize(FONTS.small)
                .fillColor(COLORS.secondary)
                .text(
                    `Página ${i + 1} de ${totalPages}`,
                    PAGE.margin,
                    PAGE.height - 30,
                    { align: 'center', width: PAGE.contentWidth }
                )
        }

        doc.end()
    })
}

/**
 * Draw a simple table in the PDF document.
 */
export function drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    options?: { columnWidths?: number[]; startY?: number }
) {
    const startY = options?.startY ?? doc.y
    const colWidths = options?.columnWidths ?? headers.map(() => PAGE.contentWidth / headers.length)
    const rowHeight = 22
    const cellPadding = 5
    let y = startY

    // Header row
    doc.fontSize(FONTS.small).fillColor(COLORS.white)
    let x = PAGE.margin
    for (let i = 0; i < headers.length; i++) {
        doc.rect(x, y, colWidths[i], rowHeight).fill(COLORS.primary)
        doc.fillColor(COLORS.white)
            .text(headers[i], x + cellPadding, y + 6, {
                width: colWidths[i] - cellPadding * 2,
                height: rowHeight,
                ellipsis: true,
            })
        x += colWidths[i]
    }
    y += rowHeight

    // Data rows
    for (let r = 0; r < rows.length; r++) {
        if (y + rowHeight > PAGE.height - 60) {
            doc.addPage()
            y = PAGE.margin
        }

        const bgColor = r % 2 === 0 ? COLORS.white : COLORS.lightBg
        x = PAGE.margin
        doc.fontSize(FONTS.small).fillColor(COLORS.text)

        for (let i = 0; i < headers.length; i++) {
            doc.rect(x, y, colWidths[i], rowHeight).fill(bgColor)
            doc.fillColor(COLORS.text)
                .text(rows[r][i] ?? '', x + cellPadding, y + 6, {
                    width: colWidths[i] - cellPadding * 2,
                    height: rowHeight,
                    ellipsis: true,
                })
            x += colWidths[i]
        }
        y += rowHeight
    }

    doc.y = y + 10
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/core.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/pdf/core.ts src/lib/file-processor/pdf/__tests__/core.test.ts
git commit -m "feat: add PDF core helpers (createPdfBuffer, drawTable)"
```

---

### Task 6: TAP PDF Generator

**Files:**
- Create: `src/lib/file-processor/pdf/tap.ts`
- Test: `src/lib/file-processor/pdf/__tests__/tap.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/pdf/__tests__/tap.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        query: {
            projectCharters: { findFirst: vi.fn() },
            projectMilestones: { findMany: vi.fn() },
        },
        select: vi.fn(),
    },
}))

import { generateTapPdf } from '../tap'
import { db } from '@/lib/db'

describe('generateTapPdf', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should generate a valid PDF buffer for a project with charter data', async () => {
        vi.mocked(db.query.projectCharters.findFirst).mockResolvedValue({
            id: 'charter1',
            projectId: 'proj1',
            justification: 'Justificativa do projeto teste',
            smartObjectives: 'Objetivo SMART 1\nObjetivo SMART 2',
            successCriteria: 'Critério 1\nCritério 2',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        vi.mocked(db.query.projectMilestones.findMany).mockResolvedValue([
            { id: 'm1', name: 'Marco 1', expectedDate: new Date('2026-06-01'), phase: 'Execução', projectId: 'proj1', createdAt: new Date(), updatedAt: new Date() },
        ] as any)

        const buffer = await generateTapPdf({
            projectName: 'Projeto Teste',
            orgName: 'SMPO',
            projectId: 'proj1',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })

    it('should handle missing charter gracefully', async () => {
        vi.mocked(db.query.projectCharters.findFirst).mockResolvedValue(null)
        vi.mocked(db.query.projectMilestones.findMany).mockResolvedValue([])

        const buffer = await generateTapPdf({
            projectName: 'Projeto Sem TAP',
            orgName: 'SMPO',
            projectId: 'proj1',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/tap.test.ts`
Expected: FAIL.

**Step 3: Implement TAP generator**

Create `src/lib/file-processor/pdf/tap.ts`:

```typescript
import { db } from '@/lib/db'
import { projectCharters, projectMilestones } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { createPdfBuffer, drawTable, COLORS, FONTS, PAGE } from './core'

interface TapOptions {
    projectName: string
    orgName: string
    projectId: string
}

export async function generateTapPdf(options: TapOptions): Promise<Buffer> {
    const { projectName, orgName, projectId } = options

    const [charter, milestones] = await Promise.all([
        db.query.projectCharters.findFirst({
            where: eq(projectCharters.projectId, projectId),
        }),
        db.query.projectMilestones.findMany({
            where: eq(projectMilestones.projectId, projectId),
        }),
    ])

    return createPdfBuffer((doc) => {
        // Header
        doc.fontSize(FONTS.small)
            .fillColor(COLORS.secondary)
            .text(orgName, { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(FONTS.title)
            .fillColor(COLORS.primary)
            .text('TERMO DE ABERTURA DO PROJETO', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.subtitle)
            .fillColor(COLORS.text)
            .text(projectName, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.small)
            .fillColor(COLORS.secondary)
            .text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })
        doc.moveDown(1.5)

        // Separator
        doc.moveTo(PAGE.margin, doc.y)
            .lineTo(PAGE.margin + PAGE.contentWidth, doc.y)
            .strokeColor(COLORS.border)
            .stroke()
        doc.moveDown(1)

        if (!charter) {
            doc.fontSize(FONTS.body)
                .fillColor(COLORS.secondary)
                .text('Nenhum Termo de Abertura cadastrado para este projeto.', { align: 'center' })
            return
        }

        // Justificativa
        doc.fontSize(FONTS.sectionTitle)
            .fillColor(COLORS.primary)
            .text('1. JUSTIFICATIVA')
        doc.moveDown(0.5)
        doc.fontSize(FONTS.body)
            .fillColor(COLORS.text)
            .text(charter.justification || 'Não informada.')
        doc.moveDown(1)

        // Objetivos SMART
        doc.fontSize(FONTS.sectionTitle)
            .fillColor(COLORS.primary)
            .text('2. OBJETIVOS SMART')
        doc.moveDown(0.5)
        if (charter.smartObjectives) {
            const objectives = charter.smartObjectives.split('\n').filter(Boolean)
            for (const obj of objectives) {
                doc.fontSize(FONTS.body)
                    .fillColor(COLORS.text)
                    .text(`• ${obj.trim()}`, { indent: 10 })
            }
        } else {
            doc.fontSize(FONTS.body)
                .fillColor(COLORS.secondary)
                .text('Não informados.')
        }
        doc.moveDown(1)

        // Critérios de Sucesso
        doc.fontSize(FONTS.sectionTitle)
            .fillColor(COLORS.primary)
            .text('3. CRITÉRIOS DE SUCESSO')
        doc.moveDown(0.5)
        if (charter.successCriteria) {
            const criteria = charter.successCriteria.split('\n').filter(Boolean)
            for (const c of criteria) {
                doc.fontSize(FONTS.body)
                    .fillColor(COLORS.text)
                    .text(`• ${c.trim()}`, { indent: 10 })
            }
        } else {
            doc.fontSize(FONTS.body)
                .fillColor(COLORS.secondary)
                .text('Não informados.')
        }
        doc.moveDown(1)

        // Marcos
        if (milestones.length > 0) {
            doc.fontSize(FONTS.sectionTitle)
                .fillColor(COLORS.primary)
                .text('4. MARCOS DO PROJETO')
            doc.moveDown(0.5)

            drawTable(
                doc,
                ['Marco', 'Data Prevista', 'Fase'],
                milestones.map(m => [
                    m.name,
                    m.expectedDate ? new Date(m.expectedDate).toLocaleDateString('pt-BR') : '',
                    m.phase || '',
                ]),
                { columnWidths: [PAGE.contentWidth * 0.45, PAGE.contentWidth * 0.25, PAGE.contentWidth * 0.3] }
            )
        }
    })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/tap.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/pdf/tap.ts src/lib/file-processor/pdf/__tests__/tap.test.ts
git commit -m "feat: add TAP (Termo de Abertura) PDF generator"
```

---

### Task 7: Project Summary PDF Generator

**Files:**
- Create: `src/lib/file-processor/pdf/summary.ts`
- Test: `src/lib/file-processor/pdf/__tests__/summary.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/pdf/__tests__/summary.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        query: {
            projectPhases: { findMany: vi.fn() },
            stakeholders: { findMany: vi.fn() },
            projectQualityMetrics: { findMany: vi.fn() },
        },
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => ({
                    orderBy: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve([])),
                    })),
                })),
            })),
        })),
    },
}))

import { generateSummaryPdf } from '../summary'
import { db } from '@/lib/db'

describe('generateSummaryPdf', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should generate a valid PDF with project data', async () => {
        vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([
            {
                id: 'p1', name: 'Iniciação', order: 1, projectId: 'proj1', description: null,
                createdAt: new Date(), updatedAt: new Date(),
                tasks: [
                    { id: 't1', status: 'done', title: 'T1', phaseId: 'p1', description: null, assigneeId: null, stakeholderId: null, startDate: null, endDate: null, priority: 'medium', order: 1, createdAt: new Date(), updatedAt: new Date() },
                    { id: 't2', status: 'todo', title: 'T2', phaseId: 'p1', description: null, assigneeId: null, stakeholderId: null, startDate: null, endDate: null, priority: 'medium', order: 2, createdAt: new Date(), updatedAt: new Date() },
                ],
            },
        ] as any)

        vi.mocked(db.query.stakeholders.findMany).mockResolvedValue([
            { id: 's1', name: 'João', role: 'Gerente', level: 'primary', email: '', projectId: 'proj1', createdAt: new Date(), updatedAt: new Date() },
        ] as any)

        vi.mocked(db.query.projectQualityMetrics.findMany).mockResolvedValue([])

        const buffer = await generateSummaryPdf({
            project: { id: 'proj1', name: 'Projeto Teste', type: 'Obra', status: 'em_andamento', description: 'Desc' },
            orgName: 'SMPO',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/summary.test.ts`
Expected: FAIL.

**Step 3: Implement summary generator**

Create `src/lib/file-processor/pdf/summary.ts`:

```typescript
import { db } from '@/lib/db'
import { stakeholders, projectQualityMetrics, auditLogs } from '../../../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { createPdfBuffer, drawTable, COLORS, FONTS, PAGE } from './core'

const STATUS_LABELS: Record<string, string> = {
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
    recorrente: 'Recorrente',
    proposta: 'Proposta',
    planejamento: 'Planejamento',
}

interface SummaryOptions {
    project: {
        id: string
        name: string
        type: string | null
        status: string | null
        description: string | null
    }
    orgName: string
}

export async function generateSummaryPdf(options: SummaryOptions): Promise<Buffer> {
    const { project, orgName } = options

    const [phases, stks, metrics] = await Promise.all([
        db.query.projectPhases.findMany({
            where: (t, { eq }) => eq(t.projectId, project.id),
            with: { tasks: true },
            orderBy: (t, { asc }) => [asc(t.order)],
        }),
        db.query.stakeholders.findMany({
            where: eq(stakeholders.projectId, project.id),
        }),
        db.query.projectQualityMetrics.findMany({
            where: eq(projectQualityMetrics.projectId, project.id),
        }),
    ])

    const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
    const doneTasks = phases.reduce((sum, p) => sum + (p.tasks?.filter((t: any) => t.status === 'done').length || 0), 0)
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    return createPdfBuffer((doc) => {
        // Header
        doc.fontSize(FONTS.small)
            .fillColor(COLORS.secondary)
            .text(orgName, { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(FONTS.title)
            .fillColor(COLORS.primary)
            .text('RELATÓRIO DO PROJETO', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.subtitle)
            .fillColor(COLORS.text)
            .text(project.name, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(FONTS.small)
            .fillColor(COLORS.secondary)
            .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })
        doc.moveDown(1.5)

        // Overview
        doc.fontSize(FONTS.sectionTitle)
            .fillColor(COLORS.primary)
            .text('VISÃO GERAL')
        doc.moveDown(0.5)

        const infoItems = [
            ['Tipo', project.type || 'Projeto'],
            ['Status', STATUS_LABELS[project.status || ''] || project.status || '-'],
            ['Progresso', `${progress}% (${doneTasks}/${totalTasks} tarefas concluídas)`],
        ]
        for (const [label, value] of infoItems) {
            doc.fontSize(FONTS.body)
                .fillColor(COLORS.secondary)
                .text(`${label}: `, { continued: true })
                .fillColor(COLORS.text)
                .text(String(value))
        }

        if (project.description) {
            doc.moveDown(0.3)
            doc.fontSize(FONTS.body)
                .fillColor(COLORS.secondary)
                .text('Descrição: ', { continued: true })
                .fillColor(COLORS.text)
                .text(project.description)
        }
        doc.moveDown(1)

        // Phases
        if (phases.length > 0) {
            doc.fontSize(FONTS.sectionTitle)
                .fillColor(COLORS.primary)
                .text('FASES DO PROJETO')
            doc.moveDown(0.5)

            drawTable(
                doc,
                ['Fase', 'Tarefas', 'Concluídas', 'Progresso'],
                phases.map(p => {
                    const total = p.tasks?.length || 0
                    const done = p.tasks?.filter((t: any) => t.status === 'done').length || 0
                    const pct = total > 0 ? `${Math.round((done / total) * 100)}%` : '-'
                    return [p.name, String(total), String(done), pct]
                }),
                { columnWidths: [PAGE.contentWidth * 0.4, PAGE.contentWidth * 0.2, PAGE.contentWidth * 0.2, PAGE.contentWidth * 0.2] }
            )
            doc.moveDown(0.5)
        }

        // Stakeholders
        if (stks.length > 0) {
            doc.fontSize(FONTS.sectionTitle)
                .fillColor(COLORS.primary)
                .text('PARTES INTERESSADAS')
            doc.moveDown(0.5)

            drawTable(
                doc,
                ['Nome', 'Papel', 'Nível'],
                stks.map(s => [s.name, s.role || '', s.level || '']),
                { columnWidths: [PAGE.contentWidth * 0.4, PAGE.contentWidth * 0.35, PAGE.contentWidth * 0.25] }
            )
            doc.moveDown(0.5)
        }

        // Quality Metrics
        if (metrics.length > 0) {
            doc.fontSize(FONTS.sectionTitle)
                .fillColor(COLORS.primary)
                .text('MÉTRICAS DE QUALIDADE')
            doc.moveDown(0.5)

            drawTable(
                doc,
                ['Métrica', 'Meta', 'Atual'],
                metrics.map(m => [m.name, m.target, m.currentValue]),
                { columnWidths: [PAGE.contentWidth * 0.4, PAGE.contentWidth * 0.3, PAGE.contentWidth * 0.3] }
            )
        }
    })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/pdf/__tests__/summary.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/pdf/summary.ts src/lib/file-processor/pdf/__tests__/summary.test.ts
git commit -m "feat: add project summary PDF generator"
```

---

### Task 8: Import Service (Task + Stakeholder Parsers)

**Files:**
- Create: `src/lib/file-processor/import.ts`
- Test: `src/lib/file-processor/__tests__/import.test.ts`

**Step 1: Write the test**

Create `src/lib/file-processor/__tests__/import.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(() => ({
            values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'new1' }])) })),
        })),
        query: {
            projectPhases: { findMany: vi.fn() },
        },
    },
}))

vi.mock('@/lib/audit-logger', () => ({
    createAuditLog: vi.fn(),
}))

import { parseAndImportTasks, parseAndImportStakeholders, parseExcelOrCsv } from '../import'
import { db } from '@/lib/db'

describe('parseExcelOrCsv', () => {
    it('should parse CSV buffer into rows', async () => {
        const csv = '\uFEFFNome,Email\nJoão,j@t.com\nMaria,m@t.com'
        const buffer = Buffer.from(csv, 'utf-8')

        const rows = await parseExcelOrCsv(buffer, 'test.csv')

        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatchObject({ Nome: 'João', Email: 'j@t.com' })
        expect(rows[1]).toMatchObject({ Nome: 'Maria', Email: 'm@t.com' })
    })
})

describe('parseAndImportTasks', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should import valid task rows', async () => {
        vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([
            { id: 'p1', name: 'Iniciação', projectId: 'proj1', order: 1, description: null, createdAt: new Date(), updatedAt: new Date() },
        ] as any)

        const rows = [
            { Título: 'Task 1', Status: 'todo', Prioridade: 'high', Fase: 'Iniciação' },
            { Título: 'Task 2', Status: 'invalid_status', Prioridade: 'medium' },
        ]

        const result = await parseAndImportTasks(rows, 'proj1', 'user1')

        expect(result.imported).toBe(2)
        expect(result.errors.length).toBe(0) // invalid status defaults to 'todo'
    })

    it('should report error for rows missing required title', async () => {
        vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([])

        const rows = [
            { Título: '', Status: 'todo' },
            { Status: 'todo' },
        ]

        const result = await parseAndImportTasks(rows, 'proj1', 'user1')

        expect(result.imported).toBe(0)
        expect(result.errors.length).toBe(2)
    })
})

describe('parseAndImportStakeholders', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should import valid stakeholder rows', async () => {
        const rows = [
            { Nome: 'João Silva', Papel: 'Gerente', Nível: 'key_stakeholder', Email: 'j@t.com' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj1', 'user1')

        expect(result.imported).toBe(1)
        expect(result.errors).toHaveLength(0)
    })

    it('should reject rows without name', async () => {
        const rows = [
            { Nome: '', Papel: 'Analista' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj1', 'user1')

        expect(result.imported).toBe(0)
        expect(result.errors).toHaveLength(1)
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/file-processor/__tests__/import.test.ts`
Expected: FAIL.

**Step 3: Implement import service**

Create `src/lib/file-processor/import.ts`:

```typescript
import ExcelJS from 'exceljs'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, stakeholders } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'

export interface ImportResult {
    total: number
    imported: number
    errors: { row: number; reason: string }[]
}

type RawRow = Record<string, string | undefined>

/**
 * Parse an uploaded Excel or CSV file into an array of row objects.
 * Uses ExcelJS for both formats.
 */
export async function parseExcelOrCsv(buffer: Buffer, fileName: string): Promise<RawRow[]> {
    const wb = new ExcelJS.Workbook()
    const isCsv = fileName.toLowerCase().endsWith('.csv')

    if (isCsv) {
        // Remove BOM if present
        let text = buffer.toString('utf-8')
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1)
        }
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) return []

        const headers = parseCsvLine(lines[0])
        const rows: RawRow[] = []
        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i])
            const row: RawRow = {}
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] || ''
            }
            rows.push(row)
        }
        return rows
    }

    // Excel
    await wb.xlsx.load(buffer)
    const ws = wb.worksheets[0]
    if (!ws) return []

    const headers: string[] = []
    ws.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '').trim()
    })

    const rows: RawRow[] = []
    for (let r = 2; r <= ws.rowCount; r++) {
        const row: RawRow = {}
        const wsRow = ws.getRow(r)
        let hasData = false
        for (let c = 0; c < headers.length; c++) {
            const val = String(wsRow.getCell(c + 1).value ?? '').trim()
            row[headers[c]] = val
            if (val) hasData = true
        }
        if (hasData) rows.push(row)
    }
    return rows
}

function parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"'
                i++
            } else if (ch === '"') {
                inQuotes = false
            } else {
                current += ch
            }
        } else {
            if (ch === '"') {
                inQuotes = true
            } else if (ch === ',') {
                result.push(current.trim())
                current = ''
            } else {
                current += ch
            }
        }
    }
    result.push(current.trim())
    return result
}

/** Flexible column name matching (case-insensitive, accent-insensitive) */
function findColumn(row: RawRow, ...candidates: string[]): string | undefined {
    const normalize = (s: string) =>
        s.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()

    for (const candidate of candidates) {
        const normalized = normalize(candidate)
        for (const key of Object.keys(row)) {
            if (normalize(key) === normalized) {
                return row[key]
            }
        }
    }
    return undefined
}

const VALID_STATUSES = ['todo', 'in_progress', 'done']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']
const VALID_LEVELS = ['key_stakeholder', 'primary', 'secondary']

function parseDate(val: string | undefined): Date | null {
    if (!val) return null
    // Try DD/MM/YYYY
    const brMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
        const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]))
        if (!isNaN(d.getTime())) return d
    }
    // Try YYYY-MM-DD
    const isoDate = new Date(val)
    if (!isNaN(isoDate.getTime())) return isoDate
    return null
}

export async function parseAndImportTasks(
    rows: RawRow[],
    projectId: string,
    userId: string,
): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, errors: [] }

    // Load existing phases for name matching
    const phases = await db.query.projectPhases.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
    })
    const phaseByName = new Map(phases.map(p => [p.name.toLowerCase(), p.id]))
    const defaultPhaseId = phases[0]?.id

    const validRows: (typeof tasks.$inferInsert)[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const title = findColumn(row, 'Título', 'Title', 'titulo')

        if (!title) {
            result.errors.push({ row: i + 2, reason: 'Título é obrigatório' })
            continue
        }

        const status = findColumn(row, 'Status') || ''
        const priority = findColumn(row, 'Prioridade', 'Priority') || ''
        const phaseName = findColumn(row, 'Fase', 'Phase') || ''

        let phaseId = defaultPhaseId
        if (phaseName) {
            const matchedId = phaseByName.get(phaseName.toLowerCase())
            if (matchedId) phaseId = matchedId
        }

        if (!phaseId) {
            result.errors.push({ row: i + 2, reason: 'Nenhuma fase encontrada no projeto' })
            continue
        }

        validRows.push({
            id: nanoid(),
            phaseId,
            title,
            description: findColumn(row, 'Descrição', 'Description') || null,
            status: VALID_STATUSES.includes(status.toLowerCase()) ? status.toLowerCase() : 'todo',
            priority: VALID_PRIORITIES.includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium',
            startDate: parseDate(findColumn(row, 'Data Início', 'Start Date')),
            endDate: parseDate(findColumn(row, 'Data Fim', 'End Date')),
        })
    }

    if (validRows.length > 0) {
        await db.insert(tasks).values(validRows)
        result.imported = validRows.length

        createAuditLog({
            userId,
            action: 'CREATE',
            resource: 'task',
            resourceId: projectId,
            metadata: JSON.stringify({ type: 'import', count: validRows.length }),
        })
    }

    return result
}

export async function parseAndImportStakeholders(
    rows: RawRow[],
    projectId: string,
    userId: string,
): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, errors: [] }

    const validRows: (typeof stakeholders.$inferInsert)[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name = findColumn(row, 'Nome', 'Name')

        if (!name) {
            result.errors.push({ row: i + 2, reason: 'Nome é obrigatório' })
            continue
        }

        const level = findColumn(row, 'Nível', 'Level') || ''
        const email = findColumn(row, 'Email') || ''

        // Validate email format if provided
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            result.errors.push({ row: i + 2, reason: `Email inválido: ${email}` })
            continue
        }

        validRows.push({
            id: nanoid(),
            projectId,
            name,
            role: findColumn(row, 'Papel', 'Role') || '',
            level: VALID_LEVELS.includes(level.toLowerCase()) ? level.toLowerCase() : 'secondary',
            email: email || null,
        })
    }

    if (validRows.length > 0) {
        await db.insert(stakeholders).values(validRows)
        result.imported = validRows.length

        createAuditLog({
            userId,
            action: 'CREATE',
            resource: 'stakeholder',
            resourceId: projectId,
            metadata: JSON.stringify({ type: 'import', count: validRows.length }),
        })
    }

    return result
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/file-processor/__tests__/import.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/file-processor/import.ts src/lib/file-processor/__tests__/import.test.ts
git commit -m "feat: add import service for tasks and stakeholders"
```

---

### Task 9: Inngest Functions for Export and Import

**Files:**
- Create: `src/lib/inngest/functions/file-processor.ts`
- Modify: `src/pages/api/inngest.ts` (register new functions)

**Step 1: Implement Inngest export/import functions**

Create `src/lib/inngest/functions/file-processor.ts`:

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db'
import { projects, attachments, organizations } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { storage } from '@/lib/storage'
import { emitNotification } from '@/lib/notification'
import { ENTITY_MAPPERS, ENTITY_SHEET_NAMES } from '@/lib/file-processor/mappers'
import { buildExcelWorkbook } from '@/lib/file-processor/excel'
import { buildCsvBuffer } from '@/lib/file-processor/csv'
import { generateTapPdf } from '@/lib/file-processor/pdf/tap'
import { generateSummaryPdf } from '@/lib/file-processor/pdf/summary'
import { parseExcelOrCsv, parseAndImportTasks, parseAndImportStakeholders } from '@/lib/file-processor/import'
import { createAuditLog } from '@/lib/audit-logger'

const handleExport = inngest.createFunction(
    { id: 'file-processor-export', retries: 2 },
    { event: 'file-processor/export' },
    async ({ event }) => {
        const { jobId, entity, projectId, format, userId, organizationId } = event.data

        // Fetch project info
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) throw new Error(`Project ${projectId} not found`)

        let orgName = ''
        if (project.organizationId) {
            const [org] = await db.select({ name: organizations.name })
                .from(organizations)
                .where(eq(organizations.id, project.organizationId))
            orgName = org?.name || ''
        }

        let buffer: Buffer
        let fileName: string
        let contentType: string

        if (format === 'pdf') {
            // PDF documents
            if (entity === 'tap') {
                buffer = await generateTapPdf({ projectName: project.name, orgName, projectId })
                fileName = `TAP-${project.name}.pdf`
            } else if (entity === 'summary') {
                buffer = await generateSummaryPdf({
                    project: { id: project.id, name: project.name, type: project.type, status: project.status, description: project.description },
                    orgName,
                })
                fileName = `Relatorio-${project.name}.pdf`
            } else {
                throw new Error(`PDF export not supported for entity: ${entity}`)
            }
            contentType = 'application/pdf'
        } else {
            // Excel/CSV data exports
            const mapper = ENTITY_MAPPERS[entity]
            if (!mapper) throw new Error(`Unknown entity: ${entity}`)

            const rows = await mapper(projectId)
            const sheetName = ENTITY_SHEET_NAMES[entity] || entity

            if (format === 'xlsx') {
                buffer = await buildExcelWorkbook({ sheetName, projectName: project.name, rows })
                fileName = `${sheetName}-${project.name}.xlsx`
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            } else {
                buffer = buildCsvBuffer(rows)
                fileName = `${sheetName}-${project.name}.csv`
                contentType = 'text/csv'
            }
        }

        // Upload to S3
        const s3Key = `exports/${projectId}/${jobId}-${fileName}`
        await storage.uploadFile(s3Key, buffer, contentType)

        // Create attachment record
        const attachmentId = nanoid()
        await db.insert(attachments).values({
            id: attachmentId,
            fileName,
            fileType: contentType,
            fileSize: buffer.length,
            key: s3Key,
            entityId: projectId,
            entityType: 'export',
            uploadedBy: userId,
        })

        // Audit log
        createAuditLog({
            userId,
            organizationId: organizationId || project.organizationId || undefined,
            action: 'CREATE',
            resource: 'export',
            resourceId: attachmentId,
            metadata: JSON.stringify({ entity, format, fileName }),
        })

        // Notify user
        await emitNotification({
            userId,
            type: 'activity',
            title: 'Exportação concluída',
            message: `O arquivo "${fileName}" está pronto para download.`,
            data: { attachmentId, fileName, type: 'export-ready' },
        })

        return { attachmentId, fileName }
    }
)

const handleImport = inngest.createFunction(
    { id: 'file-processor-import', retries: 1 },
    { event: 'file-processor/import' },
    async ({ event }) => {
        const { jobId, entity, projectId, fileKey, userId, organizationId } = event.data

        // Download file from S3
        const buffer = await storage.downloadFile(fileKey)

        // Determine file type from key
        const fileName = fileKey.split('/').pop() || 'import.csv'

        // Parse file
        const rows = await parseExcelOrCsv(buffer, fileName)

        if (rows.length === 0) {
            await emitNotification({
                userId,
                type: 'activity',
                title: 'Importação sem dados',
                message: 'O arquivo enviado não contém dados para importar.',
                data: { type: 'import-result', entity },
            })
            return { imported: 0, errors: [] }
        }

        let result: { total: number; imported: number; errors: { row: number; reason: string }[] }

        if (entity === 'tasks') {
            result = await parseAndImportTasks(rows, projectId, userId)
        } else if (entity === 'stakeholders') {
            result = await parseAndImportStakeholders(rows, projectId, userId)
        } else {
            throw new Error(`Import not supported for entity: ${entity}`)
        }

        // Build result message
        const parts: string[] = []
        if (result.imported > 0) {
            parts.push(`${result.imported} ${entity === 'tasks' ? 'tarefas importadas' : 'stakeholders importados'}`)
        }
        if (result.errors.length > 0) {
            const errorRows = result.errors.slice(0, 5).map(e => `linha ${e.row}: ${e.reason}`).join('; ')
            parts.push(`${result.errors.length} erros (${errorRows}${result.errors.length > 5 ? '...' : ''})`)
        }

        await emitNotification({
            userId,
            type: 'activity',
            title: result.imported > 0 ? 'Importação concluída' : 'Importação com erros',
            message: parts.join('. ') || 'Nenhum dado importado.',
            data: {
                type: 'import-result',
                entity,
                imported: result.imported,
                errorCount: result.errors.length,
            },
        })

        return result
    }
)

export const fileProcessorFunctions = [handleExport, handleImport]
```

**Step 2: Register functions in Inngest serve**

Open `src/pages/api/inngest.ts` and add:

1. Add import: `import { fileProcessorFunctions } from '@/lib/inngest/functions/file-processor'`
2. Add to `functions` array: `...fileProcessorFunctions`

The `functions` array should become:
```typescript
functions: [...notificationFunctions, ...adminNotificationFunctions, ...imageFunctions, ...fileProcessorFunctions],
```

**Step 3: Verify build**

Run: `npx astro check 2>&1 | grep -c "error"`
Expected: same count as before.

**Step 4: Commit**

```bash
git add src/lib/inngest/functions/file-processor.ts src/pages/api/inngest.ts
git commit -m "feat: add Inngest functions for file export and import"
```

---

### Task 10: API Routes for File Processor

**Files:**
- Create: `src/server/routes/file-processor.ts`
- Modify: `src/server/app.ts` (register route)

**Step 1: Implement the route**

Create `src/server/routes/file-processor.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'
import { inngest } from '@/lib/inngest/client'
import { storage } from '@/lib/storage'
import { ENTITY_MAPPERS, ENTITY_SHEET_NAMES } from '@/lib/file-processor/mappers'
import { buildExcelWorkbook } from '@/lib/file-processor/excel'
import { buildCsvBuffer } from '@/lib/file-processor/csv'
import { generateTapPdf } from '@/lib/file-processor/pdf/tap'
import { generateSummaryPdf } from '@/lib/file-processor/pdf/summary'
import { db } from '@/lib/db'
import { projects, organizations } from '../../../db/schema'
import { eq } from 'drizzle-orm'

const VALID_ENTITIES = [...Object.keys(ENTITY_MAPPERS), 'tap', 'summary']
const VALID_IMPORT_ENTITIES = ['tasks', 'stakeholders']

const app = new Hono<{ Variables: AuthVariables }>()
app.use('*', requireAuth)

/**
 * POST /api/file-processor/export
 * Trigger export job or return file synchronously
 */
app.post('/export',
    zValidator('json', z.object({
        entity: z.string(),
        projectId: z.string(),
        format: z.enum(['xlsx', 'csv', 'pdf']),
        sync: z.boolean().optional().default(false),
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { entity, projectId, format, sync } = c.req.valid('json')

        if (!VALID_ENTITIES.includes(entity)) {
            return c.json({ error: `Invalid entity: ${entity}` }, 400)
        }

        // PDF only for tap/summary
        if (format === 'pdf' && !['tap', 'summary'].includes(entity)) {
            return c.json({ error: 'PDF format only available for tap and summary' }, 400)
        }

        // Excel/CSV not for tap/summary
        if (format !== 'pdf' && ['tap', 'summary'].includes(entity)) {
            return c.json({ error: 'TAP and summary only support PDF format' }, 400)
        }

        const isSuperAdmin = user.globalRole === 'super_admin'
        const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Sync mode: generate and return directly
        if (sync) {
            const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
            if (!project) return c.json({ error: 'Project not found' }, 404)

            let orgName = ''
            if (project.organizationId) {
                const [org] = await db.select({ name: organizations.name })
                    .from(organizations)
                    .where(eq(organizations.id, project.organizationId))
                orgName = org?.name || ''
            }

            let buffer: Buffer
            let fileName: string
            let contentType: string

            if (format === 'pdf') {
                if (entity === 'tap') {
                    buffer = await generateTapPdf({ projectName: project.name, orgName, projectId })
                    fileName = `TAP-${project.name}.pdf`
                } else {
                    buffer = await generateSummaryPdf({
                        project: { id: project.id, name: project.name, type: project.type, status: project.status, description: project.description },
                        orgName,
                    })
                    fileName = `Relatorio-${project.name}.pdf`
                }
                contentType = 'application/pdf'
            } else {
                const mapper = ENTITY_MAPPERS[entity]!
                const rows = await mapper(projectId)
                const sheetName = ENTITY_SHEET_NAMES[entity] || entity

                if (format === 'xlsx') {
                    buffer = await buildExcelWorkbook({ sheetName, projectName: project.name, rows })
                    fileName = `${sheetName}-${project.name}.xlsx`
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                } else {
                    buffer = buildCsvBuffer(rows)
                    fileName = `${sheetName}-${project.name}.csv`
                    contentType = 'text/csv'
                }
            }

            return new Response(buffer, {
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                    'Content-Length': String(buffer.length),
                },
            })
        }

        // Async mode: fire Inngest event
        const jobId = nanoid()
        await inngest.send({
            name: 'file-processor/export',
            data: {
                jobId,
                entity,
                projectId,
                format,
                userId: user.id,
                organizationId: undefined,
            },
        })

        return c.json({ jobId })
    }
)

/**
 * POST /api/file-processor/import
 * Upload file and trigger import job
 */
app.post('/import', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const entity = formData.get('entity') as string | null
    const projectId = formData.get('projectId') as string | null

    if (!file || !entity || !projectId) {
        return c.json({ error: 'Missing required fields: file, entity, projectId' }, 400)
    }

    if (!VALID_IMPORT_ENTITIES.includes(entity)) {
        return c.json({ error: `Import not supported for entity: ${entity}` }, 400)
    }

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    // Viewers cannot import
    if (!isSuperAdmin && membership?.role === 'viewer') {
        return c.json({ error: 'Viewers cannot import data' }, 403)
    }

    // Upload to S3
    const jobId = nanoid()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileKey = `imports/${projectId}/${jobId}-${file.name}`

    await storage.uploadFile(fileKey, buffer, file.type || 'application/octet-stream')

    // Fire Inngest event
    await inngest.send({
        name: 'file-processor/import',
        data: {
            jobId,
            entity,
            projectId,
            fileKey,
            userId: user.id,
            organizationId: undefined,
        },
    })

    return c.json({ jobId })
})

export default app
```

**Step 2: Register route in app.ts**

Open `src/server/app.ts`:

1. Add import: `import fileProcessorRouter from './routes/file-processor'`
2. Add route: `.route('/file-processor', fileProcessorRouter)` to the `apiRoutes` chain.

**Step 3: Verify build**

Run: `npx astro check 2>&1 | grep -c "error"`
Expected: same count as before.

**Step 4: Commit**

```bash
git add src/server/routes/file-processor.ts src/server/app.ts
git commit -m "feat: add file processor API routes (export + import)"
```

---

### Task 11: Export UI — Export Dropdown Component

**Files:**
- Create: `src/components/file-processor/export-dropdown.tsx`

**Step 1: Implement the export dropdown**

Create `src/components/file-processor/export-dropdown.tsx`:

```tsx
import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ExportDropdownProps {
    projectId: string
    entity: string
    /** Additional formats beyond xlsx/csv (e.g. pdf for reports) */
    formats?: ('xlsx' | 'csv' | 'pdf')[]
    /** Label override */
    label?: string
}

export function ExportDropdown({
    projectId,
    entity,
    formats = ['xlsx', 'csv'],
    label = 'Exportar',
}: ExportDropdownProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
        setLoading(format)
        try {
            const res = await fetch('/api/file-processor/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity, projectId, format, sync: true }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }

            // Download the file
            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition') || ''
            const fileNameMatch = disposition.match(/filename="?([^"]+)"?/)
            const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : `export.${format}`

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success('Arquivo exportado com sucesso!')
        } catch (err) {
            toast.error(`Erro ao exportar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        } finally {
            setLoading(null)
        }
    }

    const formatLabels: Record<string, { label: string; icon: typeof FileSpreadsheet }> = {
        xlsx: { label: 'Excel (.xlsx)', icon: FileSpreadsheet },
        csv: { label: 'CSV (.csv)', icon: FileText },
        pdf: { label: 'PDF (.pdf)', icon: FileText },
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!loading} className="cursor-pointer">
                    {loading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4 mr-1" />
                    )}
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {formats.map((format) => {
                    const { label: formatLabel, icon: Icon } = formatLabels[format]
                    return (
                        <DropdownMenuItem
                            key={format}
                            onClick={() => handleExport(format)}
                            disabled={!!loading}
                            className="cursor-pointer"
                        >
                            <Icon className="h-4 w-4 mr-2" />
                            {formatLabel}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
```

**Step 2: Commit**

```bash
git add src/components/file-processor/export-dropdown.tsx
git commit -m "feat: add ExportDropdown component"
```

---

### Task 12: Import UI — Import Dialog Component

**Files:**
- Create: `src/components/file-processor/import-dialog.tsx`

**Step 1: Implement the import dialog**

Create `src/components/file-processor/import-dialog.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ImportDialogProps {
    projectId: string
    entity: 'tasks' | 'stakeholders'
    /** Query keys to invalidate after successful import */
    invalidateKeys: string[][]
    label?: string
}

export function ImportDialog({
    projectId,
    entity,
    invalidateKeys,
    label = 'Importar',
}: ImportDialogProps) {
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0])
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    })

    const handleImport = async () => {
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('entity', entity)
            formData.append('projectId', projectId)

            const res = await fetch('/api/file-processor/import', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
                throw new Error(err.error || `HTTP ${res.status}`)
            }

            toast.success('Arquivo enviado! Processando importação...')
            setOpen(false)
            setFile(null)

            // Invalidate queries after a short delay to let Inngest process
            setTimeout(() => {
                for (const key of invalidateKeys) {
                    queryClient.invalidateQueries({ queryKey: key })
                }
            }, 3000)
        } catch (err) {
            toast.error(`Erro ao importar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFile(null) }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Importar {entity === 'tasks' ? 'Tarefas' : 'Stakeholders'}
                    </DialogTitle>
                </DialogHeader>

                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <div className="flex items-center justify-center gap-2">
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                            <div className="text-left">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Arraste um arquivo .xlsx ou .csv aqui, ou clique para selecionar
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!file || uploading}>
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Importar'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
```

**Step 2: Commit**

```bash
git add src/components/file-processor/import-dialog.tsx
git commit -m "feat: add ImportDialog component with drag-and-drop"
```

---

### Task 13: Integrate Export/Import into Existing Pages

**Files:**
- Modify: `src/components/phases/phase-list.tsx` (add export + import for tasks)
- Modify: `src/components/dashboard/stakeholders.tsx` (add export + import)
- Modify: `src/components/dashboard/project-header.tsx` (add PDF report buttons)

**Step 1: Add export/import to phase-list.tsx**

Open `src/components/phases/phase-list.tsx`. In the header area where the "Expandir/Recolher Tudo" and "Nova Fase" buttons are (around the section with the phase count and controls), add the ExportDropdown and ImportDialog:

1. Add imports at the top:
```typescript
import { ExportDropdown } from '@/components/file-processor/export-dropdown'
import { ImportDialog } from '@/components/file-processor/import-dialog'
```

2. In the header area (alongside existing buttons), add:
```tsx
<ExportDropdown projectId={projectId} entity="tasks" />
{!isViewer && (
    <ImportDialog
        projectId={projectId}
        entity="tasks"
        invalidateKeys={[['phases', projectId]]}
    />
)}
```

Place these buttons alongside the existing "Expandir/Recolher Tudo" button.

**Step 2: Add export/import to stakeholders.tsx**

Open `src/components/dashboard/stakeholders.tsx`. In the `CardHeader` section where the "Adicionar" button lives (around the `{!isViewer && (` block):

1. Add imports at the top:
```typescript
import { ExportDropdown } from '@/components/file-processor/export-dropdown'
import { ImportDialog } from '@/components/file-processor/import-dialog'
```

2. Add alongside the "Adicionar" button, inside the header area:
```tsx
<ExportDropdown projectId={projectId} entity="stakeholders" />
{!isViewer && (
    <ImportDialog
        projectId={projectId}
        entity="stakeholders"
        invalidateKeys={[['stakeholders', projectId]]}
    />
)}
```

**Step 3: Add PDF reports to project-header.tsx**

Open `src/components/dashboard/project-header.tsx`. In the header card, near the edit pencil button area:

1. Add import:
```typescript
import { ExportDropdown } from '@/components/file-processor/export-dropdown'
```

2. Add in the top-right area (near the existing edit button, visible to all users including viewers):
```tsx
<ExportDropdown
    projectId={project.id}
    entity="tap"
    formats={['pdf']}
    label="TAP"
/>
<ExportDropdown
    projectId={project.id}
    entity="summary"
    formats={['pdf']}
    label="Relatório"
/>
```

**Step 4: Verify the build compiles**

Run: `npx astro check 2>&1 | grep -c "error"`
Expected: same count as before.

**Step 5: Commit**

```bash
git add src/components/phases/phase-list.tsx src/components/dashboard/stakeholders.tsx src/components/dashboard/project-header.tsx
git commit -m "feat: integrate export/import buttons into project pages"
```

---

### Task 14: Integration Test — End-to-End Export Flow

**Files:**
- Create: `src/server/routes/__tests__/file-processor.test.ts`

**Step 1: Write integration tests**

Create `src/server/routes/__tests__/file-processor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve([{
                    id: 'proj1',
                    name: 'Projeto Teste',
                    type: 'Obra',
                    status: 'em_andamento',
                    description: 'Desc',
                    organizationId: 'org1',
                    userId: 'user1',
                }])),
            })),
        })),
        query: {
            projectPhases: { findMany: vi.fn(() => Promise.resolve([])) },
            stakeholders: { findMany: vi.fn(() => Promise.resolve([])) },
            projectQualityMetrics: { findMany: vi.fn(() => Promise.resolve([])) },
            projectQualityChecklists: { findMany: vi.fn(() => Promise.resolve([])) },
            projectCommunicationPlans: { findMany: vi.fn(() => Promise.resolve([])) },
            procurementSuppliers: { findMany: vi.fn(() => Promise.resolve([])) },
            procurementContracts: { findMany: vi.fn(() => Promise.resolve([])) },
            projectMilestones: { findMany: vi.fn(() => Promise.resolve([])) },
            projectCharters: { findFirst: vi.fn(() => Promise.resolve(null)) },
        },
        insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    },
}))

vi.mock('@/lib/auth', () => ({
    auth: { api: { getSession: vi.fn() } },
}))

vi.mock('@/lib/queries/scoped', () => ({
    canAccessProject: vi.fn(() => Promise.resolve({ allowed: true, project: { id: 'proj1' }, membership: { role: 'secretario' } })),
}))

vi.mock('@/lib/inngest/client', () => ({
    inngest: { send: vi.fn(() => Promise.resolve()) },
}))

vi.mock('@/lib/audit-logger', () => ({
    createAuditLog: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
    storage: {
        uploadFile: vi.fn(() => Promise.resolve()),
        downloadFile: vi.fn(() => Promise.resolve(Buffer.from(''))),
    },
}))

describe('File Processor API Routes', () => {
    let app: Hono

    beforeEach(async () => {
        vi.clearAllMocks()

        const { auth } = await import('@/lib/auth')
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { id: 'user1', name: 'Test', email: 'test@test.com', globalRole: 'super_admin' },
            session: { id: 'session1' },
        } as any)

        const routeModule = await import('../file-processor')
        app = new Hono()
        app.use('*', async (c, next) => {
            c.set('user' as any, { id: 'user1', name: 'Test', email: 'test@test.com', globalRole: 'super_admin' })
            c.set('session' as any, { id: 'session1' })
            await next()
        })
        app.route('/file-processor', routeModule.default)
    })

    it('should return 400 for invalid entity', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'invalid', projectId: 'proj1', format: 'xlsx', sync: true }),
        })
        expect(res.status).toBe(400)
    })

    it('should return xlsx file for sync export', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'stakeholders', projectId: 'proj1', format: 'xlsx', sync: true }),
        })
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('spreadsheetml')
    })

    it('should return csv file for sync export', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'stakeholders', projectId: 'proj1', format: 'csv', sync: true }),
        })
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('text/csv')
    })

    it('should return pdf for TAP sync export', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'tap', projectId: 'proj1', format: 'pdf', sync: true }),
        })
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('pdf')
    })

    it('should return jobId for async export', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'tasks', projectId: 'proj1', format: 'xlsx' }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('jobId')
    })

    it('should reject PDF for non-document entities', async () => {
        const res = await app.request('/file-processor/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'tasks', projectId: 'proj1', format: 'pdf', sync: true }),
        })
        expect(res.status).toBe(400)
    })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/server/routes/__tests__/file-processor.test.ts`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add src/server/routes/__tests__/file-processor.test.ts
git commit -m "test: add integration tests for file processor API"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Install deps + Inngest events | — | `package.json`, `src/lib/inngest/client.ts` |
| 2 | Excel export service | `src/lib/file-processor/excel.ts` + test | — |
| 3 | CSV export service | `src/lib/file-processor/csv.ts` + test | — |
| 4 | Entity data mappers | `src/lib/file-processor/mappers.ts` + test | — |
| 5 | PDF core helpers | `src/lib/file-processor/pdf/core.ts` + test | — |
| 6 | TAP PDF generator | `src/lib/file-processor/pdf/tap.ts` + test | — |
| 7 | Summary PDF generator | `src/lib/file-processor/pdf/summary.ts` + test | — |
| 8 | Import service | `src/lib/file-processor/import.ts` + test | — |
| 9 | Inngest functions | `src/lib/inngest/functions/file-processor.ts` | `src/pages/api/inngest.ts` |
| 10 | API routes | `src/server/routes/file-processor.ts` | `src/server/app.ts` |
| 11 | Export dropdown component | `src/components/file-processor/export-dropdown.tsx` | — |
| 12 | Import dialog component | `src/components/file-processor/import-dialog.tsx` | — |
| 13 | Integrate into pages | — | `phase-list.tsx`, `stakeholders.tsx`, `project-header.tsx` |
| 14 | Integration tests | `src/server/routes/__tests__/file-processor.test.ts` | — |
