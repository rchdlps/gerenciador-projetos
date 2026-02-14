import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import {
    projectQualityMetrics,
    projectQualityChecklists,
    projects,
    users,
    memberships
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// 1. QUALITY METRICS

// Get Metrics for Project
app.get('/:projectId/metrics', async (c) => {
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

    const metrics = await db.select().from(projectQualityMetrics)
        .where(eq(projectQualityMetrics.projectId, projectId))
        .orderBy(desc(projectQualityMetrics.createdAt))

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')

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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [metric] = await db.select().from(projectQualityMetrics).where(eq(projectQualityMetrics.id, id))
    if (!metric) return c.json({ error: 'Metric not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, metric.projectId))
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

    await db.delete(projectQualityMetrics).where(eq(projectQualityMetrics.id, id))
    return c.json({ success: true })
})


// 2. CHECKLISTS

// Get Checklist for Project
app.get('/:projectId/checklist', async (c) => {
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

    const items = await db.select().from(projectQualityChecklists)
        .where(eq(projectQualityChecklists.projectId, projectId))
        .orderBy(desc(projectQualityChecklists.createdAt))

    return c.json(items)
})

// Add Checklist Item
app.post('/:projectId/checklist',
    zValidator('json', z.object({
        item: z.string()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')

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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')
        const data = c.req.valid('json')

        // Verify Access
        const [checklist] = await db.select().from(projectQualityChecklists).where(eq(projectQualityChecklists.id, id))
        if (!checklist) return c.json({ error: 'Checklist not found' }, 404)

        const [project] = await db.select().from(projects).where(eq(projects.id, checklist.projectId))
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

        const [updated] = await db.update(projectQualityChecklists)
            .set({ completed: data.completed, updatedAt: new Date() })
            .where(eq(projectQualityChecklists.id, id))
            .returning()

        return c.json(updated)
    }
)

// Delete Checklist Item
app.delete('/checklist/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [checklist] = await db.select().from(projectQualityChecklists).where(eq(projectQualityChecklists.id, id))
    if (!checklist) return c.json({ error: 'Checklist not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, checklist.projectId))
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

    await db.delete(projectQualityChecklists).where(eq(projectQualityChecklists.id, id))
    return c.json({ success: true })
})

export default app
