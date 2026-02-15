import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
    projectCommunicationPlans,
    projectMeetings,
    knowledgeAreas,
    projects
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// GET /api/communication/:projectId
// Fetch all communication data (Notes, Plan, Meetings)
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check + all 3 data queries in parallel
    const [access, notesRows, plan, meetings] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(knowledgeAreas).where(
            and(
                eq(knowledgeAreas.projectId, projectId),
                eq(knowledgeAreas.area, 'Comunicacao')
            )
        ),
        db.select().from(projectCommunicationPlans)
            .where(eq(projectCommunicationPlans.projectId, projectId))
            .orderBy(desc(projectCommunicationPlans.createdAt)),
        db.select().from(projectMeetings)
            .where(eq(projectMeetings.projectId, projectId))
            .orderBy(desc(projectMeetings.date)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    const notesArea = notesRows[0]
    return c.json({
        notes: notesArea?.content || '',
        notesId: notesArea?.id,
        plan,
        meetings
    })
})

// PUT /api/communication/:projectId/notes
app.put('/:projectId/notes',
    zValidator('json', z.object({
        content: z.string()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { content } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

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
app.post('/:projectId/plan',
    zValidator('json', z.object({
        info: z.string().min(1),
        stakeholders: z.string().min(1),
        frequency: z.string().min(1),
        medium: z.string().min(1)
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

        const [newItem] = await db.insert(projectCommunicationPlans).values({
            id: nanoid(),
            projectId,
            ...data
        }).returning()

        return c.json(newItem)
    }
)

// DELETE /api/communication/plan/:id
app.delete('/plan/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: plan item → project
    const [row] = await db.select({
        itemId: projectCommunicationPlans.id,
        projectId: projectCommunicationPlans.projectId,
    })
        .from(projectCommunicationPlans)
        .innerJoin(projects, eq(projects.id, projectCommunicationPlans.projectId))
        .where(eq(projectCommunicationPlans.id, id))

    if (!row) return c.json({ error: 'Item not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectCommunicationPlans).where(eq(projectCommunicationPlans.id, id))
    return c.json({ success: true })
})

// POST /api/communication/:projectId/meeting
app.post('/:projectId/meeting',
    zValidator('json', z.object({
        subject: z.string().min(1),
        date: z.string(),
        decisions: z.string().optional().default('')
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { subject, date, decisions } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

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
app.delete('/meeting/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: meeting → project
    const [row] = await db.select({
        meetingId: projectMeetings.id,
        projectId: projectMeetings.projectId,
    })
        .from(projectMeetings)
        .innerJoin(projects, eq(projects.id, projectMeetings.projectId))
        .where(eq(projectMeetings.id, id))

    if (!row) return c.json({ error: 'Meeting not found' }, 404)

    const { allowed } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(projectMeetings).where(eq(projectMeetings.id, id))
    return c.json({ success: true })
})

export default app
