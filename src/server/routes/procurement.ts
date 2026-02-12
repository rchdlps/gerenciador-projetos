
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
    procurementSuppliers,
    procurementContracts,
    knowledgeAreas,
    users,
    projects,
    memberships
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// GET /api/procurement/:projectId
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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [supplier] = await db.select().from(procurementSuppliers).where(eq(procurementSuppliers.id, id))
    if (!supplier) return c.json({ error: 'Supplier not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, supplier.projectId))
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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const { validity, ...data } = c.req.valid('json')

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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Verify Access
    const [contract] = await db.select().from(procurementContracts).where(eq(procurementContracts.id, id))
    if (!contract) return c.json({ error: 'Contract not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, contract.projectId))
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

    await db.delete(procurementContracts).where(eq(procurementContracts.id, id))

    return c.json({ success: true })
})

export default app

