import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { knowledgeAreas, projects, users, knowledgeAreaChanges, memberships } from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'

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

        // Viewers cannot update knowledge areas
        if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem editar áreas de conhecimento' }, 403)
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

            // Audit log for UPDATE
            await createAuditLog({
                userId: session.user.id,
                organizationId: project.organizationId,
                action: 'UPDATE',
                resource: 'knowledge_area',
                resourceId: existing.id,
                metadata: { area, projectId }
            })

            return c.json(updated)
        } else {
            const [created] = await db.insert(knowledgeAreas).values({
                id: nanoid(),
                projectId,
                area,
                content
            }).returning()

            // Audit log for CREATE
            await createAuditLog({
                userId: session.user.id,
                organizationId: project.organizationId,
                action: 'CREATE',
                resource: 'knowledge_area',
                resourceId: created.id,
                metadata: { area, projectId }
            })

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

        // Audit log for AUTO-CREATE
        await createAuditLog({
            userId: session.user.id,
            organizationId: project.organizationId,
            action: 'CREATE',
            resource: 'knowledge_area',
            resourceId: newKa.id,
            metadata: { area, projectId, method: 'auto-create-on-get' }
        })

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

        // Get knowledge area for project context
        const [ka] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, areaId))
        const [project] = ka ? await db.select().from(projects).where(eq(projects.id, ka.projectId)) : [null]

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

        // Viewers cannot add changes
        if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem adicionar mudanças' }, 403)
        }

        // Audit log
        await createAuditLog({
            userId: session.user.id,
            organizationId: project?.organizationId || null,
            action: 'CREATE',
            resource: 'knowledge_area_change',
            resourceId: created.id,
            metadata: { description: data.description, type: data.type, status: data.status }
        })

        return c.json(created)
    }
)

// Delete Change Record
app.delete('/changes/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Get change record to verify access
    const [change] = await db.select().from(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    if (!change) return c.json({ error: 'Change not found' }, 404)

    const [ka] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, change.knowledgeAreaId))
    if (!ka) return c.json({ error: 'Knowledge area not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, ka.projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    // Check access
    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Viewers cannot delete changes
    if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
        return c.json({ error: 'Visualizadores não podem excluir mudanças' }, 403)
    }

    await db.delete(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    return c.json({ success: true })
})

export default app
