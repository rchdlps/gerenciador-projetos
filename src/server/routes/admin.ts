import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations, memberships, auditLogs, projects, sessions, accounts } from '../../../db/schema'
import { eq, desc, sql, inArray, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// GET /api/admin/users
app.get('/users', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const search = c.req.query('q') || ''
    const isSuperAdmin = user.globalRole === 'super_admin'

    let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        globalRole: users.globalRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        organizations: sql<any[]>`COALESCE(
            json_agg(
                json_build_object(
                    'id', ${organizations.id},
                    'name', ${organizations.name},
                    'role', ${memberships.role}
                )
            ) FILTER (WHERE ${organizations.id} IS NOT NULL),
            '[]'
        )`
    })
        .from(users)
        .leftJoin(memberships, eq(users.id, memberships.userId))
        .leftJoin(organizations, eq(memberships.organizationId, organizations.id))
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))

    if (isSuperAdmin) {
        if (search) {
            query.where(
                sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`
            )
        }
    } else {
        const myMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, user.id))

        const myOrgIds = myMemberships.map(m => m.orgId)

        if (myOrgIds.length === 0) {
            return c.json({ data: [], meta: { isSuperAdmin, total: 0 } })
        }

        query.where(
            and(
                inArray(memberships.organizationId, myOrgIds),
                search ? sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}` : undefined
            )
        )
    }

    const results = await query

    return c.json({
        data: results,
        meta: { isSuperAdmin, total: results.length }
    })
})

// GET /api/admin/organizations
app.get('/organizations', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const isSuperAdmin = user.globalRole === 'super_admin'

    let orgsQuery = db.select({
        id: organizations.id,
        name: organizations.name
    }).from(organizations)

    if (!isSuperAdmin) {
        const myMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(
                and(
                    eq(memberships.userId, user.id),
                    inArray(memberships.role, ['secretario', 'gestor'])
                )
            )
        const allowedIds = myMemberships.map(m => m.orgId)

        if (allowedIds.length === 0) return c.json([])
        orgsQuery.where(inArray(organizations.id, allowedIds))
    }

    const orgs = await orgsQuery
    return c.json(orgs)
})

// POST /api/admin/users
app.post('/users',
    zValidator('json', z.object({
        name: z.string(),
        email: z.string().email(),
        image: z.string().optional(),
        globalRole: z.enum(['super_admin', 'user']).optional(),
        organizationId: z.string().optional(),
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional(),
        memberships: z.array(z.object({
            organizationId: z.string(),
            role: z.enum(['secretario', 'gestor', 'viewer'])
        })).optional()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { name, email, image, globalRole, organizationId, orgRole, memberships: providedMemberships } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'

        // Consolidate memberships (legacy + new array)
        const membershipsToCreate = [...(providedMemberships || [])]
        if (organizationId && orgRole) {
            if (!membershipsToCreate.find(m => m.organizationId === organizationId)) {
                membershipsToCreate.push({ organizationId, role: orgRole })
            }
        }

        // Permission checks
        if (!isSuperAdmin) {
            if (globalRole === 'super_admin') return c.json({ error: 'Insuficient permissions to create Super Admin' }, 403)
            if (membershipsToCreate.length === 0) return c.json({ error: 'Organization required' }, 400)

            for (const m of membershipsToCreate) {
                const [membership] = await db.select()
                    .from(memberships)
                    .where(and(
                        eq(memberships.userId, user.id),
                        eq(memberships.organizationId, m.organizationId),
                        inArray(memberships.role, ['secretario', 'gestor'])
                    ))

                if (!membership) return c.json({ error: `Insufficient permissions for organization ${m.organizationId}` }, 403)
            }
        }

        // Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email))
        if (existingUser) return c.json({ error: 'User already exists with this email' }, 409)

        // Create user via auth
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "!1Aa"
        const newUserCtx = await auth.api.signUpEmail({
            body: { name, email, password: randomPassword, image }
        })

        if (!newUserCtx) return c.json({ error: "Failed to create user via auth provider" }, 500)

        const userId = newUserCtx.user.id

        // Update global role + batch insert memberships in parallel
        const tasks: Promise<any>[] = []

        if (isSuperAdmin && globalRole) {
            tasks.push(
                db.update(users).set({ globalRole }).where(eq(users.id, userId))
            )
        }

        if (membershipsToCreate.length > 0) {
            // Batch all memberships into a single insert
            tasks.push(
                db.insert(memberships).values(
                    membershipsToCreate.map(m => ({
                        userId,
                        organizationId: m.organizationId,
                        role: m.role
                    }))
                )
            )
        }

        // Send invite email
        tasks.push(
            auth.api.requestPasswordReset({
                body: { email, redirectTo: "/reset-password" }
            })
        )

        await Promise.all(tasks)

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId: null,
            action: 'CREATE',
            resource: 'user',
            resourceId: userId,
            metadata: { email, name, globalRole, membershipsCount: membershipsToCreate.length }
        })

        return c.json({ success: true, userId })
    }
)

// PATCH /api/admin/users/:id
app.patch('/users/:id',
    zValidator('json', z.object({
        name: z.string().optional(),
        globalRole: z.enum(['super_admin', 'user']).optional(),
        isActive: z.boolean().optional(),
        organizationId: z.string().optional(),
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional(),
        memberships: z.array(z.object({
            organizationId: z.string(),
            role: z.enum(['secretario', 'gestor', 'viewer'])
        })).optional()
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const userIdToUpdate = c.req.param('id')
        const { name, globalRole, isActive, organizationId, orgRole, memberships: newMemberships } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'

        if (!isSuperAdmin) {
            if (globalRole) return c.json({ error: 'Only Super Admins can change Global Roles' }, 403)
            if (isActive !== undefined) return c.json({ error: 'Only Super Admins can change active status' }, 403)
            if (name) return c.json({ error: 'Only Super Admins can change cached user names via this API' }, 403)

            if (newMemberships && newMemberships.length > 0) {
                for (const m of newMemberships) {
                    const [membership] = await db.select()
                        .from(memberships)
                        .where(and(
                            eq(memberships.userId, user.id),
                            eq(memberships.organizationId, m.organizationId),
                            inArray(memberships.role, ['secretario', 'gestor'])
                        ))
                    if (!membership) {
                        return c.json({ error: `Insufficient permissions for organization ${m.organizationId}` }, 403)
                    }
                }
            }
        }

        // Update basic info (super admin only)
        if (isSuperAdmin) {
            const updates: any = {}
            if (name) updates.name = name
            if (globalRole) updates.globalRole = globalRole
            if (isActive !== undefined) updates.isActive = isActive

            if (Object.keys(updates).length > 0) {
                await db.update(users).set(updates).where(eq(users.id, userIdToUpdate))
            }
        }

        // Update memberships
        if (newMemberships && newMemberships.length >= 0) {
            const currentMemberships = await db.select()
                .from(memberships)
                .where(eq(memberships.userId, userIdToUpdate))

            const currentOrgIds = currentMemberships.map(m => m.organizationId)
            const newOrgIds = newMemberships.map(m => m.organizationId)

            // Remove memberships not in new list
            const toRemove = currentOrgIds.filter(id => !newOrgIds.includes(id))
            for (const orgId of toRemove) {
                await db.delete(memberships)
                    .where(and(
                        eq(memberships.userId, userIdToUpdate),
                        eq(memberships.organizationId, orgId)
                    ))
            }

            // Add or update memberships
            for (const m of newMemberships) {
                const existing = currentMemberships.find(cm => cm.organizationId === m.organizationId)
                if (existing) {
                    if (existing.role !== m.role) {
                        await db.update(memberships)
                            .set({ role: m.role })
                            .where(and(
                                eq(memberships.userId, userIdToUpdate),
                                eq(memberships.organizationId, m.organizationId)
                            ))
                    }
                } else {
                    await db.insert(memberships).values({
                        userId: userIdToUpdate,
                        organizationId: m.organizationId,
                        role: m.role
                    })
                }
            }
        } else if (organizationId && orgRole) {
            const [existingMember] = await db.select().from(memberships).where(and(
                eq(memberships.userId, userIdToUpdate),
                eq(memberships.organizationId, organizationId)
            ))

            if (existingMember) {
                await db.update(memberships)
                    .set({ role: orgRole })
                    .where(and(
                        eq(memberships.userId, userIdToUpdate),
                        eq(memberships.organizationId, organizationId)
                    ))
            } else {
                await db.insert(memberships).values({
                    userId: userIdToUpdate,
                    organizationId,
                    role: orgRole
                })
            }
        }

        return c.json({ success: true })
    }
)

// DELETE /api/admin/users/:id
app.delete('/users/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const userIdToDelete = c.req.param('id')

    if (user.globalRole !== 'super_admin') {
        return c.json({ error: 'Apenas Super Admins podem excluir usuários' }, 403)
    }

    if (userIdToDelete === user.id) {
        return c.json({ error: 'Você não pode excluir a si mesmo' }, 400)
    }

    // Parallelize: check user exists + check for projects
    const [[userToDelete], userProjects] = await Promise.all([
        db.select().from(users).where(eq(users.id, userIdToDelete)),
        db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userIdToDelete)),
    ])

    if (!userToDelete) return c.json({ error: 'Usuário não encontrado' }, 404)

    if (userToDelete.globalRole === 'super_admin') {
        return c.json({ error: 'Não é possível excluir outro Super Admin' }, 403)
    }

    if (userProjects.length > 0) {
        return c.json({
            error: `Este usuário possui ${userProjects.length} projeto(s). Transfira ou exclua os projetos antes de remover o usuário.`,
            hasProjects: true,
            projectCount: userProjects.length
        }, 400)
    }

    // Parallelize: delete sessions + accounts (both independent)
    await Promise.all([
        db.delete(sessions).where(eq(sessions.userId, userIdToDelete)),
        db.delete(accounts).where(eq(accounts.userId, userIdToDelete)),
    ])

    // Delete user (memberships cascade)
    await db.delete(users).where(eq(users.id, userIdToDelete))

    // Fire-and-forget audit
    createAuditLog({
        userId: user.id,
        organizationId: null,
        action: 'DELETE',
        resource: 'user',
        resourceId: userIdToDelete,
        metadata: {
            deletedUserEmail: userToDelete.email,
            deletedUserName: userToDelete.name
        }
    })

    return c.json({ success: true })
})

// GET /api/admin/audit-logs
app.get('/audit-logs', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const action = c.req.query('action')
    const resource = c.req.query('resource')
    const search = c.req.query('search')
    const dateFrom = c.req.query('dateFrom')
    const dateTo = c.req.query('dateTo')
    const organizationId = c.req.query('organizationId')

    const offset = (page - 1) * limit
    const isSuperAdmin = user.globalRole === 'super_admin'

    const conditions: any[] = []

    if (action) conditions.push(eq(auditLogs.action, action))
    if (resource) conditions.push(eq(auditLogs.resource, resource))
    if (dateFrom) conditions.push(sql`${auditLogs.createdAt} >= ${new Date(dateFrom)}`)
    if (dateTo) conditions.push(sql`${auditLogs.createdAt} <= ${new Date(dateTo)}`)
    if (search) conditions.push(sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`)
    if (organizationId) conditions.push(eq(auditLogs.organizationId, organizationId))

    if (!isSuperAdmin) {
        const myMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, user.id))

        const myOrgIds = myMemberships.map(m => m.orgId)
        if (myOrgIds.length > 0) {
            conditions.push(inArray(auditLogs.organizationId, myOrgIds))
        } else {
            return c.json({ logs: [], pagination: { page, limit, total: 0, totalPages: 0 } })
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Parallelize: count + data fetch
    const [countResult, logs] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .where(whereClause),

        db.select({
            id: auditLogs.id,
            action: auditLogs.action,
            resource: auditLogs.resource,
            resourceId: auditLogs.resourceId,
            metadata: auditLogs.metadata,
            createdAt: auditLogs.createdAt,
            userName: users.name,
            userEmail: users.email,
            organizationId: auditLogs.organizationId
        })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .where(whereClause)
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
            .offset(offset),
    ])

    const count = countResult[0].count
    const totalPages = Math.ceil(count / limit)

    return c.json({
        logs,
        pagination: { page, limit, total: count, totalPages }
    })
})

export default app
