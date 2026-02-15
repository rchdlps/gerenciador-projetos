import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sessions, memberships, organizations } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, invalidateSessionCache, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

/**
 * GET /api/org-session
 * Returns active org and list of user's organizations
 * Super admins get ALL organizations
 */
app.get('/', async (c) => {
    const sessionUser = c.get('user')
    const session = c.get('session')

    const isSuperAdmin = sessionUser.globalRole === 'super_admin'

    // Parallelize: memberships + session row + (super admin) all orgs
    const [userMemberships, [sessionRow], allOrgs] = await Promise.all([
        db.query.memberships.findMany({
            where: eq(memberships.userId, sessionUser.id),
            with: { organization: true }
        }),
        db.select().from(sessions).where(eq(sessions.id, session.id)),
        isSuperAdmin
            ? db.select({
                id: organizations.id,
                name: organizations.name,
                code: organizations.code,
                logoUrl: organizations.logoUrl
            }).from(organizations)
            : Promise.resolve([]),
    ])

    const activeOrgId = sessionRow?.activeOrganizationId || null

    // Find active org details
    let activeOrg = null
    if (activeOrgId) {
        const membership = userMemberships.find(m => m.organizationId === activeOrgId)

        if (membership) {
            activeOrg = {
                ...membership.organization,
                role: membership.role
            }
        } else if (isSuperAdmin) {
            const org = allOrgs.find(o => o.id === activeOrgId)
            if (org) {
                activeOrg = { ...org, role: 'admin' }
            }
        }
    }

    // Build organizations list
    const orgList = isSuperAdmin
        ? allOrgs.map(org => ({
            id: org.id,
            name: org.name,
            code: org.code,
            logoUrl: org.logoUrl,
            role: 'admin'
        }))
        : userMemberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            code: m.organization.code,
            logoUrl: m.organization.logoUrl,
            role: m.role
        }))

    return c.json({
        activeOrganizationId: activeOrgId,
        activeOrganization: activeOrg,
        isSuperAdmin,
        organizations: orgList
    })
})

/**
 * POST /api/org-session
 * Switch active organization
 */
app.post('/',
    zValidator('json', z.object({
        organizationId: z.string().nullable()
    })),
    async (c) => {
        const sessionUser = c.get('user')
        const session = c.get('session')
        const { organizationId } = c.req.valid('json')

        if (organizationId) {
            const isSuperAdmin = sessionUser.globalRole === 'super_admin'

            if (!isSuperAdmin) {
                // Parallelize: membership check + org exists
                const [membership, [org]] = await Promise.all([
                    db.query.memberships.findFirst({
                        where: and(
                            eq(memberships.userId, sessionUser.id),
                            eq(memberships.organizationId, organizationId)
                        )
                    }),
                    db.select().from(organizations).where(eq(organizations.id, organizationId)),
                ])

                if (!membership) return c.json({ error: 'You do not have access to this organization' }, 403)
                if (!org) return c.json({ error: 'Organization not found' }, 404)
            } else {
                // Super admin: just verify org exists
                const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId))
                if (!org) return c.json({ error: 'Organization not found' }, 404)
            }
        }

        await db.update(sessions)
            .set({
                activeOrganizationId: organizationId,
                updatedAt: new Date()
            })
            .where(eq(sessions.id, session.id))

        // Invalidate session cache so subsequent requests see the new activeOrganizationId
        const cookie = c.req.header('cookie')
        const tokenMatch = cookie?.match(/better-auth\.session_token=([^;]+)/)
        invalidateSessionCache(tokenMatch?.[1])

        return c.json({ success: true, activeOrganizationId: organizationId })
    }
)

export default app
