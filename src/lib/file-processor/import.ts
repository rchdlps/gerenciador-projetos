import ExcelJS from 'exceljs'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, stakeholders, projectPhases } from '../../../db/schema'
import { createAuditLog } from '@/lib/audit-logger'

export type RawRow = Record<string, string | undefined>

const MAX_IMPORT_ROWS = 5000
const BATCH_SIZE = 500

export interface ImportResult {
    total: number
    imported: number
    errors: { row: number; reason: string }[]
}

// ---------------------------------------------------------------------------
// CSV / Excel parsing
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of row objects.
 * Handles BOM, quoted fields with commas and newlines.
 */
function parseCsvString(text: string): RawRow[] {
    // Strip BOM
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
    }

    const rows: string[][] = []
    let current: string[] = []
    let cell = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]

        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    cell += '"'
                    i++ // skip escaped quote
                } else {
                    inQuotes = false
                }
            } else {
                cell += ch
            }
        } else {
            if (ch === '"') {
                inQuotes = true
            } else if (ch === ',') {
                current.push(cell)
                cell = ''
            } else if (ch === '\n') {
                current.push(cell)
                cell = ''
                rows.push(current)
                current = []
            } else if (ch === '\r') {
                // skip \r, the \n will handle row break (or standalone \r)
                if (i + 1 < text.length && text[i + 1] === '\n') {
                    continue
                }
                current.push(cell)
                cell = ''
                rows.push(current)
                current = []
            } else {
                cell += ch
            }
        }
    }

    // Flush last cell/row
    if (cell || current.length > 0) {
        current.push(cell)
        rows.push(current)
    }

    if (rows.length === 0) return []

    const headers = rows[0].map(h => h.trim())
    const result: RawRow[] = []

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i]
        // skip completely empty rows
        if (values.every(v => v.trim() === '')) continue

        const obj: RawRow = {}
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j]?.trim()
        }
        result.push(obj)
    }

    return result
}

/**
 * Parse an Excel or CSV file buffer into an array of row objects.
 * Row 1 = headers, row 2+ = data.
 */
export async function parseExcelOrCsv(buffer: Buffer, fileName: string): Promise<RawRow[]> {
    const ext = fileName.toLowerCase().split('.').pop()

    if (ext === 'csv') {
        const text = buffer.toString('utf-8')
        return parseCsvString(text)
    }

    if (ext === 'xlsx') {
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.worksheets[0]
        if (!ws || ws.rowCount < 2) return []

        const headerRow = ws.getRow(1)
        const headers: string[] = []
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers[colNumber - 1] = String(cell.value ?? '').trim()
        })

        const result: RawRow[] = []
        for (let r = 2; r <= ws.rowCount; r++) {
            const row = ws.getRow(r)
            const obj: RawRow = {}
            let hasValue = false
            headers.forEach((header, idx) => {
                const cell = row.getCell(idx + 1)
                const val = cell.value != null ? String(cell.value).trim() : undefined
                if (val) hasValue = true
                obj[header] = val
            })
            if (hasValue) result.push(obj)
        }

        return result
    }

    throw new Error(`Unsupported file type: .${ext}`)
}

// ---------------------------------------------------------------------------
// Column matching helpers
// ---------------------------------------------------------------------------

/**
 * Normalize text for flexible column matching:
 * lowercase, strip accents, trim.
 */
function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

/**
 * Find a value from a row using flexible column matching.
 * Tries multiple candidate names (case-insensitive, accent-insensitive).
 */
function findColumn(row: RawRow, candidates: string[]): string | undefined {
    const normalizedCandidates = candidates.map(normalize)
    for (const key of Object.keys(row)) {
        const normalizedKey = normalize(key)
        if (normalizedCandidates.includes(normalizedKey)) {
            return row[key]
        }
    }
    return undefined
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function parseDate(val: string | undefined): Date | null {
    if (!val || val.trim() === '') return null

    const trimmed = val.trim()

    // DD/MM/YYYY
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
        const [, day, month, year] = brMatch
        const d = new Date(Number(year), Number(month) - 1, Number(day))
        if (!isNaN(d.getTime())) return d
    }

    // YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
        const [, year, month, day] = isoMatch
        const d = new Date(Number(year), Number(month) - 1, Number(day))
        if (!isNaN(d.getTime())) return d
    }

    return null
}

// ---------------------------------------------------------------------------
// Valid values
// ---------------------------------------------------------------------------

const VALID_STATUSES = ['todo', 'in_progress', 'done']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']
const VALID_LEVELS = ['key_stakeholder', 'primary', 'secondary']

const STATUS_MAP: Record<string, string> = {
    'a fazer': 'todo',
    'todo': 'todo',
    'em andamento': 'in_progress',
    'in_progress': 'in_progress',
    'in progress': 'in_progress',
    'concluido': 'done',
    'concluído': 'done',
    'done': 'done',
}

const PRIORITY_MAP: Record<string, string> = {
    'baixa': 'low',
    'low': 'low',
    'media': 'medium',
    'média': 'medium',
    'medium': 'medium',
    'alta': 'high',
    'high': 'high',
    'urgente': 'urgent',
    'urgent': 'urgent',
}

const LEVEL_MAP: Record<string, string> = {
    'chave': 'key_stakeholder',
    'key_stakeholder': 'key_stakeholder',
    'key': 'key_stakeholder',
    'primario': 'primary',
    'primário': 'primary',
    'primary': 'primary',
    'secundario': 'secondary',
    'secundário': 'secondary',
    'secondary': 'secondary',
}

function resolveStatus(val: string | undefined): string {
    if (!val) return 'todo'
    const mapped = STATUS_MAP[val.toLowerCase().trim()]
    return mapped && VALID_STATUSES.includes(mapped) ? mapped : 'todo'
}

function resolvePriority(val: string | undefined): string {
    if (!val) return 'medium'
    const mapped = PRIORITY_MAP[val.toLowerCase().trim()]
    return mapped && VALID_PRIORITIES.includes(mapped) ? mapped : 'medium'
}

function resolveLevel(val: string | undefined): string {
    if (!val) return 'secondary'
    const mapped = LEVEL_MAP[val.toLowerCase().trim()]
    return mapped && VALID_LEVELS.includes(mapped) ? mapped : 'secondary'
}

// ---------------------------------------------------------------------------
// Task import
// ---------------------------------------------------------------------------

export async function parseAndImportTasks(
    rows: RawRow[],
    projectId: string,
    userId: string,
): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, errors: [] }

    if (rows.length > MAX_IMPORT_ROWS) {
        result.errors.push({ row: 0, reason: `Máximo de ${MAX_IMPORT_ROWS} linhas permitido (recebido: ${rows.length})` })
        return result
    }

    // Fetch existing phases for this project
    const phases = await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId))

    if (phases.length === 0) {
        // No phases at all — every row will error
        for (let i = 0; i < rows.length; i++) {
            result.errors.push({ row: i + 2, reason: 'Nenhuma fase encontrada no projeto' })
        }
        return result
    }

    const defaultPhaseId = phases[0].id
    const phaseMap = new Map(phases.map(p => [normalize(p.name), p.id]))

    const validTasks: {
        id: string
        phaseId: string
        title: string
        description: string | null
        status: string
        priority: string
        startDate: Date | null
        endDate: Date | null
    }[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2 // 1-indexed, row 1 is header

        const title = findColumn(row, ['titulo', 'título', 'title'])
        if (!title || title.trim() === '') {
            result.errors.push({ row: rowNum, reason: 'Título é obrigatório' })
            continue
        }

        const description = findColumn(row, ['descricao', 'descrição', 'description']) || null
        const status = resolveStatus(findColumn(row, ['status']))
        const priority = resolvePriority(findColumn(row, ['prioridade', 'priority']))
        const startDate = parseDate(findColumn(row, ['data inicio', 'data início', 'start date', 'start_date']))
        const endDate = parseDate(findColumn(row, ['data fim', 'end date', 'end_date']))

        const phaseName = findColumn(row, ['fase', 'phase'])
        let phaseId = defaultPhaseId
        if (phaseName && phaseName.trim() !== '') {
            const found = phaseMap.get(normalize(phaseName))
            if (found) {
                phaseId = found
            }
            // If not found, use default phase
        }

        validTasks.push({
            id: nanoid(),
            phaseId,
            title: title.trim(),
            description: description?.trim() || null,
            status,
            priority,
            startDate,
            endDate,
        })
    }

    if (validTasks.length > 0) {
        for (let i = 0; i < validTasks.length; i += BATCH_SIZE) {
            await db.insert(tasks).values(validTasks.slice(i, i + BATCH_SIZE))
        }
        result.imported = validTasks.length

        // Fire-and-forget audit log
        createAuditLog({
            userId,
            action: 'CREATE',
            resource: 'task',
            resourceId: projectId,
            metadata: { bulkImport: true, count: validTasks.length },
        })
    }

    return result
}

// ---------------------------------------------------------------------------
// Stakeholder import
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function parseAndImportStakeholders(
    rows: RawRow[],
    projectId: string,
    userId: string,
): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, errors: [] }

    if (rows.length > MAX_IMPORT_ROWS) {
        result.errors.push({ row: 0, reason: `Máximo de ${MAX_IMPORT_ROWS} linhas permitido (recebido: ${rows.length})` })
        return result
    }

    const validStakeholders: {
        id: string
        projectId: string
        name: string
        role: string
        level: string
        email: string | null
    }[] = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const name = findColumn(row, ['nome', 'name'])
        if (!name || name.trim() === '') {
            result.errors.push({ row: rowNum, reason: 'Nome é obrigatório' })
            continue
        }

        const role = findColumn(row, ['papel', 'role']) || ''
        const level = resolveLevel(findColumn(row, ['nivel', 'nível', 'level']))

        const emailRaw = findColumn(row, ['email', 'e-mail'])
        let email: string | null = null
        if (emailRaw && emailRaw.trim() !== '') {
            if (!EMAIL_REGEX.test(emailRaw.trim())) {
                result.errors.push({ row: rowNum, reason: `Email inválido: ${emailRaw.trim()}` })
                continue
            }
            email = emailRaw.trim()
        }

        validStakeholders.push({
            id: nanoid(),
            projectId,
            name: name.trim(),
            role: role.trim(),
            level,
            email,
        })
    }

    if (validStakeholders.length > 0) {
        for (let i = 0; i < validStakeholders.length; i += BATCH_SIZE) {
            await db.insert(stakeholders).values(validStakeholders.slice(i, i + BATCH_SIZE))
        }
        result.imported = validStakeholders.length

        // Fire-and-forget audit log
        createAuditLog({
            userId,
            action: 'CREATE',
            resource: 'stakeholder',
            resourceId: projectId,
            metadata: { bulkImport: true, count: validStakeholders.length },
        })
    }

    return result
}
