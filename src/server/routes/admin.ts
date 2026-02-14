import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations, memberships, globalRolesEnum, auditLogs, projects, sessions, accounts } from '../../../db/schema'
import { eq, like, desc, sql, inArray, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)



// GET /api/admin/users
// Returns users based on permissions:
// - Super Admin: All users + search + global role info
// - User: Only users in their same organization(s)
// GET /api/admin/users
// Returns users based on permissions:
// - Super Admin: All users + search + global role info
// - User: Only users in their same organization(s)
app.get('/users', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const search = c.req.query('q') || ''

    // 1. Check Global Role
    const isSuperAdmin = user.globalRole === 'super_admin'

    let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        globalRole: users.globalRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        // Group memberships into an array
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

    // 2. Apply Filters
    console.log(`[Admin] User: ${user.id}, IsSuper: ${isSuperAdmin}`)

    if (isSuperAdmin) {
        // Super Admin sees everything + Global Search
        if (search) {
            query.where(
                sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`
            )
        }
    } else {
        // Regular User: Filter by Shared Organization
        const myMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, user.id))

        const myOrgIds = myMemberships.map(m => m.orgId)
        console.log(`[Admin] My Orgs: ${myOrgIds}`)

        if (myOrgIds.length === 0) {
            console.log(`[Admin] No orgs found for user.`)
            return c.json({
                data: [],
                meta: { isSuperAdmin, total: 0 }
            })
        }

        // Fix: Instead of HAVING, filter in WHERE clause for better performance/compatibility
        // Users must be in one of my organizations
        query.where(
            and(
                inArray(memberships.organizationId, myOrgIds),
                search ? sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}` : undefined
            )
        )
    }

    const results = await query
    console.log(`[Admin] Results found: ${results.length}`)

    return c.json({
        data: results,
        meta: {
            isSuperAdmin,
            total: results.length
        }
    })
})

// GET /api/admin/organizations
// Helper to get allowed organizations for the dropdown
// GET /api/admin/organizations
// Helper to get allowed organizations for the dropdown
app.get('/organizations', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const isSuperAdmin = user.globalRole === 'super_admin'

    let orgsQuery = db.select({
        id: organizations.id,
        name: organizations.name
    }).from(organizations)

    if (!isSuperAdmin) {
        // Regular admins only see orgs they are 'secretario' or 'gestor' of
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
// Create or Invite User
app.post('/users',
    zValidator('json', z.object({
        name: z.string(),
        email: z.string().email(),
        image: z.string().optional(),
        globalRole: z.enum(['super_admin', 'user']).optional(),
        organizationId: z.string().optional(), // Legacy support
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional(), // Legacy support
        memberships: z.array(z.object({
            organizationId: z.string(),
            role: z.enum(['secretario', 'gestor', 'viewer'])
        })).optional()
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const { name, email, image, globalRole, organizationId, orgRole, memberships: providedMemberships } = c.req.valid('json')

        // 1. Permission Check
        const isSuperAdmin = user.globalRole === 'super_admin'

        // Consolidate memberships (legacy + new array)
        const membershipsToCreate = [...(providedMemberships || [])]
        if (organizationId && orgRole) {
            // Avoid duplicates
            if (!membershipsToCreate.find(m => m.organizationId === organizationId)) {
                membershipsToCreate.push({ organizationId, role: orgRole })
            }
        }

        // Non-super admins MUST provide an organizationId they control for EVERY membership
        if (!isSuperAdmin) {
            if (globalRole === 'super_admin') return c.json({ error: 'Insuficient permissions to create Super Admin' }, 403)

            if (membershipsToCreate.length === 0) return c.json({ error: 'Organization required' }, 400)

            for (const m of membershipsToCreate) {
                // Verify caller has permissions in that org
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

        // 2. Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email))

        if (existingUser) {
            return c.json({ error: 'User already exists with this email' }, 409)
        }

        // 3. Create New User with Random Password
        // We use a random password because we will send a reset link correctly
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "!1Aa";

        const newUserCtx = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password: randomPassword,
                image
            }
        })

        if (!newUserCtx) {
            return c.json({ error: "Failed to create user via auth provider" }, 500)
        }

        const userId = newUserCtx.user.id

        // 4. Update Global Role (Super Admin Only)
        // We do this via DB update because signUpEmail might not respect our custom fields depending on adapter config
        if (isSuperAdmin && globalRole) {
            await db.update(users)
                .set({ globalRole })
                .where(eq(users.id, userId))
        }

        // 5. Add Memberships
        if (membershipsToCreate.length > 0) {
            for (const m of membershipsToCreate) {
                await db.insert(memberships).values({
                    userId,
                    organizationId: m.organizationId,
                    role: m.role
                })
            }
        }

        // 6. Send Invite Email (via Forgot Password flow)
        // This generates a token and sends the email
        await auth.api.requestPasswordReset({
            body: {
                email,
                redirectTo: "/reset-password"
            }
        })

        // Audit log
        await createAuditLog({
            userId: user.id,
            organizationId: null, // Global action or we could pick the first org
            action: 'CREATE',
            resource: 'user',
            resourceId: userId,
            metadata: { email, name, globalRole, membershipsCount: membershipsToCreate.length }
        })

        return c.json({ success: true, userId })
    }
)

// PATCH /api/admin/users/:id
// Update user details
// PATCH /api/admin/users/:id
// Update user details - supports multi-org memberships
app.patch('/users/:id',
    zValidator('json', z.object({
        name: z.string().optional(),
        globalRole: z.enum(['super_admin', 'user']).optional(),
        isActive: z.boolean().optional(),
        // Legacy single org support
        organizationId: z.string().optional(),
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional(),
        // New: array of memberships for multi-org
        memberships: z.array(z.object({
            organizationId: z.string(),
            role: z.enum(['secretario', 'gestor', 'viewer'])
        })).optional()
    })),
    async (c) => {
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const userIdToUpdate = c.req.param('id')
        const { name, globalRole, isActive, organizationId, orgRole, memberships: newMemberships } = c.req.valid('json')
        console.log(`[Admin] PATCH /users/${userIdToUpdate}`, { name, globalRole, isActive, memberships: newMemberships })

        // 1. Permission Check
        const isSuperAdmin = user.globalRole === 'super_admin'

        // If not super admin, must be admin of organizationId
        if (!isSuperAdmin) {
            if (globalRole) return c.json({ error: 'Only Super Admins can change Global Roles' }, 403)
            if (isActive !== undefined) return c.json({ error: 'Only Super Admins can change active status' }, 403)
            if (name) return c.json({ error: 'Only Super Admins can change cached user names via this API' }, 403)

            // For non-super-admins with memberships array, verify they have admin in all orgs
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

        // 2. Update Basic Info (Super Admin Only)
        if (isSuperAdmin) {
            const updates: any = {}
            if (name) updates.name = name
            if (globalRole) updates.globalRole = globalRole
            if (isActive !== undefined) updates.isActive = isActive

            if (Object.keys(updates).length > 0) {
                await db.update(users).set(updates).where(eq(users.id, userIdToUpdate))
            }
        }

        // 3. Update Memberships - support both legacy single org and new array
        if (newMemberships && newMemberships.length >= 0) {
            // Get current memberships
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
                    // Update role if changed
                    if (existing.role !== m.role) {
                        await db.update(memberships)
                            .set({ role: m.role })
                            .where(and(
                                eq(memberships.userId, userIdToUpdate),
                                eq(memberships.organizationId, m.organizationId)
                            ))
                    }
                } else {
                    // Insert new membership
                    await db.insert(memberships).values({
                        userId: userIdToUpdate,
                        organizationId: m.organizationId,
                        role: m.role
                    })
                }
            }
        } else if (organizationId && orgRole) {
            // Legacy single org update
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
// Delete a user - Super Admin only
app.delete('/users/:id', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const userIdToDelete = c.req.param('id')

    // 1. Only Super Admin can delete users
    if (user.globalRole !== 'super_admin') {
        return c.json({ error: 'Apenas Super Admins podem excluir usuários' }, 403)
    }

    // 2. Cannot delete yourself
    if (userIdToDelete === user.id) {
        return c.json({ error: 'Você não pode excluir a si mesmo' }, 400)
    }

    // 3. Check if user exists
    const [userToDelete] = await db.select().from(users).where(eq(users.id, userIdToDelete))
    if (!userToDelete) {
        return c.json({ error: 'Usuário não encontrado' }, 404)
    }

    // 4. Cannot delete another super_admin (safety measure)
    if (userToDelete.globalRole === 'super_admin') {
        return c.json({ error: 'Não é possível excluir outro Super Admin' }, 403)
    }

    // 5. Check for dependencies - projects created by this user
    const userProjects = await db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, userIdToDelete))

    if (userProjects.length > 0) {
        return c.json({
            error: `Este usuário possui ${userProjects.length} projeto(s). Transfira ou exclua os projetos antes de remover o usuário.`,
            hasProjects: true,
            projectCount: userProjects.length
        }, 400)
    }

    // 6. Delete related records first (sessions and accounts don't have cascade)
    await db.delete(sessions).where(eq(sessions.userId, userIdToDelete))
    await db.delete(accounts).where(eq(accounts.userId, userIdToDelete))

    // 7. Delete user (memberships will cascade, audit_logs will set null)
    await db.delete(users).where(eq(users.id, userIdToDelete))

    // 8. Audit log
    await createAuditLog({
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
// Fetch audit logs with user information, filtering, pagination, and search
app.get('/audit-logs', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    // Get query parameters
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100) // Max 100
    const action = c.req.query('action') // CREATE, UPDATE, DELETE
    const resource = c.req.query('resource')
    const search = c.req.query('search') // User name or email
    const dateFrom = c.req.query('dateFrom') // ISO date string
    const dateTo = c.req.query('dateTo')
    const organizationId = c.req.query('organizationId')

    const offset = (page - 1) * limit

    // Check if user is super admin
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Build dynamic where conditions
    const conditions: any[] = []

    if (action) {
        conditions.push(eq(auditLogs.action, action))
    }

    if (resource) {
        conditions.push(eq(auditLogs.resource, resource))
    }

    if (dateFrom) {
        conditions.push(sql`${auditLogs.createdAt} >= ${new Date(dateFrom)}`)
    }

    if (dateTo) {
        conditions.push(sql`${auditLogs.createdAt} <= ${new Date(dateTo)}`)
    }

    if (search) {
        conditions.push(
            sql`${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`}`
        )
    }

    if (organizationId) {
        conditions.push(eq(auditLogs.organizationId, organizationId))
    }

    // Non-super admins can only see logs from their organizations
    if (!isSuperAdmin) {
        const myMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, user.id))

        const myOrgIds = myMemberships.map(m => m.orgId)
        if (myOrgIds.length > 0) {
            conditions.push(inArray(auditLogs.organizationId, myOrgIds))
        } else {
            // No orgs = no logs
            return c.json({ logs: [], pagination: { page, limit, total: 0, totalPages: 0 } })
        }
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const [{ count }] = await db.select({
        count: sql<number>`count(*)::int`
    })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(whereClause)

    // Fetch paginated logs
    const logs = await db.select({
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
        .offset(offset)

    const totalPages = Math.ceil(count / limit)

    return c.json({
        logs,
        pagination: {
            page,
            limit,
            total: count,
            totalPages
        }
    })
})

export default app
