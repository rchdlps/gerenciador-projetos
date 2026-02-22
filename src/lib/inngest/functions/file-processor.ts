import { inngest } from '../client'
import { db } from '@/lib/db'
import { projects, organizations, attachments } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { storage } from '@/lib/storage'
import { createAuditLog } from '@/lib/audit-logger'
import { emitNotification } from '@/lib/notification'
import { ENTITY_MAPPERS, ENTITY_SHEET_NAMES } from '@/lib/file-processor/mappers'
import { buildExcelWorkbook } from '@/lib/file-processor/excel'
import { buildCsvBuffer } from '@/lib/file-processor/csv'
import { generateTapPdf } from '@/lib/file-processor/pdf/tap'
import { generateSummaryPdf } from '@/lib/file-processor/pdf/summary'
import { parseExcelOrCsv, parseAndImportTasks, parseAndImportStakeholders } from '@/lib/file-processor/import'

// ---------------------------------------------------------------------------
// Export handler
// ---------------------------------------------------------------------------

export const handleExport = inngest.createFunction(
    { id: 'file-processor-export', retries: 2 },
    { event: 'file-processor/export' },
    async ({ event }) => {
        const { jobId, entity, projectId, format, userId, organizationId } = event.data

        // Fetch project and org name
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) throw new Error(`Project not found: ${projectId}`)

        let orgName = ''
        if (project.organizationId) {
            const [org] = await db.select().from(organizations).where(eq(organizations.id, project.organizationId))
            orgName = org?.name ?? ''
        }

        let buffer: Buffer
        let fileName: string
        let contentType: string

        if (format === 'pdf') {
            if (entity === 'tap') {
                buffer = await generateTapPdf({
                    projectName: project.name,
                    orgName,
                    projectId,
                })
                fileName = `TAP-${project.name}.pdf`
            } else {
                // summary
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
            // xlsx or csv
            const mapper = ENTITY_MAPPERS[entity]
            if (!mapper) throw new Error(`No mapper for entity: ${entity}`)

            const rows = await mapper(projectId)
            const sheetName = ENTITY_SHEET_NAMES[entity] ?? entity

            if (format === 'xlsx') {
                buffer = await buildExcelWorkbook({
                    sheetName,
                    projectName: project.name,
                    rows,
                })
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
            entityType: 'project',
            uploadedBy: userId,
        })

        // Fire-and-forget audit log
        createAuditLog({
            userId,
            organizationId: organizationId ?? null,
            action: 'CREATE',
            resource: 'attachment',
            resourceId: attachmentId,
            metadata: { export: true, entity, format, fileName, projectId },
        })

        // Notify user
        await emitNotification({
            userId,
            type: 'activity',
            title: 'Exportação concluída',
            message: `O arquivo "${fileName}" está pronto para download.`,
            data: {
                projectId,
                link: `/api/storage/file/${attachmentId}`,
            },
        })

        return { success: true, attachmentId, fileName }
    },
)

// ---------------------------------------------------------------------------
// Import handler
// ---------------------------------------------------------------------------

export const handleImport = inngest.createFunction(
    { id: 'file-processor-import', retries: 1 },
    { event: 'file-processor/import' },
    async ({ event }) => {
        const { entity, projectId, fileKey, userId } = event.data

        // Download file from S3
        const fileBuffer = await storage.downloadFile(fileKey)
        const fileName = fileKey.split('/').pop() ?? 'file'

        // Parse the file
        const rows = await parseExcelOrCsv(fileBuffer, fileName)

        let resultMessage: string

        if (entity === 'tasks') {
            const result = await parseAndImportTasks(rows, projectId, userId)
            resultMessage = `Importação concluída: ${result.imported}/${result.total} tarefas importadas.`
            if (result.errors.length > 0) {
                resultMessage += ` ${result.errors.length} erro(s).`
            }
        } else if (entity === 'stakeholders') {
            const result = await parseAndImportStakeholders(rows, projectId, userId)
            resultMessage = `Importação concluída: ${result.imported}/${result.total} partes interessadas importadas.`
            if (result.errors.length > 0) {
                resultMessage += ` ${result.errors.length} erro(s).`
            }
        } else {
            throw new Error(`Unsupported import entity: ${entity}`)
        }

        // Notify user with result
        await emitNotification({
            userId,
            type: 'activity',
            title: 'Importação concluída',
            message: resultMessage,
            data: {
                projectId,
                link: `/projetos/${projectId}`,
            },
        })

        return { success: true, message: resultMessage }
    },
)

// Export all functions for Inngest serve
export const fileProcessorFunctions = [handleExport, handleImport]
