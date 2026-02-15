import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import {
    projectQualityMetrics,
    projectQualityChecklists,
    projects
} from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// 1. QUALITY METRICS

// Get Metrics for Project
app.get('/:projectId/metrics', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const [access, metrics] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(projectQualityMetrics)
            .where(eq(projectQualityMetrics.projectId, projectId))
            .orderBy(desc(projectQualityMetrics.createdAt)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(metrics)
})

// Add Metric
app.post('/:projectId/metrics',
    zValidator('json', z.object({
        name: z.string(),
        target: z.string(),
        currentValue: z.string()
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

        const [metric] = await db.insert(projectQualityMetrics).values({
            id: nanoid(),
            projectId,
            name: data.name,
            target: data.target,
            currentValue: data.currentValue
        }).returning()

        return c.json(metric)
    }
)

// Delete Metric
app.delete('/metrics/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: metric → project
    const [row] = await db.select({
        metricId: projectQualityMetrics.id,
        projectId: projectQualityMetrics.projectId,
    })
        .from(projectQualityMetrics)
        .innerJoin(projects, eq(projects.id, projectQualityMetrics.projectId))
        .where(eq(projectQualityMetrics.id, id))

    if (!row) return c.json({ error: 'Metric not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectQualityMetrics).where(eq(projectQualityMetrics.id, id))
    return c.json({ success: true })
})


// 2. CHECKLISTS

// Get Checklist for Project
app.get('/:projectId/checklist', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const [access, items] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(projectQualityChecklists)
            .where(eq(projectQualityChecklists.projectId, projectId))
            .orderBy(desc(projectQualityChecklists.createdAt)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(items)
})

// Add Checklist Item
app.post('/:projectId/checklist',
    zValidator('json', z.object({
        item: z.string()
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

        const [newItem] = await db.insert(projectQualityChecklists).values({
            id: nanoid(),
            projectId,
            item: data.item,
            completed: false
        }).returning()

        return c.json(newItem)
    }
)

// Toggle Checklist Item
app.patch('/checklist/:id',
    zValidator('json', z.object({
        completed: z.boolean()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const data = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        // Single join: checklist → project
        const [row] = await db.select({
            checklistId: projectQualityChecklists.id,
            projectId: projectQualityChecklists.projectId,
        })
            .from(projectQualityChecklists)
            .innerJoin(projects, eq(projects.id, projectQualityChecklists.projectId))
            .where(eq(projectQualityChecklists.id, id))

        if (!row) return c.json({ error: 'Checklist not found' }, 404)

        const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [updated] = await db.update(projectQualityChecklists)
            .set({ completed: data.completed, updatedAt: new Date() })
            .where(eq(projectQualityChecklists.id, id))
            .returning()

        return c.json(updated)
    }
)

// Delete Checklist Item
app.delete('/checklist/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: checklist → project
    const [row] = await db.select({
        checklistId: projectQualityChecklists.id,
        projectId: projectQualityChecklists.projectId,
    })
        .from(projectQualityChecklists)
        .innerJoin(projects, eq(projects.id, projectQualityChecklists.projectId))
        .where(eq(projectQualityChecklists.id, id))

    if (!row) return c.json({ error: 'Checklist not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectQualityChecklists).where(eq(projectQualityChecklists.id, id))
    return c.json({ success: true })
})

export default app
