import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { organizations } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'
import { inngest } from '@/lib/inngest/client'
import { storage } from '@/lib/storage'
import { ENTITY_MAPPERS, ENTITY_SHEET_NAMES } from '@/lib/file-processor/mappers'
import { buildExcelWorkbook } from '@/lib/file-processor/excel'
import { buildCsvBuffer } from '@/lib/file-processor/csv'
import { generateTapPdf } from '@/lib/file-processor/pdf/tap'
import { generateSummaryPdf } from '@/lib/file-processor/pdf/summary'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Valid entities for spreadsheet export/import
const SPREADSHEET_ENTITIES = Object.keys(ENTITY_MAPPERS)
// Valid entities for PDF export
const PDF_ENTITIES = ['tap', 'summary']
// All valid entities
const VALID_ENTITIES = [...SPREADSHEET_ENTITIES, ...PDF_ENTITIES]

// ---------------------------------------------------------------------------
// POST /export
// ---------------------------------------------------------------------------

const exportSchema = z.object({
    entity: z.string(),
    projectId: z.string(),
    format: z.enum(['xlsx', 'csv', 'pdf']),
    sync: z.boolean().optional(),
})

app.post('/export', zValidator('json', exportSchema), async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { entity, projectId, format, sync } = c.req.valid('json')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Validate entity
    if (!VALID_ENTITIES.includes(entity)) {
        return c.json({ error: `Entidade inválida: ${entity}` }, 400)
    }

    // Validate format compatibility
    if (format === 'pdf' && !PDF_ENTITIES.includes(entity)) {
        return c.json({ error: 'PDF só está disponível para TAP e Resumo' }, 400)
    }
    if (format !== 'pdf' && PDF_ENTITIES.includes(entity)) {
        return c.json({ error: `${entity} só pode ser exportado como PDF` }, 400)
    }

    // Check project access
    const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed || !project) return c.json({ error: 'Forbidden' }, 403)

    // Get org name for PDF generation
    let orgName = ''
    if (project.organizationId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, project.organizationId))
        orgName = org?.name ?? ''
    }

    // Synchronous export — generate and return file directly
    if (sync) {
        let buffer: Buffer
        let fileName: string
        let contentType: string

        if (format === 'pdf') {
            if (entity === 'tap') {
                buffer = await generateTapPdf({ projectName: project.name, orgName, projectId })
                fileName = `TAP-${project.name}.pdf`
            } else {
                buffer = await generateSummaryPdf({
                    project: {
                        id: project.id,
                        name: project.name,
                        type: project.type ?? '',
                        status: project.status,
                        description: project.description,
                    },
                    orgName,
                })
                fileName = `Resumo-${project.name}.pdf`
            }
            contentType = 'application/pdf'
        } else {
            const mapper = ENTITY_MAPPERS[entity]
            if (!mapper) return c.json({ error: `No mapper for entity: ${entity}` }, 400)

            const rows = await mapper(projectId)
            const sheetName = ENTITY_SHEET_NAMES[entity] ?? entity

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

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'Content-Length': buffer.length.toString(),
            },
        })
    }

    // Async export — fire Inngest event
    const jobId = nanoid()

    await inngest.send({
        name: 'file-processor/export',
        data: {
            jobId,
            entity,
            projectId,
            format,
            userId: user.id,
            organizationId: project.organizationId ?? undefined,
        },
    })

    return c.json({ jobId })
})

// ---------------------------------------------------------------------------
// POST /import
// ---------------------------------------------------------------------------

const IMPORTABLE_ENTITIES = ['tasks', 'stakeholders']
const MAX_IMPORT_SIZE = 10 * 1024 * 1024 // 10 MB

app.post('/import', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.parseBody()
    const file = body['file']
    const entity = body['entity'] as string
    const projectId = body['projectId'] as string

    if (!file || !(file instanceof File)) {
        return c.json({ error: 'Arquivo é obrigatório' }, 400)
    }
    if (!entity || !IMPORTABLE_ENTITIES.includes(entity)) {
        return c.json({ error: `Entidade inválida para importação. Valores válidos: ${IMPORTABLE_ENTITIES.join(', ')}` }, 400)
    }
    if (!projectId) {
        return c.json({ error: 'projectId é obrigatório' }, 400)
    }
    if (file.size > MAX_IMPORT_SIZE) {
        return c.json({ error: `Arquivo muito grande. Tamanho máximo: ${MAX_IMPORT_SIZE / 1024 / 1024} MB` }, 400)
    }

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Check project access
    const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed || !project) return c.json({ error: 'Forbidden' }, 403)

    // Viewers cannot import
    if (!isSuperAdmin && membership?.role === 'viewer') {
        return c.json({ error: 'Visualizadores não podem importar dados' }, 403)
    }

    // Upload raw file to S3
    const jobId = nanoid()
    const fileKey = `imports/${projectId}/${jobId}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await storage.uploadFile(fileKey, buffer, file.type)

    // Fire Inngest event
    await inngest.send({
        name: 'file-processor/import',
        data: {
            jobId,
            entity,
            projectId,
            fileKey,
            userId: user.id,
            organizationId: project.organizationId ?? undefined,
        },
    })

    return c.json({ jobId })
})

export default app
