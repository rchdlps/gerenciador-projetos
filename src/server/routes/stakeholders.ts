import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { stakeholders, projects } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { getProjectStakeholders } from '@/lib/queries/stakeholders'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get stakeholders for a project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Access Scope Check
    const isSuperAdmin = user.globalRole === 'super_admin'

    const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    const projectStakeholders = await getProjectStakeholders(projectId)
    return c.json(projectStakeholders)
})

app.post('/:projectId',
    zValidator('json', z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        level: z.string().min(1),
        email: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { name, role, level, email } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'
        const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const id = nanoid()
        const [newStakeholder] = await db.insert(stakeholders).values({
            id,
            projectId,
            name,
            role,
            level,
            email
        }).returning()

        // Audit log
        await createAuditLog({
            userId: user.id,
            organizationId: project.organizationId,
            action: 'CREATE',
            resource: 'stakeholder',
            resourceId: id,
            metadata: { name, role, level, projectId }
        })

        return c.json(newStakeholder)
    }
)

app.put('/:id',
    zValidator('json', z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        level: z.string().min(1),
        email: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const { name, role, level, email } = c.req.valid('json')

        // Verify ownership
        const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id))
        if (!stakeholder) return c.json({ error: 'Not found' }, 404)

        const isSuperAdmin = user.globalRole === 'super_admin'
        const { allowed, project } = await canAccessProject(stakeholder.projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [updated] = await db.update(stakeholders)
            .set({ name, role, level, email })
            .where(eq(stakeholders.id, id))
            .returning()

        // Audit log
        await createAuditLog({
            userId: user.id,
            organizationId: project.organizationId,
            action: 'UPDATE',
            resource: 'stakeholder',
            resourceId: id,
            metadata: { name, role, level }
        })

        return c.json(updated)
    }
)

app.delete('/:id', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id))
    if (!stakeholder) return c.json({ error: 'Not found' }, 404)

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed, project } = await canAccessProject(stakeholder.projectId, user.id, isSuperAdmin)
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(stakeholders).where(eq(stakeholders.id, id))

    // Audit log
    await createAuditLog({
        userId: user.id,
        organizationId: project.organizationId,
        action: 'DELETE',
        resource: 'stakeholder',
        resourceId: id,
        metadata: { name: stakeholder.name, projectId: project.id }
    })

    return c.json({ success: true })
})

export default app
