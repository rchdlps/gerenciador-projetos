import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { knowledgeAreas, projects } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
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
    if (!project || project.userId !== session.user.id) return c.json({ error: 'Forbidden' }, 403)

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
        if (!project || project.userId !== session.user.id) return c.json({ error: 'Forbidden' }, 403)

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

export default app
