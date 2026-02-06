import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations, memberships, globalRolesEnum } from '../../../db/schema'
import { eq, like, desc, sql, inArray, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

// Helper to get session
const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// GET /api/admin/users
// Returns users based on permissions:
// - Super Admin: All users + search + global role info
// - User: Only users in their same organization(s)
// GET /api/admin/users
// Returns users based on permissions:
// - Super Admin: All users + search + global role info
// - User: Only users in their same organization(s)
app.get('/users', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const search = c.req.query('q') || ''

    // 1. Check Global Role
    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

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
    console.log(`[Admin] User: ${session.user.id}, IsSuper: ${isSuperAdmin}`)

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
            .where(eq(memberships.userId, session.user.id))

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
app.get('/organizations', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

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
                    eq(memberships.userId, session.user.id),
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
// POST /api/admin/users
// Create or Invite User
app.post('/users',
    zValidator('json', z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().optional(),
        organizationId: z.string().optional(),
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { name, email, password, organizationId, orgRole } = c.req.valid('json')

        // 1. Permission Check
        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
        const isSuperAdmin = currentUser?.globalRole === 'super_admin'

        // Non-super admins MUST provide an organizationId they control
        if (!isSuperAdmin) {
            if (!organizationId) return c.json({ error: 'Organization ID required' }, 400)

            // Verify caller has permissions in that org
            const [membership] = await db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, session.user.id),
                    eq(memberships.organizationId, organizationId),
                    inArray(memberships.role, ['secretario', 'gestor'])
                ))

            if (!membership) return c.json({ error: 'Insufficient permissions for this organization' }, 403)
        }

        // 2. Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email))
        let userId = existingUser?.id

        if (!userId) {
            // Create New User (Using Auth API would be best, here simplified insert)
            // Real implementation: auth.api.signUpEmail...
            // For now, we simulate user creation in DB if not exists
            const newUser = await auth.api.signUpEmail({
                body: {
                    name,
                    email,
                    password: password || "Mudar123!", // Temp default password if not provided
                }
            })

            if (!newUser) {
                // Fallback if auth api returns unexpectedly
                // This part depends on how you handle 'invites' without passwords
                return c.json({ error: "Failed to create user via auth provider" }, 500)
            }
            userId = newUser.user.id
        }

        // 3. Add to Organization
        if (organizationId && orgRole) {
            // Check if already member
            const [existingMember] = await db.select().from(memberships).where(and(
                eq(memberships.userId, userId),
                eq(memberships.organizationId, organizationId)
            ))

            if (existingMember) {
                // Update role
                await db.update(memberships)
                    .set({ role: orgRole })
                    .where(and(
                        eq(memberships.userId, userId),
                        eq(memberships.organizationId, organizationId)
                    ))
            } else {
                // Insert
                await db.insert(memberships).values({
                    userId,
                    organizationId,
                    role: orgRole
                })
            }
        }

        return c.json({ success: true, userId })
    }
)

// PATCH /api/admin/users/:id
// Update user details
// PATCH /api/admin/users/:id
// Update user details
app.patch('/users/:id',
    zValidator('json', z.object({
        name: z.string().optional(),
        globalRole: z.enum(['super_admin', 'user']).optional(),
        isActive: z.boolean().optional(),
        organizationId: z.string().optional(),
        orgRole: z.enum(['secretario', 'gestor', 'viewer']).optional()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const userIdToUpdate = c.req.param('id')
        const { name, globalRole, isActive, organizationId, orgRole } = c.req.valid('json')
        console.log(`[Admin] PATCH /users/${userIdToUpdate}`, { name, globalRole, isActive, organizationId, orgRole })

        // 1. Permission Check
        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
        const isSuperAdmin = currentUser?.globalRole === 'super_admin'

        // If not super admin, must be admin of organizationId
        if (!isSuperAdmin) {
            if (globalRole) return c.json({ error: 'Only Super Admins can change Global Roles' }, 403)
            if (isActive !== undefined) return c.json({ error: 'Only Super Admins can change active status' }, 403)
            if (!organizationId) return c.json({ error: 'Context Organization ID required' }, 400)

            const [membership] = await db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, session.user.id),
                    eq(memberships.organizationId, organizationId),
                    inArray(memberships.role, ['secretario', 'gestor'])
                ))

            if (!membership) return c.json({ error: 'Insufficient permissions' }, 403)

            // Limit scope: Can only update if target user is ALSO in this org (or being added)
            // But if we are editing 'name', that affects global user. 
            // Design Decision: Org Admins can only update Role for their org. Name changes restricted to user profile or Super Admin.
            if (name) {
                return c.json({ error: 'Only Super Admins can change cached user names via this API' }, 403)
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

        // 3. Update Membership
        if (organizationId && orgRole) {
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
                // Or insert if for some reason missing (though this is 'Edit')
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

export default app
