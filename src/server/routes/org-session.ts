import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sessions, memberships, organizations } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'

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

    // Check if super admin
    const isSuperAdmin = sessionUser.globalRole === 'super_admin'

    // Get user's memberships with org details
    const userMemberships = await db.query.memberships.findMany({
        where: eq(memberships.userId, sessionUser.id),
        with: {
            organization: true
        }
    })

    // For super admins: get ALL organizations
    let allOrgs: { id: string; name: string; code: string; logoUrl: string | null }[] = []
    if (isSuperAdmin) {
        allOrgs = await db.select({
            id: organizations.id,
            name: organizations.name,
            code: organizations.code,
            logoUrl: organizations.logoUrl
        }).from(organizations)
    }

    // Get active org ID from session
    const [currentSession] = await db.select()
        .from(sessions)
        .where(eq(sessions.id, session.id))

    const activeOrgId = currentSession?.activeOrganizationId || null

    // Find active org details (check both memberships and all orgs for super admin)
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
                activeOrg = {
                    ...org,
                    role: 'admin'
                }
            }
        }
    }

    // Build organizations list
    // Super admins see all orgs; regular users see only their memberships
    const orgList = isSuperAdmin
        ? allOrgs.map(org => ({
            id: org.id,
            name: org.name,
            code: org.code,
            logoUrl: org.logoUrl,
            role: 'admin' // Super admin has admin role on all orgs
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

        // If not null, verify user has access to this org (unless super admin)
        if (organizationId) {
            const isSuperAdmin = sessionUser.globalRole === 'super_admin'

            if (!isSuperAdmin) {
                const membership = await db.query.memberships.findFirst({
                    where: and(
                        eq(memberships.userId, sessionUser.id),
                        eq(memberships.organizationId, organizationId)
                    )
                })

                if (!membership) {
                    return c.json({ error: 'You do not have access to this organization' }, 403)
                }
            }

            // Verify org exists
            const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId))
            if (!org) {
                return c.json({ error: 'Organization not found' }, 404)
            }
        }

        // Update session with active org
        await db.update(sessions)
            .set({
                activeOrganizationId: organizationId,
                updatedAt: new Date()
            })
            .where(eq(sessions.id, session.id))

        return c.json({ success: true, activeOrganizationId: organizationId })
    }
)

export default app
