import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projects, projectPhases, sessions, memberships } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { getScopedOrgIds, scopedProjects, canAccessProject } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

app.get('/', async (c) => {
    const user = c.get('user')
    const session = c.get('session')

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Get active org from session (custom column not in session object)
    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.id))
    const activeOrgId = sessionRow?.activeOrganizationId || null

    const orgIds = await getScopedOrgIds(user.id, activeOrgId, isSuperAdmin)
    const userProjects = await scopedProjects(orgIds)

    return c.json(userProjects)
})

app.post('/',
    zValidator('json', z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        organizationId: z.string().min(1),
        type: z.string().optional().default('Projeto'),
        status: z.string().optional().default('em_andamento')
    })),
    async (c) => {
        const user = c.get('user')
        const { name, description, organizationId, type, status } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'

        // Check org membership (super admins bypass)
        let membership: { role: string } | null = null
        if (!isSuperAdmin) {
            const [m] = await db.select({ role: memberships.role })
                .from(memberships)
                .where(and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, organizationId)
                ))

            if (!m) return c.json({ error: 'Forbidden: You do not have access to this organization' }, 403)
            membership = m

            if (m.role === 'viewer') {
                return c.json({ error: 'Forbidden: Viewers cannot create projects' }, 403)
            }
        }

        const id = nanoid()

        const [newProject] = await db.insert(projects).values({
            id,
            name,
            description,
            userId: user.id,
            organizationId,
            type,
            status
        }).returning()

        // Batch all 5 phase inserts into a single query
        const standardPhases = [
            "Iniciação",
            "Planejamento",
            "Execução",
            "Monitoramento e Controle",
            "Encerramento"
        ]

        await db.insert(projectPhases).values(
            standardPhases.map((phaseName, order) => ({
                id: nanoid(),
                projectId: id,
                name: phaseName,
                order
            }))
        )

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId,
            action: 'CREATE',
            resource: 'project',
            resourceId: id,
            metadata: { name, type, status }
        })

        return c.json(newProject)
    }
)

app.patch('/:id',
    zValidator('json', z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user')
        const id = c.req.param('id')
        const { name, description, type, status } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'
        const { allowed, project, membership } = await canAccessProject(id, user.id, isSuperAdmin)

        if (!project) return c.json({ error: 'Not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot update projects
        if (membership?.role === 'viewer' && !isSuperAdmin) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const [updatedProject] = await db.update(projects)
            .set({ name, description, type, status, updatedAt: new Date() })
            .where(eq(projects.id, id))
            .returning()

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId: project.organizationId,
            action: 'UPDATE',
            resource: 'project',
            resourceId: id,
            metadata: { name, type, status }
        })

        return c.json(updatedProject)
    }
)

app.get('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed, project } = await canAccessProject(id, user.id, isSuperAdmin)

    if (!project) return c.json({ error: 'Not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    return c.json(project)
})

app.get('/:id/members', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    const isSuperAdmin = user.globalRole === 'super_admin'
    const { allowed, project } = await canAccessProject(id, user.id, isSuperAdmin)

    if (!project) return c.json({ error: 'Not found' }, 404)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    if (!project.organizationId) {
        // Personal project — return just the owner
        const { users } = await import('../../../db/schema')
        const [owner] = await db.select().from(users).where(eq(users.id, project.userId))
        return c.json([owner])
    }

    // Fetch all members of the organization
    const { users, memberships } = await import('../../../db/schema')
    const members = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: memberships.role
    })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.organizationId, project.organizationId))

    return c.json(members)
})

export default app
