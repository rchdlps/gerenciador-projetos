import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, projectPhases, projects, users, memberships } from '../../../db/schema'
import { eq, or, isNotNull, and, inArray, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get All Dated Tasks (Global Calendar)
app.get('/dated', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    let tasksQuery;

    // Filter to ensure task has at least one date
    const dateCondition = (t: any) => or(isNotNull(t.startDate), isNotNull(t.endDate))

    if (user && user.globalRole === 'super_admin') {
        tasksQuery = db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            startDate: tasks.startDate,
            endDate: tasks.endDate,
            projectId: projectPhases.projectId,
            projectName: projects.name
        })
            .from(tasks)
            .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
            .innerJoin(projects, eq(projectPhases.projectId, projects.id))
            .where(dateCondition(tasks))
            .orderBy(asc(tasks.endDate))
    } else {
        const userMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, session.user.id))

        const orgIds = userMemberships.map(m => m.orgId)

        if (orgIds.length === 0) return c.json([])

        tasksQuery = db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            startDate: tasks.startDate,
            endDate: tasks.endDate,
            projectId: projectPhases.projectId,
            projectName: projects.name
        })
            .from(tasks)
            .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
            .innerJoin(projects, eq(projectPhases.projectId, projects.id))
            .where(and(
                inArray(projects.organizationId, orgIds),
                dateCondition(tasks)
            ))
            .orderBy(asc(tasks.endDate))
    }

    const results = await tasksQuery
    return c.json(results)
})

// Create Task
app.post('/',
    zValidator('json', z.object({
        phaseId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        assigneeId: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const data = c.req.valid('json')

        // TODO: verify access to phase -> project

        const id = nanoid()
        const [newTask] = await db.insert(tasks).values({
            id,
            phaseId: data.phaseId,
            title: data.title,
            description: data.description,
            assigneeId: data.assigneeId,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            priority: data.priority || 'medium',
            status: data.status || 'todo'
        }).returning()

        return c.json(newTask)
    }
)

// Reorder Tasks
app.patch('/reorder',
    zValidator('json', z.object({
        items: z.array(z.object({
            id: z.string(),
            phaseId: z.string(),
            order: z.number()
        }))
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        // TODO: Validate project access for these tasks

        // Use transaction for atomic updates
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(tasks)
                    .set({
                        phaseId: item.phaseId,
                        order: item.order
                    })
                    .where(eq(tasks.id, item.id))
            }
        })

        return c.json({ success: true })
    }
)

// Update Task
app.patch('/:id',
    zValidator('json', z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        assigneeId: z.string().optional().nullable(),
        priority: z.string().optional(),
        status: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const data = c.req.valid('json')

        const updateData: any = { ...data }
        if (data.startDate) updateData.startDate = new Date(data.startDate)
        if (data.endDate) updateData.endDate = new Date(data.endDate)

        // Fix for nullable dates clearing
        if (data.startDate === null) updateData.startDate = null;
        if (data.endDate === null) updateData.endDate = null;

        const [updatedTask] = await db.update(tasks)
            .set(updateData)
            .where(eq(tasks.id, id))
            .returning()

        return c.json(updatedTask)
    }
)

// Delete Task
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await db.delete(tasks).where(eq(tasks.id, id))
    return c.json({ success: true })
})


// Reorder Tasks
app.patch('/reorder',
    zValidator('json', z.object({
        items: z.array(z.object({
            id: z.string(),
            phaseId: z.string(),
            order: z.number()
        }))
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        // TODO: Validate project access for these tasks

        // Use transaction for atomic updates
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(tasks)
                    .set({
                        phaseId: item.phaseId,
                        order: item.order
                    })
                    .where(eq(tasks.id, item.id))
            }
        })

        return c.json({ success: true })
    }
)

export default app

