
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectPhases, projects, memberships } from '../../../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

import { getProjectPhases } from '@/lib/queries/phases'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Helper: check write access to a project (project + membership in one parallel batch)
async function checkWriteAccess(
    projectId: string,
    userId: string,
    userGlobalRole: string | null | undefined
) {
    const isSuperAdmin = userGlobalRole === 'super_admin'
    const { allowed, project, membership } = await canAccessProject(projectId, userId, isSuperAdmin)
    return { allowed, project, membership, isSuperAdmin }
}

// Get Phases for a Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and data fetch in parallel
    const [access, fasesWithTasks] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        getProjectPhases(projectId),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(fasesWithTasks)
})

// Create Phase
app.post('/:projectId',
    zValidator('json', z.object({
        name: z.string(),
        description: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { name, description } = c.req.valid('json')

        const { allowed, project } = await checkWriteAccess(projectId, user.id, user.globalRole)
        if (!project) return c.json({ error: 'Not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Get max order
        const [max] = await db.select({ value: projectPhases.order })
            .from(projectPhases)
            .where(eq(projectPhases.projectId, projectId))
            .orderBy(desc(projectPhases.order))
            .limit(1)

        const nextOrder = (max?.value ?? -1) + 1

        const id = nanoid()
        const [newPhase] = await db.insert(projectPhases).values({
            id,
            projectId,
            name,
            description,
            order: nextOrder
        }).returning()

        createAuditLog({
            userId: user.id,
            organizationId: project.organizationId,
            action: 'CREATE',
            resource: 'phase',
            resourceId: id,
            metadata: { name, projectId }
        })

        return c.json(newPhase)
    }
)

// Reorder Phases
app.patch('/:projectId/reorder',
    zValidator('json', z.object({
        items: z.array(z.object({
            id: z.string(),
            order: z.number()
        }))
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { items } = c.req.valid('json')

        const { allowed, project } = await checkWriteAccess(projectId, user.id, user.globalRole)
        if (!project) return c.json({ error: 'Not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Use transaction to update all
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(projectPhases)
                    .set({ order: item.order })
                    .where(and(
                        eq(projectPhases.id, item.id),
                        eq(projectPhases.projectId, projectId)
                    ))
            }
        })

        return c.json({ success: true })
    }
)

// Update Phase (Name/Description)
app.patch('/:id',
    zValidator('json', z.object({
        name: z.string().optional(),
        description: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const { name, description } = c.req.valid('json')

        // Fetch phase → project in a single join
        const [row] = await db.select({
            phase: projectPhases,
            projectOrgId: projects.organizationId,
            projectUserId: projects.userId,
        })
            .from(projectPhases)
            .innerJoin(projects, eq(projects.id, projectPhases.projectId))
            .where(eq(projectPhases.id, id))

        if (!row) return c.json({ error: 'Not found' }, 404)

        const isSuperAdmin = user.globalRole === 'super_admin'
        if (!isSuperAdmin && row.projectUserId !== user.id && row.projectOrgId) {
            const [membership] = await db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, row.projectOrgId)
                ))
            if (!membership) return c.json({ error: 'Forbidden' }, 403)
        }

        const [updatedPhase] = await db.update(projectPhases)
            .set({ ...(name && { name }), ...(description !== undefined && { description }) })
            .where(eq(projectPhases.id, id))
            .returning()

        createAuditLog({
            userId: user.id,
            organizationId: row.projectOrgId,
            action: 'UPDATE',
            resource: 'phase',
            resourceId: id,
            metadata: { name, projectId: row.phase.projectId }
        })

        return c.json(updatedPhase)
    }
)

// Delete Phase
app.delete('/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Fetch phase → project in a single join
    const [row] = await db.select({
        phase: projectPhases,
        projectOrgId: projects.organizationId,
        projectUserId: projects.userId,
    })
        .from(projectPhases)
        .innerJoin(projects, eq(projects.id, projectPhases.projectId))
        .where(eq(projectPhases.id, id))

    if (!row) return c.json({ error: 'Not found' }, 404)

    const isSuperAdmin = user.globalRole === 'super_admin'
    if (!isSuperAdmin && row.projectUserId !== user.id && row.projectOrgId) {
        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, row.projectOrgId)
            ))
        if (!membership) return c.json({ error: 'Forbidden' }, 403)
    }

    await db.delete(projectPhases).where(eq(projectPhases.id, id))

    createAuditLog({
        userId: user.id,
        organizationId: row.projectOrgId,
        action: 'DELETE',
        resource: 'phase',
        resourceId: id,
        metadata: { name: row.phase.name, projectId: row.phase.projectId }
    })

    return c.json({ success: true })
})

export default app
