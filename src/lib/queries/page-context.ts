import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { users, sessions, memberships, organizations } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { getScopedOrgIds } from './scoped'

export type PageContext = {
    session: typeof auth.$Infer.Session
    user: typeof users.$inferSelect
    sessionRow: typeof sessions.$inferSelect
    isSuperAdmin: boolean
    activeOrgId: string | null
    orgIds: string[] | null
    orgSessionData: OrgSessionData | null
}

type OrgSessionData = {
    activeOrganizationId: string | null
    activeOrganization: any
    isSuperAdmin: boolean
    organizations: any[]
}

/**
 * Shared SSR page context loader.
 *
 * Fetches auth session, user row, active org, and scoped org IDs
 * in as few sequential round-trips as possible.
 *
 * Typical reduction: from 6–10 sequential queries down to 3 batches.
 *
 * Batch 1: auth.api.getSession()
 * Batch 2: Promise.all([userRow, sessionRow, userMemberships, allOrgs?])
 * Batch 3: getScopedOrgIds() (only if not already computable in-memory)
 */
export async function getPageContext(
    headers: Headers
): Promise<PageContext | null> {
    // Batch 1: Session validation (always required first)
    const session = await auth.api.getSession({ headers })
    if (!session) return null

    // Batch 2: Run user, session row, and memberships in parallel
    const [userRows, sessionRows, userMemberships, allOrgs] = await Promise.all([
        db.select().from(users).where(eq(users.id, session.user.id)),
        db.select().from(sessions).where(eq(sessions.id, session.session.id)),
        db.select({
            orgId: memberships.organizationId,
            role: memberships.role,
        }).from(memberships).where(eq(memberships.userId, session.user.id)),
        // Only fetch all orgs if user might be super_admin (check from session first)
        session.user.globalRole === 'super_admin'
            ? db.select({
                id: organizations.id,
                name: organizations.name,
                code: organizations.code,
                logoUrl: organizations.logoUrl,
            }).from(organizations)
            : Promise.resolve([]),
    ])

    const user = userRows[0]
    const sessionRow = sessionRows[0]

    if (!user || !sessionRow) return null

    const isSuperAdmin = user.globalRole === 'super_admin'
    const activeOrgId = sessionRow.activeOrganizationId || null

    // Compute scoped org IDs in-memory (no extra DB call needed)
    let orgIds: string[] | null = null
    if (isSuperAdmin && !activeOrgId) {
        orgIds = null // Super admin sees all
    } else if (activeOrgId) {
        // Verify user has access (unless super admin)
        if (!isSuperAdmin) {
            const hasMembership = userMemberships.some(m => m.orgId === activeOrgId)
            if (!hasMembership) {
                orgIds = [] // No access
            } else {
                orgIds = [activeOrgId]
            }
        } else {
            orgIds = [activeOrgId]
        }
    } else {
        orgIds = userMemberships.map(m => m.orgId)
    }

    // Build orgSessionData (same shape as GET /api/org-session)
    // so the layout sidebar gets its data without a separate API call
    let activeOrganization = null
    if (activeOrgId) {
        const membership = userMemberships.find(m => m.orgId === activeOrgId)
        if (membership) {
            const orgDetail = allOrgs.find(o => o.id === activeOrgId)
                || userMemberships.find(m => m.orgId === activeOrgId)
            // We need org name/code. Get from allOrgs if super admin, otherwise
            // we need to include org data in memberships query. For now, build
            // from the membership join data we have.
            activeOrganization = { id: activeOrgId, role: membership.role }
        } else if (isSuperAdmin) {
            const org = allOrgs.find(o => o.id === activeOrgId)
            if (org) {
                activeOrganization = { ...org, role: 'admin' }
            }
        }
    }

    // For orgSessionData, we need org details. If user is not super admin,
    // we need a lightweight membership-with-org query. Let's build from
    // what we already have when possible.
    const orgSessionData = await buildOrgSessionData(
        isSuperAdmin,
        activeOrgId,
        activeOrganization,
        userMemberships,
        allOrgs,
        session.user.id,
    )

    return {
        session,
        user,
        sessionRow,
        isSuperAdmin,
        activeOrgId,
        orgIds,
        orgSessionData,
    }
}

/**
 * Build org session data (same shape as GET /api/org-session response)
 * to feed the sidebar without an extra API call.
 */
async function buildOrgSessionData(
    isSuperAdmin: boolean,
    activeOrgId: string | null,
    activeOrganization: any,
    userMemberships: { orgId: string; role: string }[],
    allOrgs: { id: string; name: string; code: string; logoUrl: string | null }[],
    userId: string,
): Promise<OrgSessionData> {
    // For the org list in the sidebar, we need org names.
    // Super admins already have allOrgs. Regular users need a join query.
    let orgList: any[]

    if (isSuperAdmin) {
        orgList = allOrgs.map(org => ({
            id: org.id,
            name: org.name,
            code: org.code,
            logoUrl: org.logoUrl,
            role: 'admin',
        }))
    } else {
        // Regular users: we need org details. Do a single query with join.
        const membershipWithOrgs = await db.query.memberships.findMany({
            where: eq(memberships.userId, userId),
            with: { organization: true },
        })
        orgList = membershipWithOrgs.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            code: m.organization.code,
            logoUrl: m.organization.logoUrl,
            role: m.role,
        }))

        // Also fill in activeOrganization details if we have them
        if (activeOrgId && !activeOrganization?.name) {
            const activeMembership = membershipWithOrgs.find(m => m.organizationId === activeOrgId)
            if (activeMembership) {
                activeOrganization = {
                    id: activeMembership.organization.id,
                    name: activeMembership.organization.name,
                    code: activeMembership.organization.code,
                    logoUrl: activeMembership.organization.logoUrl,
                    role: activeMembership.role,
                }
            }
        }
    }

    return {
        activeOrganizationId: activeOrgId,
        activeOrganization,
        isSuperAdmin,
        organizations: orgList,
    }
}
