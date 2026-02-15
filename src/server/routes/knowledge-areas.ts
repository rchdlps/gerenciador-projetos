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

// Shared upsert handler for PUT and PATCH
async function upsertKnowledgeArea(c: any) {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const area = c.req.param('area')
    const { content } = c.req.valid('json')
    const isSuperAdmin = user.globalRole === 'super_admin'

    const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
    if (!project) return c.json({ error: 'Project not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    if (membership?.role === 'viewer' && !isSuperAdmin) {
        return c.json({ error: 'Visualizadores não podem editar áreas de conhecimento' }, 403)
    }

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

        createAuditLog({
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

        createAuditLog({
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

// Get Knowledge Areas for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and data fetch in parallel
    const [access, areas] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(knowledgeAreas).where(eq(knowledgeAreas.projectId, projectId)),
    ])

    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(areas)
})

// Update/Upsert Knowledge Area
app.put('/:projectId/:area',
    zValidator('json', z.object({ content: z.string() })),
    upsertKnowledgeArea
)

// PATCH route (alias for PUT - used by risk-view and other components)
app.patch('/:projectId/:area',
    zValidator('json', z.object({ content: z.string() })),
    upsertKnowledgeArea
)

// Get Single Knowledge Area with Changes
app.get('/:projectId/:area', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const area = c.req.param('area')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and KA fetch in parallel
    const [access, kaRows] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select().from(knowledgeAreas).where(
            and(
                eq(knowledgeAreas.projectId, projectId),
                eq(knowledgeAreas.area, area)
            )
        ),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

    const ka = kaRows[0]

    if (!ka) {
        const [newKa] = await db.insert(knowledgeAreas).values({
            id: nanoid(),
            projectId,
            area,
            content: ""
        }).returning()

        createAuditLog({
            userId: user.id,
            organizationId: access.project.organizationId,
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
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const areaId = c.req.param('areaId')
        const data = c.req.valid('json')

        // Single join: knowledgeAreas → projects to get orgId
        const [row] = await db.select({
            kaId: knowledgeAreas.id,
            projectId: knowledgeAreas.projectId,
            projectOrgId: projects.organizationId,
            projectUserId: projects.userId,
        })
            .from(knowledgeAreas)
            .innerJoin(projects, eq(projects.id, knowledgeAreas.projectId))
            .where(eq(knowledgeAreas.id, areaId))

        if (!row) return c.json({ error: 'Knowledge area not found' }, 404)

        const isSuperAdmin = user.globalRole === 'super_admin'
        if (!isSuperAdmin && row.projectUserId !== user.id && row.projectOrgId) {
            const [membership] = await db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, row.projectOrgId)
                ))

            if (!membership) return c.json({ error: 'Forbidden' }, 403)
            if (membership.role === 'viewer') {
                return c.json({ error: 'Visualizadores não podem adicionar mudanças' }, 403)
            }
        }

        const [created] = await db.insert(knowledgeAreaChanges).values({
            id: nanoid(),
            knowledgeAreaId: areaId,
            description: data.description,
            type: data.type,
            status: data.status,
            date: new Date(data.date)
        }).returning()

        createAuditLog({
            userId: user.id,
            organizationId: row.projectOrgId,
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
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: changes → knowledgeAreas to get projectId
    const [row] = await db.select({
        changeId: knowledgeAreaChanges.id,
        projectId: knowledgeAreas.projectId,
    })
        .from(knowledgeAreaChanges)
        .innerJoin(knowledgeAreas, eq(knowledgeAreas.id, knowledgeAreaChanges.knowledgeAreaId))
        .where(eq(knowledgeAreaChanges.id, id))

    if (!row) return c.json({ error: 'Change not found' }, 404)

    const { allowed, membership } = await canAccessProject(row.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    if (membership?.role === 'viewer' && !isSuperAdmin) {
        return c.json({ error: 'Visualizadores não podem excluir mudanças' }, 403)
    }

    await db.delete(knowledgeAreaChanges).where(eq(knowledgeAreaChanges.id, id))
    return c.json({ success: true })
})

export default app
