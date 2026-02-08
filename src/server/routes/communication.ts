import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
    projectCommunicationPlans,
    projectMeetings,
    knowledgeAreas,
    users,
    memberships,
    projects
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// GET /api/communication/:projectId
// Fetch all communication data (Notes, Plan, Meetings)
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

    // 1. Fetch Notes (from knowledge_areas)
    const [notesArea] = await db.select().from(knowledgeAreas).where(
        and(
            eq(knowledgeAreas.projectId, projectId),
            eq(knowledgeAreas.area, 'Comunicacao')
        )
    )

    // 2. Fetch Communication Plan
    const plan = await db.select().from(projectCommunicationPlans)
        .where(eq(projectCommunicationPlans.projectId, projectId))
        .orderBy(desc(projectCommunicationPlans.createdAt))

    // 3. Fetch Meetings
    const meetings = await db.select().from(projectMeetings)
        .where(eq(projectMeetings.projectId, projectId))
        .orderBy(desc(projectMeetings.date))

    return c.json({
        notes: notesArea?.content || '',
        notesId: notesArea?.id,
        plan,
        meetings
    })
})

// PUT /api/communication/:projectId/notes
// Update General Notes
app.put('/:projectId/notes',
    zValidator('json', z.object({
        content: z.string()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { content } = c.req.valid('json')

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

        const [existingArea] = await db.select().from(knowledgeAreas).where(
            and(
                eq(knowledgeAreas.projectId, projectId),
                eq(knowledgeAreas.area, 'Comunicacao')
            )
        )

        if (existingArea) {
            await db.update(knowledgeAreas)
                .set({ content, updatedAt: new Date() })
                .where(eq(knowledgeAreas.id, existingArea.id))
        } else {
            await db.insert(knowledgeAreas).values({
                id: nanoid(),
                projectId,
                area: 'Comunicacao',
                content
            })
        }

        return c.json({ success: true })
    }
)

// POST /api/communication/:projectId/plan
// Add Plan Item
app.post('/:projectId/plan',
    zValidator('json', z.object({
        info: z.string().min(1),
        stakeholders: z.string().min(1),
        frequency: z.string().min(1),
        medium: z.string().min(1)
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

        const [newItem] = await db.insert(projectCommunicationPlans).values({
            id: nanoid(),
            projectId,
            ...data
        }).returning()

        return c.json(newItem)
    }
)

// DELETE /api/communication/plan/:id
// Delete Plan Item
app.delete('/plan/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [item] = await db.select().from(projectCommunicationPlans).where(eq(projectCommunicationPlans.id, id))
    if (!item) return c.json({ error: 'Item not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, item.projectId))
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

    await db.delete(projectCommunicationPlans).where(eq(projectCommunicationPlans.id, id))

    return c.json({ success: true })
})

// POST /api/communication/:projectId/meeting
// Add Meeting
app.post('/:projectId/meeting',
    zValidator('json', z.object({
        subject: z.string().min(1),
        date: z.string(), // ISO string from frontend
        decisions: z.string().optional().default('')
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { subject, date, decisions } = c.req.valid('json')

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

        const [newMeeting] = await db.insert(projectMeetings).values({
            id: nanoid(),
            projectId,
            subject,
            date: new Date(date),
            decisions
        }).returning()

        return c.json(newMeeting)
    }
)

// DELETE /api/communication/meeting/:id
// Delete Meeting
app.delete('/meeting/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [meeting] = await db.select().from(projectMeetings).where(eq(projectMeetings.id, id))
    if (!meeting) return c.json({ error: 'Meeting not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, meeting.projectId))
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

    await db.delete(projectMeetings).where(eq(projectMeetings.id, id))

    return c.json({ success: true })
})

export default app
