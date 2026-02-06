import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { knowledgeAreas, projects, users, knowledgeAreaChanges } from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get Knowledge Areas for Project
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const areas = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.projectId, projectId))
    return c.json(areas)
})

// Update/Upsert Knowledge Area
app.put('/:projectId/:area',
    zValidator('json', z.object({ content: z.string() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const area = c.req.param('area')
        const { content } = c.req.valid('json')

        // Verify Access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        // Fetch full user to check role
        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

        if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Check if exists
        const [existing] = await db.select().from(knowledgeAreas).where(
            and(
                eq(knowledgeAreas.projectId, projectId),
                eq(knowledgeAreas.area, area)
            )
        )

        if (existing) {
            const [updated] = await db.update(knowledgeAreas)
                .set({ content, updatedAt: new Date() })
                .where(eq(knowledgeAreas.id, existing.id))
                .returning()
            return c.json(updated)
        } else {
            const [created] = await db.insert(knowledgeAreas).values({
                id: nanoid(),
                projectId,
                area,
                content
            }).returning()
            return c.json(created)
        }
    }
)

// Get Single Knowledge Area with Changes
app.get('/:projectId/:area', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const area = c.req.param('area')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const [ka] = await db.select().from(knowledgeAreas).where(
        and(
            eq(knowledgeAreas.projectId, projectId),
            eq(knowledgeAreas.area, area)
        )
    )

    if (!ka) {
        // Create if doesn't exist to return a valid object
        const [newKa] = await db.insert(knowledgeAreas).values({
            id: nanoid(),
            projectId,
            area,
            content: ""
        }).returning()
        return c.json({ ...newKa, changes: [] })
    }

    const changes = await db.select().from(knowledgeAreaChanges)
        .where(eq(knowledgeAreaChanges.knowledgeAreaId, ka.id))
        .orderBy(desc(knowledgeAreaChanges.date))

    return c.json({ ...ka, changes })
})

// Add Change Control Record
app.post('/:areaId/changes',
    zValidator('json', z.object({
        description: z.string(),
        type: z.string(),
        status: z.string(),
        date: z.string()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const areaId = c.req.param('areaId')
        const data = c.req.valid('json')

        const [created] = await db.insert(knowledgeAreaChanges).values({
            id: nanoid(),
            knowledgeAreaId: areaId,
            description: data.description,
            type: data.type,
            status: data.status,
            date: new Date(data.date)
        }).returning()

        return c.json(created)
    }
)

// Delete Change Record
app.delete('/changes/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await db.delete(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    return c.json({ success: true })
})

export default app
