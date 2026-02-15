import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectMilestones, projectDependencies, projects } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// 1. MILESTONES

// Get Milestones for Project
app.get('/:projectId/milestones', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const [access, milestones] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(projectMilestones)
            .where(eq(projectMilestones.projectId, projectId))
            .orderBy(desc(projectMilestones.expectedDate)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(milestones)
})

// Add Milestone
app.post('/:projectId/milestones',
    zValidator('json', z.object({
        name: z.string(),
        expectedDate: z.string(),
        phase: z.string()
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

        const [milestone] = await db.insert(projectMilestones).values({
            id: nanoid(),
            projectId,
            name: data.name,
            expectedDate: new Date(data.expectedDate),
            phase: data.phase
        }).returning()

        return c.json(milestone)
    }
)

// Delete Milestone
app.delete('/milestones/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: milestone → project
    const [row] = await db.select({
        milestoneId: projectMilestones.id,
        projectId: projectMilestones.projectId,
        projectOrgId: projects.organizationId,
        projectUserId: projects.userId,
    })
        .from(projectMilestones)
        .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
        .where(eq(projectMilestones.id, id))

    if (!row) return c.json({ error: 'Milestone not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectMilestones).where(eq(projectMilestones.id, id))
    return c.json({ success: true })
})


// 2. DEPENDENCIES

// Get Dependencies for Project
app.get('/:projectId/dependencies', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const [access, deps] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(projectDependencies)
            .where(eq(projectDependencies.projectId, projectId)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(deps)
})

// Add Dependency
app.post('/:projectId/dependencies',
    zValidator('json', z.object({
        predecessor: z.string(),
        successor: z.string(),
        type: z.string()
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

        const [dependency] = await db.insert(projectDependencies).values({
            id: nanoid(),
            projectId,
            predecessor: data.predecessor,
            successor: data.successor,
            type: data.type
        }).returning()

        return c.json(dependency)
    }
)

// Delete Dependency
app.delete('/dependencies/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: dependency → project
    const [row] = await db.select({
        depId: projectDependencies.id,
        projectId: projectDependencies.projectId,
    })
        .from(projectDependencies)
        .innerJoin(projects, eq(projects.id, projectDependencies.projectId))
        .where(eq(projectDependencies.id, id))

    if (!row) return c.json({ error: 'Dependency not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectDependencies).where(eq(projectDependencies.id, id))
    return c.json({ success: true })
})

export default app
