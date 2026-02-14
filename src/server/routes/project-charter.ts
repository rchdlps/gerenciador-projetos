import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectCharters, projects, users, memberships } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get TAP for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Check if user is a member of the organization
    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const [charter] = await db.select().from(projectCharters).where(eq(projectCharters.projectId, projectId))

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
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')

        // Verify Access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        // Check if user is a member of the organization
        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, project.organizationId!)
            ))

        if ((!user || user.globalRole !== 'super_admin') && project.userId !== user.id && !membership) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Check if exists
        const [existing] = await db.select().from(projectCharters).where(eq(projectCharters.projectId, projectId))

        if (existing) {
            const [updated] = await db.update(projectCharters)
                .set({
                    ...data,
                    updatedAt: new Date()
                })
                .where(eq(projectCharters.id, existing.id))
                .returning()

            // Audit log for UPDATE
            await createAuditLog({
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

            // Audit log for CREATE
            await createAuditLog({
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
