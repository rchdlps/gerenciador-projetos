import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectCharters } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get TAP for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and charter fetch in parallel
    const [access, charters] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(projectCharters).where(eq(projectCharters.projectId, projectId)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    const charter = charters[0]
    if (!charter) {
        return c.json({
            justification: "",
            smartObjectives: "",
            successCriteria: ""
        })
    }

    return c.json(charter)
})

// Update/Upsert TAP
app.put('/:projectId',
    zValidator('json', z.object({
        justification: z.string().optional(),
        smartObjectives: z.string().optional(),
        successCriteria: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [existing] = await db.select().from(projectCharters).where(eq(projectCharters.projectId, projectId))

        if (existing) {
            const [updated] = await db.update(projectCharters)
                .set({
                    ...data,
                    updatedAt: new Date()
                })
                .where(eq(projectCharters.id, existing.id))
                .returning()

            createAuditLog({
                userId: user.id,
                organizationId: project.organizationId,
                action: 'UPDATE',
                resource: 'project_charter',
                resourceId: existing.id,
                metadata: { projectId }
            })

            return c.json(updated)
        } else {
            const [created] = await db.insert(projectCharters).values({
                id: nanoid(),
                projectId,
                ...data
            }).returning()

            createAuditLog({
                userId: user.id,
                organizationId: project.organizationId,
                action: 'CREATE',
                resource: 'project_charter',
                resourceId: created.id,
                metadata: { projectId }
            })

            return c.json(created)
        }
    }
)

export default app
