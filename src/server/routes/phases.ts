import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectPhases, tasks, projects, users } from '../../../db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get Phases for a Project
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    const phases = await db.select().from(projectPhases)
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(projectPhases.order), asc(projectPhases.createdAt))

    // Fetch tasks for each phase
    const fasesWithTasks = await Promise.all(phases.map(async phase => {
        const localTasksRaw = await db.select({
            task: tasks,
            assignee: users
        })
            .from(tasks)
            .leftJoin(users, eq(tasks.assigneeId, users.id))
            .where(eq(tasks.phaseId, phase.id))
            .orderBy(asc(tasks.order))

        const localTasks = localTasksRaw.map(({ task, assignee }) => ({
            ...task,
            assignee: assignee ? {
                id: assignee.id,
                name: assignee.name,
                image: assignee.image
            } : null
        }))

        return { ...phase, tasks: localTasks }
    }))

    return c.json(fasesWithTasks)
})

// Create Phase
app.post('/:projectId',
    zValidator('json', z.object({ name: z.string() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { name } = c.req.valid('json')

        // Check project access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project || project.userId !== session.user.id) return c.json({ error: 'Forbidden' }, 403)

        const id = nanoid()
        const [newPhase] = await db.insert(projectPhases).values({
            id,
            projectId,
            name,
            order: 0 // TODO: Handle auto-increment order
        }).returning()

        return c.json(newPhase)
    }
)

// Delete Phase
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // TODO: proper permission check on the phase -> project -> user
    await db.delete(projectPhases).where(eq(projectPhases.id, id))
    return c.json({ success: true })
})

export default app
