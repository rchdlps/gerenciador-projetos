import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { attachments, tasks, projectPhases, projects, users, memberships, knowledgeAreas } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { storage } from '@/lib/storage'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)



// Helper to check viewer permission for an entity
async function checkViewerPermission(entityId: string, entityType: string, userId: string): Promise<{ allowed: boolean, error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    // Super admins always allowed
    if (user?.globalRole === 'super_admin') {
        return { allowed: true }
    }

    let organizationId: string | null = null

    // Get organization from entity — use joins to avoid sequential queries
    if (entityType === 'task') {
        const [row] = await db.select({ orgId: projects.organizationId })
            .from(tasks)
            .innerJoin(projectPhases, eq(projectPhases.id, tasks.phaseId))
            .innerJoin(projects, eq(projects.id, projectPhases.projectId))
            .where(eq(tasks.id, entityId))
        organizationId = row?.orgId || null
    } else if (entityType === 'project') {
        const [project] = await db.select({ orgId: projects.organizationId })
            .from(projects)
            .where(eq(projects.id, entityId))
        organizationId = project?.orgId || null
    } else if (entityType === 'knowledge_area') {
        const [row] = await db.select({ orgId: projects.organizationId })
            .from(knowledgeAreas)
            .innerJoin(projects, eq(projects.id, knowledgeAreas.projectId))
            .where(eq(knowledgeAreas.id, entityId))
        organizationId = row?.orgId || null
    }

    if (!organizationId) {
        return { allowed: true } // Can't determine org, allow (fallback)
    }

    // Check membership role
    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, userId),
            eq(memberships.organizationId, organizationId)
        ))

    if (membership && membership.role === 'viewer') {
        return { allowed: false, error: 'Visualizadores não podem enviar arquivos' }
    }

    return { allowed: true }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// Upload file (server-proxied)
app.post('/upload', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    try {
        const body = await c.req.parseBody()
        const file = body['file']
        const entityId = body['entityId'] as string
        const entityType = body['entityType'] as string

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'Missing file' }, 400)
        }

        if (!entityId || !entityType) {
            return c.json({ error: 'Missing entityId or entityType' }, 400)
        }

        const validTypes = ['task', 'project', 'comment', 'knowledge_area']
        if (!validTypes.includes(entityType)) {
            return c.json({ error: 'Invalid entityType' }, 400)
        }

        if (file.size > MAX_FILE_SIZE) {
            return c.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` }, 400)
        }

        // Check viewer permission
        const permCheck = await checkViewerPermission(entityId, entityType, user.id)
        if (!permCheck.allowed) {
            return c.json({ error: permCheck.error }, 403)
        }

        const key = `${entityId}/${nanoid()}-${file.name}`
        const buffer = Buffer.from(await file.arrayBuffer())

        await storage.uploadFile(key, buffer, file.type, file.size)

        const [attachment] = await db.insert(attachments).values({
            id: nanoid(),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            key,
            entityId,
            entityType: entityType as 'task' | 'project' | 'comment' | 'knowledge_area',
            uploadedBy: user.id,
        }).returning()

        createAuditLog({
            userId: user.id,
            organizationId: null,
            action: 'CREATE',
            resource: 'attachment',
            resourceId: attachment.id,
            metadata: { fileName: file.name, fileType: file.type, entityType, entityId },
        })

        const signedUrl = await storage.getDownloadUrl(key)

        return c.json({ ...attachment, url: signedUrl })
    } catch (error: any) {
        console.error('[Storage Error] Upload failed:', error)
        return c.json({ error: error.message || 'Upload failed' }, 500)
    }
})

// 1. Get Upload URL (DEPRECATED)
app.post('/presigned-url',
    zValidator('json', z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        entityId: z.string(),
        entityType: z.enum(['task', 'project', 'comment', 'knowledge_area'])
    })),
    async (c) => {
        console.warn('[Storage] DEPRECATED: POST /presigned-url — use POST /upload instead')
        return c.json({ error: 'This endpoint is deprecated. Use POST /upload with multipart/form-data instead.' }, 410)
    }
)

// 2. Confirm Upload (DEPRECATED)
app.post('/confirm',
    zValidator('json', z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        key: z.string(),
        entityId: z.string(),
        entityType: z.enum(['task', 'project', 'comment', 'knowledge_area'])
    })),
    async (c) => {
        console.warn('[Storage] DEPRECATED: POST /confirm — use POST /upload instead')
        return c.json({ error: 'This endpoint is deprecated. Use POST /upload with multipart/form-data instead.' }, 410)
    }
)

// 3. List Attachments
app.get('/:entityId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const entityId = c.req.param('entityId')

    const files = await db.select().from(attachments).where(eq(attachments.entityId, entityId))

    // Generate fresh signed URLs for all files
    const filesWithUrls = await Promise.all(files.map(async (file) => {
        const url = await storage.getDownloadUrl(file.key)
        return { ...file, url }
    }))

    return c.json(filesWithUrls)
})

// 4. Delete Attachment
app.delete('/:id', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    const [file] = await db.select().from(attachments).where(eq(attachments.id, id))
    if (!file) return c.json({ error: 'Not found' }, 404)

    // Check ownership or admin (simplified: allow uploader or super_admin)
    // TODO: Implement stricter checks based on Entity ownership (e.g. Project Owner)
    if (file.uploadedBy !== user.id && user.globalRole !== 'super_admin') {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Delete from S3 and DB in parallel; audit log is non-blocking
    await Promise.all([
        storage.deleteFile(file.key),
        db.delete(attachments).where(eq(attachments.id, id)),
    ])

    createAuditLog({
        userId: user.id,
        organizationId: null,
        action: 'DELETE',
        resource: 'attachment',
        resourceId: id,
        metadata: { fileName: file.fileName, entityType: file.entityType, entityId: file.entityId }
    })

    return c.json({ success: true })
})

export default app
