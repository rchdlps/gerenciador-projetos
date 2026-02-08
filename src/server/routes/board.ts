import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, projectPhases, projects, users, stakeholders, memberships } from '../../../db/schema'
import { eq, asc, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get Board Data (Columns + Tasks)
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    // Check if user is a member of the organization
    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Fetch all phases for the project to get phase IDs (needed for creating tasks if we supported it here)
    // But for now, we just fetch all tasks linked to this project via phases
    // Fetch all tasks linked to this project via phases
    const projectTasksRaw = await db.select({
        task: tasks,
        assigneeUser: users,
        assigneeStakeholder: stakeholders
    })
        .from(tasks)
        .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(tasks.order))

    const projectTasks = projectTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
        let assignee = undefined
        if (assigneeStakeholder) {
            assignee = {
                name: assigneeStakeholder.name,
                image: "" // Stakeholders don't have images yet
            }
        } else if (assigneeUser) {
            assignee = {
                name: assigneeUser.name,
                image: assigneeUser.image || ""
            }
        }

        return {
            id: task.id,
            title: task.title,
            content: task.title,
            status: task.status,
            priority: task.priority,
            order: task.order,
            description: task.description,
            endDate: task.endDate,
            startDate: task.startDate,
            assignee
        }
    })

    // Define fixed columns based on status
    const columns = [
        { id: 'todo', name: 'Não Iniciada', cards: [] as any[] },
        { id: 'in_progress', name: 'Em Andamento', cards: [] as any[] },
        { id: 'review', name: 'Em Revisão', cards: [] as any[] },
        { id: 'done', name: 'Concluída', cards: [] as any[] }
    ]

    // Distribute tasks to columns
    projectTasks.forEach(task => {
        const column = columns.find(c => c.id === task.status)
        if (column) {
            column.cards.push(task)
        } else {
            // Fallback to todo if status matches none (shouldn't happen with strict types)
            columns[0].cards.push(task)
        }
    })

    return c.json(columns)
})

// Reorder/Move Tasks (Update Status + Order)
app.patch('/reorder',
    zValidator('json', z.object({
        items: z.array(z.object({
            id: z.string(),
            status: z.string(),
            order: z.number()
        }))
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(tasks)
                    .set({
                        status: item.status,
                        order: item.order
                    })
                    .where(eq(tasks.id, item.id))
            }
        })

        return c.json({ success: true })
    }
)

// Move Card (Update Status)
app.patch('/cards/:id/move',
    zValidator('json', z.object({ columnId: z.string() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)
        const id = c.req.param('id')
        const { columnId } = c.req.valid('json')

        // columnId corresponds to status now
        await db.update(tasks)
            .set({ status: columnId })
            .where(eq(tasks.id, id))

        return c.json({ success: true })
    }
)

export default app
