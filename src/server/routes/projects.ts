import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projects } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

// Middleware to check auth would go here, doing inline for now
const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

app.get('/', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const userProjects = await db.select()
        .from(projects)
        .where(eq(projects.userId, session.user.id))
        .orderBy(desc(projects.updatedAt))

    return c.json(userProjects)
})

app.post('/',
    zValidator('json', z.object({
        name: z.string().min(1),
        description: z.string().optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { name, description } = c.req.valid('json')
        const id = nanoid()

        const [newProject] = await db.insert(projects).values({
            id,
            name,
            description,
            userId: session.user.id
        }).returning()

        return c.json(newProject)
    }
)

app.get('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const [project] = await db.select().from(projects).where(eq(projects.id, id))

    if (!project) return c.json({ error: 'Not found' }, 404)
    if (project.userId !== session.user.id) return c.json({ error: 'Forbidden' }, 403)

    return c.json(project)
})

export default app
