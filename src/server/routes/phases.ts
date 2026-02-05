import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projectPhases, tasks, projects, users, stakeholders } from '../../../db/schema'
import { eq, asc, desc, and } from 'drizzle-orm'
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
            assigneeUser: users,
            assigneeStakeholder: stakeholders
        })
            .from(tasks)
            .leftJoin(users, eq(tasks.assigneeId, users.id))
            .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
            .where(eq(tasks.phaseId, phase.id))
            .orderBy(asc(tasks.order))

        const localTasks = localTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
            let assignee = null
            if (assigneeStakeholder) {
                assignee = {
                    id: assigneeStakeholder.id,
                    name: assigneeStakeholder.name,
                    image: null, // Stakeholders don't have images yet
                    role: assigneeStakeholder.role,
                    type: 'stakeholder'
                }
            } else if (assigneeUser) {
                assignee = {
                    id: assigneeUser.id,
                    name: assigneeUser.name,
                    image: assigneeUser.image,
                    type: 'user'
                }
            }

            return {
                ...task,
                assignee
            }
        })

        return { ...phase, tasks: localTasks }
    }))

    return c.json(fasesWithTasks)
})

// Create Phase
app.post('/:projectId',
    zValidator('json', z.object({
        name: z.string(),
        description: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { name, description } = c.req.valid('json')

        // Check project access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

        if (!project) return c.json({ error: 'Not found' }, 404)

        // Fetch user to get globalRole (session might not have it)
        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
        if (!user) return c.json({ error: 'User not found' }, 401)

        const isOwner = project.userId === session.user.id
        const isSuperAdmin = user.globalRole === 'super_admin'

        if (!isOwner && !isSuperAdmin) return c.json({ error: 'Forbidden' }, 403)

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { items } = c.req.valid('json')

        // Check project access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Not found' }, 404)

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
        if (!user) return c.json({ error: 'User not found' }, 401)

        const isOwner = project.userId === session.user.id
        const isSuperAdmin = user.globalRole === 'super_admin'

        if (!isOwner && !isSuperAdmin) return c.json({ error: 'Forbidden' }, 403)

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const { name, description } = c.req.valid('json')

        // Fetch phase to get projectId
        const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id))
        if (!phase) return c.json({ error: 'Not found' }, 404)

        // Check project access
        const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
        if (!user) return c.json({ error: 'User not found' }, 401)

        const isOwner = project.userId === session.user.id
        const isSuperAdmin = user.globalRole === 'super_admin'

        if (!isOwner && !isSuperAdmin) return c.json({ error: 'Forbidden' }, 403)

        const [updatedPhase] = await db.update(projectPhases)
            .set({ ...(name && { name }), ...(description !== undefined && { description }) })
            .where(eq(projectPhases.id, id))
            .returning()

        return c.json(updatedPhase)
    }
)

// Delete Phase
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Fetch phase to get projectId
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id))
    if (!phase) return c.json({ error: 'Not found' }, 404)

    // Check project access
    const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Fetch user to get globalRole
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
    if (!user) return c.json({ error: 'User not found' }, 401)

    const isOwner = project.userId === session.user.id
    const isSuperAdmin = user.globalRole === 'super_admin'

    if (!isOwner && !isSuperAdmin) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectPhases).where(eq(projectPhases.id, id))
    return c.json({ success: true })
})

export default app
