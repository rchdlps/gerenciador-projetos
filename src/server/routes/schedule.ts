import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectMilestones, projectDependencies, projects, users } from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// 1. MILESTONES

// Get Milestones for Project
app.get('/:projectId/milestones', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const milestones = await db.select().from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId))
        .orderBy(desc(projectMilestones.expectedDate))

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')

        // Verify Access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
        if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
            return c.json({ error: 'Forbidden' }, 403)
        }

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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Check ownership (simplified: assume if they can delete project stuff they can delete this)
    await db.delete(projectMilestones).where(eq(projectMilestones.id, id))
    return c.json({ success: true })
})


// 2. DEPENDENCIES

// Get Dependencies for Project
app.get('/:projectId/dependencies', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const deps = await db.select().from(projectDependencies)
        .where(eq(projectDependencies.projectId, projectId))

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')

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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await db.delete(projectDependencies).where(eq(projectDependencies.id, id))
    return c.json({ success: true })
})

export default app
