import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getCachedSession } from '@/server/middleware/auth'
import { users, sessions, memberships, organizations } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export type PageContext = {
    session: typeof auth.$Infer.Session
    user: typeof auth.$Infer.Session.user
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
 * Fetches auth session, active org, and scoped org IDs
 * in as few sequential round-trips as possible.
 *
 * Batch 1: auth.api.getSession() — session + user loaded by better-auth
 * Batch 2: Promise.all([sessionRow, membershipsWithOrgs, allOrgs?])
 *           — session.user already has globalRole/isActive, no separate user query needed
 *           — memberships include org details to avoid a 3rd query in buildOrgSessionData
 *
 * Result: 2 sequential batches instead of 4.
 */
export async function getPageContext(
    headers: Headers
): Promise<PageContext | null> {
    // Batch 1: Session validation (uses in-memory cache from auth middleware)
    const session = await getCachedSession(headers)
    if (!session) return null

    const isSuperAdmin = session.user.globalRole === 'super_admin'

    // Batch 2: session row + memberships (with org details) + allOrgs (super admin)
    // No separate user query — session.user already has id, globalRole, isActive
    const [sessionRows, membershipWithOrgs, allOrgs] = await Promise.all([
        db.select().from(sessions).where(eq(sessions.id, session.session.id)),
        // Include org details in membership query to avoid a 3rd batch
        db.query.memberships.findMany({
            where: eq(memberships.userId, session.user.id),
            with: { organization: true },
        }),
        isSuperAdmin
            ? db.select({
                id: organizations.id,
                name: organizations.name,
                code: organizations.code,
                logoUrl: organizations.logoUrl,
            }).from(organizations)
            : Promise.resolve([]),
    ])

    const sessionRow = sessionRows[0]
    if (!sessionRow) return null

    const activeOrgId = sessionRow.activeOrganizationId || null

    // Compute scoped org IDs in-memory (no extra DB call needed)
    let orgIds: string[] | null = null
    if (isSuperAdmin && !activeOrgId) {
        orgIds = null // Super admin sees all
    } else if (activeOrgId) {
        if (!isSuperAdmin) {
            const hasMembership = membershipWithOrgs.some(m => m.organizationId === activeOrgId)
            orgIds = hasMembership ? [activeOrgId] : []
        } else {
            orgIds = [activeOrgId]
        }
    } else {
        orgIds = membershipWithOrgs.map(m => m.organizationId)
    }

    // Build orgSessionData entirely in-memory (no extra queries)
    let activeOrganization = null
    if (activeOrgId) {
        const membership = membershipWithOrgs.find(m => m.organizationId === activeOrgId)
        if (membership) {
            activeOrganization = {
                id: membership.organization.id,
                name: membership.organization.name,
                code: membership.organization.code,
                logoUrl: membership.organization.logoUrl,
                role: membership.role,
            }
        } else if (isSuperAdmin) {
            const org = allOrgs.find(o => o.id === activeOrgId)
            if (org) {
                activeOrganization = { ...org, role: 'admin' }
            }
        }
    }

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
        orgList = membershipWithOrgs.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            code: m.organization.code,
            logoUrl: m.organization.logoUrl,
            role: m.role,
        }))
    }

    const orgSessionData: OrgSessionData = {
        activeOrganizationId: activeOrgId,
        activeOrganization,
        isSuperAdmin,
        organizations: orgList,
    }

    return {
        session,
        user: session.user,
        sessionRow,
        isSuperAdmin,
        activeOrgId,
        orgIds,
        orgSessionData,
    }
}
