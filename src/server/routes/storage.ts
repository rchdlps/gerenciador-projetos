import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { attachments, tasks, projectPhases, projects, users, memberships, knowledgeAreas } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { storage } from '@/lib/storage'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Middleware helper
const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Helper to check viewer permission for an entity
async function checkViewerPermission(entityId: string, entityType: string, userId: string): Promise<{ allowed: boolean, error?: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    // Super admins always allowed
    if (user?.globalRole === 'super_admin') {
        return { allowed: true }
    }

    let organizationId: string | null = null

    // Get organization from entity
    if (entityType === 'task') {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, entityId))
        if (task) {
            const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, task.phaseId))
            if (phase) {
                const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
                organizationId = project?.organizationId || null
            }
        }
    } else if (entityType === 'project') {
        const [project] = await db.select().from(projects).where(eq(projects.id, entityId))
        organizationId = project?.organizationId || null
    } else if (entityType === 'knowledge_area') {
        const [ka] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, entityId))
        if (ka) {
            const [project] = await db.select().from(projects).where(eq(projects.id, ka.projectId))
            organizationId = project?.organizationId || null
        }
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

// 1. Get Upload URL
app.post('/presigned-url',
    zValidator('json', z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        entityId: z.string(),
        entityType: z.enum(['task', 'project', 'comment', 'knowledge_area'])
    })),
    async (c) => {
        try {
            const session = await getSession(c)
            if (!session) return c.json({ error: 'Unauthorized' }, 401)

            const { fileName, fileType, entityId, entityType } = c.req.valid('json')

            // Check viewer permission
            const permCheck = await checkViewerPermission(entityId, entityType, session.user.id)
            if (!permCheck.allowed) {
                return c.json({ error: permCheck.error }, 403)
            }

            // Create a unique key: entityType/entityId/random-fileName
            const key = `${entityId}/${nanoid()}-${fileName}`

            console.log(`[Storage] Generating presigned URL for ${key} in bucket region...`)
            const url = await storage.getUploadUrl(key, fileType)
            console.log(`[Storage] Success: ${url}`)

            return c.json({ url, key })
        } catch (error: any) {
            console.error('[Storage Error] Failed to generate presigned URL:', error)
            return c.json({ error: error.message }, 500)
        }
    }
)

// 2. Confirm Upload (Record in DB)
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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const data = c.req.valid('json')

        // Check viewer permission
        const permCheck = await checkViewerPermission(data.entityId, data.entityType, session.user.id)
        if (!permCheck.allowed) {
            return c.json({ error: permCheck.error }, 403)
        }

        const [attachment] = await db.insert(attachments).values({
            id: nanoid(),
            ...data,
            uploadedBy: session.user.id
        }).returning()

        // Audit log for file upload
        await createAuditLog({
            userId: session.user.id,
            organizationId: null, // Files don't have direct org association
            action: 'CREATE',
            resource: 'attachment',
            resourceId: attachment.id,
            metadata: { fileName: data.fileName, fileType: data.fileType, entityType: data.entityType, entityId: data.entityId }
        })

        const signedUrl = await storage.getDownloadUrl(data.key)

        return c.json({ ...attachment, url: signedUrl })
    }
)

// 3. List Attachments
app.get('/:entityId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    const [file] = await db.select().from(attachments).where(eq(attachments.id, id))
    if (!file) return c.json({ error: 'Not found' }, 404)

    // Check ownership or admin (simplified: allow uploader or super_admin)
    // TODO: Implement stricter checks based on Entity ownership (e.g. Project Owner)
    if (file.uploadedBy !== session.user.id && (session.user as any).globalRole !== 'super_admin') {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Delete from S3
    await storage.deleteFile(file.key)

    // Delete from DB
    await db.delete(attachments).where(eq(attachments.id, id))

    // Audit log for file deletion
    await createAuditLog({
        userId: session.user.id,
        organizationId: null,
        action: 'DELETE',
        resource: 'attachment',
        resourceId: id,
        metadata: { fileName: file.fileName, entityType: file.entityType, entityId: file.entityId }
    })

    return c.json({ success: true })
})

export default app
