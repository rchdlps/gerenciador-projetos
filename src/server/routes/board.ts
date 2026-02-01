import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { boardColumns, boardCards, projects } from '../../../db/schema'
import { eq, asc, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get Board Data (Columns + Cards)
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== session.user.id) return c.json({ error: 'Forbidden' }, 403)

    const columns = await db.select().from(boardColumns).where(eq(boardColumns.projectId, projectId)).orderBy(asc(boardColumns.order))

    // Fetch cards for each column (could be optimized with a join, but simpler separately for now)
    const columnsWithCards = await Promise.all(columns.map(async col => {
        const cards = await db.select().from(boardCards).where(eq(boardCards.columnId, col.id)).orderBy(asc(boardCards.order))
        return { ...col, cards }
    }))

    return c.json(columnsWithCards)
})

// Add Column
app.post('/:projectId/columns',
    zValidator('json', z.object({ name: z.string() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)
        const projectId = c.req.param('projectId')
        const { name } = c.req.valid('json')

        // Default columns check? For now just insert.
        const id = nanoid()
        const [newCol] = await db.insert(boardColumns).values({
            id, projectId, name
        }).returning()
        return c.json(newCol)
    }
)

// Add Card
app.post('/columns/:columnId/cards',
    zValidator('json', z.object({ content: z.string(), priority: z.string().optional() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)
        const columnId = c.req.param('columnId')
        const { content, priority } = c.req.valid('json')

        const id = nanoid()
        const [newCard] = await db.insert(boardCards).values({
            id, columnId, content, priority: priority || 'medium'
        }).returning()
        return c.json(newCard)
    }
)

app.delete('/cards/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await db.delete(boardCards).where(eq(boardCards.id, id))
    return c.json({ success: true })
})

// Move Card (Update Column)
app.patch('/cards/:id/move',
    zValidator('json', z.object({ columnId: z.string() })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)
        const id = c.req.param('id')
        const { columnId } = c.req.valid('json')

        await db.update(boardCards).set({ columnId }).where(eq(boardCards.id, id))
        return c.json({ success: true })
    }
)

export default app
