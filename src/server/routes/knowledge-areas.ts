import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { knowledgeAreas, projects, knowledgeAreaChanges, memberships } from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Get Knowledge Areas for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const { allowed } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    const areas = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.projectId, projectId))
    return c.json(areas)
})

// Update/Upsert Knowledge Area
app.put('/:projectId/:area',
    zValidator('json', z.object({ content: z.string() })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const area = c.req.param('area')
        const { content } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot update knowledge areas
        if (membership?.role === 'viewer' && !isSuperAdmin) {
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
                userId: user.id,
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
                userId: user.id,
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

// PATCH route (alias for PUT - used by risk-view and other components)
app.patch('/:projectId/:area',
    zValidator('json', z.object({ content: z.string() })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const projectId = c.req.param('projectId')
        const area = c.req.param('area')
        const { content } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot update knowledge areas
        if (membership?.role === 'viewer' && !isSuperAdmin) {
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

            await createAuditLog({
                userId: user.id,
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

            await createAuditLog({
                userId: user.id,
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
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const area = c.req.param('area')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const { allowed, project } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

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
            userId: user.id,
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
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const areaId = c.req.param('areaId')
        const data = c.req.valid('json')

        // Authorize BEFORE inserting — get knowledge area → project → membership
        const [ka] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, areaId))
        if (!ka) return c.json({ error: 'Knowledge area not found' }, 404)

        const [project] = await db.select().from(projects).where(eq(projects.id, ka.projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, project.organizationId!)
            ))

        if ((!user || user.globalRole !== 'super_admin') && project.userId !== user.id && !membership) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Viewers cannot add changes
        if (membership && membership.role === 'viewer' && user.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem adicionar mudanças' }, 403)
        }

        // Now safe to insert
        const [created] = await db.insert(knowledgeAreaChanges).values({
            id: nanoid(),
            knowledgeAreaId: areaId,
            description: data.description,
            type: data.type,
            status: data.status,
            date: new Date(data.date)
        }).returning()

        // Audit log
        await createAuditLog({
            userId: user.id,
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
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Get change record to verify access
    const [change] = await db.select().from(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    if (!change) return c.json({ error: 'Change not found' }, 404)

    const [ka] = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.id, change.knowledgeAreaId))
    if (!ka) return c.json({ error: 'Knowledge area not found' }, 404)

    const { allowed, project, membership } = await canAccessProject(ka.projectId, user.id, isSuperAdmin)
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    // Viewers cannot delete changes
    if (membership?.role === 'viewer' && !isSuperAdmin) {
        return c.json({ error: 'Visualizadores não podem excluir mudanças' }, 403)
    }

    await db.delete(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    return c.json({ success: true })
})

export default app
