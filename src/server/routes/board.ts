import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { tasks, projectPhases, projects, users, stakeholders, memberships } from '../../../db/schema'
import { eq, asc, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { requireAuth, type AuthVariables } from '../middleware/auth'

import { getBoardData } from '@/lib/queries/board'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get Board Data (Columns + Tasks)
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // Access Scope Check
    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    const columns = await getBoardData(projectId)
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
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const { items } = c.req.valid('json')

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(tasks)
                    .set({
                        status: item.status,
                        order: item.order
                    })
                    .where(eq(tasks.id, item.id))
            }
        })

        return c.json({ success: true })
    }
)

// Move Card (Update Status)
app.patch('/cards/:id/move',
    zValidator('json', z.object({ columnId: z.string() })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)
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
