import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, client } from '@/lib/db'
import { tasks } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'

import { getBoardData } from '@/lib/queries/board'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get Board Data (Columns + Tasks)
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and board data in parallel
    const [access, columns] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        getBoardData(projectId),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(columns)
})

// Reorder/Move Tasks (Update Status + Order)
app.patch('/reorder',
    zValidator('json', z.object({
        items: z.array(z.object({
            id: z.string(),
            status: z.string(),
            order: z.number()
        }))
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        if (items.length === 0) return c.json({ success: true })

        // Bulk update: single query instead of N sequential updates
        // Uses postgres-js parameterized query to prevent SQL injection
        const ids = items.map(i => i.id)
        const statuses = items.map(i => i.status)
        const orders = items.map(i => i.order)

        await client`
            UPDATE tasks SET
                status = bulk.status,
                "order" = bulk.ord
            FROM unnest(${ids}::text[], ${statuses}::text[], ${orders}::integer[])
                AS bulk(id, status, ord)
            WHERE tasks.id = bulk.id
        `

        return c.json({ success: true })
    }
)

// Move Card (Update Status)
app.patch('/cards/:id/move',
    zValidator('json', z.object({ columnId: z.string() })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)
        const id = c.req.param('id')
        const { columnId } = c.req.valid('json')

        // columnId corresponds to status now
        await db.update(tasks)
            .set({ status: columnId })
            .where(eq(tasks.id, id))

        return c.json({ success: true })
    }
)

export default app
