import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, projectPhases, projects, memberships } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { getDatedTasks } from '@/lib/queries/tasks'
import { getScopedOrgIds, canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Helper: get project access from a phaseId using a single join
async function getProjectAccessFromPhase(phaseId: string, userId: string, globalRole: string | null | undefined) {
    const [row] = await db.select({
        phaseId: projectPhases.id,
        projectId: projectPhases.projectId,
        projectOrgId: projects.organizationId,
        projectUserId: projects.userId,
    })
        .from(projectPhases)
        .innerJoin(projects, eq(projects.id, projectPhases.projectId))
        .where(eq(projectPhases.id, phaseId))

    if (!row) return { found: false as const }

    const isSuperAdmin = globalRole === 'super_admin'
    const { allowed, membership } = await canAccessProject(row.projectId, userId, isSuperAdmin)

    return { found: true as const, row, allowed, membership, isSuperAdmin }
}

// Helper: get project access from a taskId using a double join
async function getProjectAccessFromTask(taskId: string, userId: string, globalRole: string | null | undefined) {
    const [row] = await db.select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        projectId: projects.id,
        projectOrgId: projects.organizationId,
        projectUserId: projects.userId,
    })
        .from(tasks)
        .innerJoin(projectPhases, eq(projectPhases.id, tasks.phaseId))
        .innerJoin(projects, eq(projects.id, projectPhases.projectId))
        .where(eq(tasks.id, taskId))

    if (!row) return { found: false as const }

    const isSuperAdmin = globalRole === 'super_admin'
    const { allowed, membership } = await canAccessProject(row.projectId, userId, isSuperAdmin)

    return { found: true as const, row, allowed, membership, isSuperAdmin }
}

// Get All Dated Tasks (Global Calendar)
app.get('/dated', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Get active org from middleware-cached value
    const activeOrgId = c.get('activeOrgId')

    const orgIds = await getScopedOrgIds(user.id, activeOrgId, isSuperAdmin)
    const results = await getDatedTasks(orgIds)

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
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const data = c.req.valid('json')

        const access = await getProjectAccessFromPhase(data.phaseId, user.id, user.globalRole)
        if (!access.found) return c.json({ error: 'Phase not found' }, 404)
        if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot create tasks
        if (access.membership?.role === 'viewer' && !access.isSuperAdmin) {
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

        createAuditLog({
            userId: user.id,
            organizationId: access.row.projectOrgId,
            action: 'CREATE',
            resource: 'task',
            resourceId: id,
            metadata: { title: data.title, status: data.status || 'todo', projectId: access.row.projectId }
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
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        // Check project access for the first item (all items belong to same project)
        const firstItem = items[0]
        if (firstItem) {
            const access = await getProjectAccessFromPhase(firstItem.phaseId, user.id, user.globalRole)
            if (access.found) {
                if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)
                if (access.membership?.role === 'viewer' && !access.isSuperAdmin) {
                    return c.json({ error: 'Visualizadores não podem reordenar tarefas' }, 403)
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
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const data = c.req.valid('json')

        // Single double-join: task → phase → project
        const access = await getProjectAccessFromTask(id, user.id, user.globalRole)
        if (!access.found) return c.json({ error: 'Task not found' }, 404)
        if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot update tasks
        if (access.membership?.role === 'viewer' && !access.isSuperAdmin) {
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

        createAuditLog({
            userId: user.id,
            organizationId: access.row.projectOrgId,
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
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Single double-join: task → phase → project
    const access = await getProjectAccessFromTask(id, user.id, user.globalRole)
    if (!access.found) return c.json({ error: 'Task not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    // Viewers cannot delete tasks
    if (access.membership?.role === 'viewer' && !access.isSuperAdmin) {
        return c.json({ error: 'Visualizadores não podem excluir tarefas' }, 403)
    }

    await db.delete(tasks).where(eq(tasks.id, id))

    createAuditLog({
        userId: user.id,
        organizationId: access.row.projectOrgId,
        action: 'DELETE',
        resource: 'task',
        resourceId: id,
        metadata: { title: access.row.taskTitle, projectId: access.row.projectId }
    })

    return c.json({ success: true })
})


export default app
