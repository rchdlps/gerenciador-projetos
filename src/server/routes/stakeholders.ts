import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { stakeholders, projects, users } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get stakeholders for a project
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify project ownership (optional but strict)
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const projectStakeholders = await db.select()
        .from(stakeholders)
        .where(eq(stakeholders.projectId, projectId))

    return c.json(projectStakeholders)
})

app.post('/:projectId',
    zValidator('json', z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        level: z.string().min(1),
        email: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { name, role, level, email } = c.req.valid('json')

        // Verify project ownership
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        // Fetch full user to check role
        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

        if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const id = nanoid()
        const [newStakeholder] = await db.insert(stakeholders).values({
            id,
            projectId,
            name,
            role,
            level,
            email
        }).returning()

        return c.json(newStakeholder)
    }
)

app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify ownership via join or two steps. Two steps is easier to read here.
    const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id))
    if (!stakeholder) return c.json({ error: 'Not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, stakeholder.projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    await db.delete(stakeholders).where(eq(stakeholders.id, id))
    return c.json({ success: true })
})

export default app
