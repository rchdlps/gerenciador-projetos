import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projects, memberships, users, projectPhases, sessions } from '../../../db/schema'
import { eq, desc, inArray, and } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { getScopedOrgIds, scopedProjects } from '@/lib/queries/scoped'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

app.get('/', async (c) => {
    const sessionUser = c.get('user')
    const session = c.get('session')

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id))
    const isSuperAdmin = user?.globalRole === 'super_admin'

    // Get active org from session
    const [sessionData] = await db.select()
        .from(sessions)
        .where(eq(sessions.id, session.id))

    const activeOrgId = sessionData?.activeOrganizationId || null

    // Use centralized scoped query logic with active org from session
    const orgIds = await getScopedOrgIds(sessionUser.id, activeOrgId, isSuperAdmin)
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
        const sessionUser = c.get('user')
        const { name, description, organizationId, type, status } = c.req.valid('json')

        // Fetch full user to check role
        const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id))

        // Verify user has access to this organization
        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, sessionUser.id),
                eq(memberships.organizationId, organizationId)
            )
        })

        const isSuperAdmin = user && user.globalRole === 'super_admin'

        if (!membership && !isSuperAdmin) {
            return c.json({ error: 'Forbidden: You do not have access to this organization' }, 403)
        }

        // Optional: Check if role allows creation (e.g. viewer cannot create)
        if (membership && membership.role === 'viewer' && !isSuperAdmin) {
            return c.json({ error: 'Forbidden: Viewers cannot create projects' }, 403)
        }

        const id = nanoid()

        const [newProject] = await db.insert(projects).values({
            id,
            name,
            description,
            userId: sessionUser.id, // Creator
            organizationId,
            type,
            status
        }).returning()

        // Standard Phases
        const standardPhases = [
            "Iniciação",
            "Planejamento",
            "Execução",
            "Monitoramento e Controle",
            "Encerramento"
        ];

        let phaseOrder = 0;
        for (const phaseName of standardPhases) {
            await db.insert(projectPhases).values({
                id: nanoid(),
                projectId: id,
                name: phaseName,
                order: phaseOrder++
            });
        }

        // Audit Log
        await createAuditLog({
            userId: sessionUser.id,
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
        const sessionUser = c.get('user')
        const id = c.req.param('id')
        const { name, description, type, status } = c.req.valid('json')

        // Fetch full user to check role
        const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id))

        // Get project to check permission
        const [project] = await db.select().from(projects).where(eq(projects.id, id))
        if (!project) return c.json({ error: 'Not found' }, 404)

        // Verify access
        if (project.organizationId) {
            const isSuperAdmin = user && user.globalRole === 'super_admin'
            if (!isSuperAdmin) {
                const membership = await db.query.memberships.findFirst({
                    where: and(
                        eq(memberships.userId, sessionUser.id),
                        eq(memberships.organizationId, project.organizationId)
                    )
                })
                // Only admin/gestor/secretario can update? Or anyone with access?
                // Let's assume 'viewer' cannot update.
                if (!membership || membership.role === 'viewer') {
                    return c.json({ error: 'Forbidden' }, 403)
                }
            }
        } else {
            // Personal project
            if (project.userId !== sessionUser.id && user?.globalRole !== 'super_admin') {
                return c.json({ error: 'Forbidden' }, 403)
            }
        }

        const [updatedProject] = await db.update(projects)
            .set({ name, description, type, status, updatedAt: new Date() })
            .where(eq(projects.id, id))
            .returning()

        // Audit Log
        await createAuditLog({
            userId: sessionUser.id,
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
    const sessionUser = c.get('user')
    const id = c.req.param('id')

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id))

    // Check if project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, id))
    if (!project) return c.json({ error: 'Not found' }, 404)

    // Check if user has access to the project's organization
    if (project.organizationId) {
        // Admin Bypass
        if (user && user.globalRole === 'super_admin') {
            return c.json(project)
        }

        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, sessionUser.id),
                eq(memberships.organizationId, project.organizationId)
            )
        })
        if (!membership) return c.json({ error: 'Forbidden' }, 403)
    } else {
        // Fallback for legacy projects (if any) - only owner can see
        // Admin Bypass here too? Yes.
        if (user && user.globalRole === 'super_admin') return c.json(project)

        if (project.userId !== sessionUser.id) return c.json({ error: 'Forbidden' }, 403)
    }

    return c.json(project)
})

app.get('/:id/members', async (c) => {
    const sessionUser = c.get('user')
    const id = c.req.param('id')

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id))

    // Get project to find organization
    const [project] = await db.select().from(projects).where(eq(projects.id, id))
    if (!project) return c.json({ error: 'Not found' }, 404)

    if (!project.organizationId) {
        // Personal project? Return just the owner.
        const [owner] = await db.select().from(users).where(eq(users.id, project.userId))
        return c.json([owner])
    }

    // Verify access
    if (!user || user.globalRole !== 'super_admin') {
        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, sessionUser.id),
                eq(memberships.organizationId, project.organizationId)
            )
        })
        if (!membership) return c.json({ error: 'Forbidden' }, 403)
    }

    // Fetch all members of the organization
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
