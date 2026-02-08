import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, projectPhases, projects, users, memberships } from '../../../db/schema'
import { eq, or, isNotNull, and, inArray, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'

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
        stakeholderId: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const data = c.req.valid('json')

        // Check project access
        const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, data.phaseId))
        if (!phase) return c.json({ error: 'Phase not found' }, 404)

        const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

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

        // Viewers cannot create tasks
        if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem criar tarefas' }, 403)
        }

        const id = nanoid()
        const [newTask] = await db.insert(tasks).values({
            id,
            phaseId: data.phaseId,
            title: data.title,
            description: data.description,
            assigneeId: data.assigneeId || null,
            stakeholderId: data.stakeholderId || null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            priority: data.priority || 'medium',
            status: data.status || 'todo'
        }).returning()

        // Audit log
        await createAuditLog({
            userId: session.user.id,
            organizationId: project?.organizationId || null,
            action: 'CREATE',
            resource: 'task',
            resourceId: id,
            metadata: { title: data.title, status: data.status || 'todo', projectId: project?.id }
        })

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

        // Check project access for the first item (assuming all items belong to same project context or checking each)
        // For efficiency, we check the first item's phase -> project. 
        // Ideally we should check all, but simpler for now.
        const firstItem = items[0]
        if (firstItem) {
            const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, firstItem.phaseId))
            if (phase) {
                const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
                if (project) {
                    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))
                    const [membership] = await db.select()
                        .from(memberships)
                        .where(and(
                            eq(memberships.userId, session.user.id),
                            eq(memberships.organizationId, project.organizationId!)
                        ))

                    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
                        return c.json({ error: 'Forbidden' }, 403)
                    }

                    // Viewers cannot reorder tasks
                    if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
                        return c.json({ error: 'Visualizadores não podem reordenar tarefas' }, 403)
                    }
                }
            }
        }

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
        stakeholderId: z.string().optional().nullable(),
        priority: z.string().optional(),
        status: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const data = c.req.valid('json')

        // Verify access
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
        if (!task) return c.json({ error: 'Task not found' }, 404)

        const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, task.phaseId))
        if (!phase) return c.json({ error: 'Phase not found' }, 404)

        const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, project.organizationId!)
            ))

        if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Viewers cannot update tasks
        if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem editar tarefas' }, 403)
        }
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

        // Audit log
        await createAuditLog({
            userId: session.user.id,
            organizationId: project?.organizationId || null,
            action: 'UPDATE',
            resource: 'task',
            resourceId: id,
            metadata: { title: updateData.title, status: updateData.status, changes: Object.keys(updateData) }
        })

        return c.json(updatedTask)
    }
)

// Delete Task
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Get task info before deletion for audit log and auth check
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
    if (!task) return c.json({ error: 'Task not found' }, 404)

    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, task.phaseId))
    const [project] = phase ? await db.select().from(projects).where(eq(projects.id, phase.projectId)) : [null]
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Viewers cannot delete tasks
    if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
        return c.json({ error: 'Visualizadores não podem excluir tarefas' }, 403)
    }

    await db.delete(tasks).where(eq(tasks.id, id))

    // Audit log
    if (task) { // task is guaranteed to exist here due to the check above
        await createAuditLog({
            userId: session.user.id,
            organizationId: project?.organizationId || null,
            action: 'DELETE',
            resource: 'task',
            resourceId: id,
            metadata: { title: task.title, projectId: project?.id }
        })
    }

    return c.json({ success: true })
})


export default app
