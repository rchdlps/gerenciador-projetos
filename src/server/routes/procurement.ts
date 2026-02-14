
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
    procurementSuppliers,
    procurementContracts,
    knowledgeAreas,
    projects,
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// GET /api/procurement/:projectId
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    // 1. Fetch Notes (from knowledge_areas)
    const [notesArea] = await db.select().from(knowledgeAreas).where(
        and(
            eq(knowledgeAreas.projectId, projectId),
            eq(knowledgeAreas.area, 'Aquisicoes')
        )
    )

    // 2. Fetch Suppliers
    const suppliers = await db.select().from(procurementSuppliers)
        .where(eq(procurementSuppliers.projectId, projectId))
        .orderBy(desc(procurementSuppliers.createdAt))

    // 3. Fetch Contracts
    const contracts = await db.select().from(procurementContracts)
        .where(eq(procurementContracts.projectId, projectId))
        .orderBy(desc(procurementContracts.createdAt))

    return c.json({
        notes: notesArea?.content || '',
        notesId: notesArea?.id,
        suppliers,
        contracts
    })
})

// PUT /api/procurement/:projectId/notes
app.put('/:projectId/notes',
    zValidator('json', z.object({
        content: z.string()
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { content } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [existingArea] = await db.select().from(knowledgeAreas).where(
            and(
                eq(knowledgeAreas.projectId, projectId),
                eq(knowledgeAreas.area, 'Aquisicoes')
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
                area: 'Aquisicoes',
                content
            })
        }

        return c.json({ success: true })
    }
)

// POST /api/procurement/:projectId/suppliers
app.post('/:projectId/suppliers',
    zValidator('json', z.object({
        name: z.string().min(1),
        itemService: z.string().min(1),
        contact: z.string().min(1)
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const data = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [newItem] = await db.insert(procurementSuppliers).values({
            id: nanoid(),
            projectId,
            ...data
        }).returning()

        return c.json(newItem)
    }
)

// DELETE /api/procurement/suppliers/:id
app.delete('/suppliers/:id', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    const [supplier] = await db.select().from(procurementSuppliers).where(eq(procurementSuppliers.id, id))
    if (!supplier) return c.json({ error: 'Supplier not found' }, 404)

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed } = await canAccessProject(supplier.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(procurementSuppliers).where(eq(procurementSuppliers.id, id))

    return c.json({ success: true })
})

// POST /api/procurement/:projectId/contracts
app.post('/:projectId/contracts',
    zValidator('json', z.object({
        description: z.string().min(1),
        value: z.string().min(1),
        validity: z.string().optional(), // ISO string date
        status: z.string().min(1)
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { validity, ...data } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        const [newItem] = await db.insert(procurementContracts).values({
            id: nanoid(),
            projectId,
            validity: validity ? new Date(validity) : null,
            ...data
        }).returning()

        return c.json(newItem)
    }
)

// DELETE /api/procurement/contracts/:id
app.delete('/contracts/:id', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [contract] = await db.select().from(procurementContracts).where(eq(procurementContracts.id, id))
    if (!contract) return c.json({ error: 'Contract not found' }, 404)

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed } = await canAccessProject(contract.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    await db.delete(procurementContracts).where(eq(procurementContracts.id, id))

    return c.json({ success: true })
})

export default app

