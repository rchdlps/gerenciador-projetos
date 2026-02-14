import { db } from '@/lib/db'
import { projects, memberships, tasks, projectPhases, appointments, stakeholders, organizations } from '../../../db/schema'
import { eq, inArray, desc, and } from 'drizzle-orm'

/**
 * Get organization IDs the user can access based on context
 * 
 * @param userId - Current user ID
 * @param activeOrgId - Active organization from session (if set)
 * @param isSuperAdmin - Whether user is a super admin
 * @returns Array of org IDs to filter by, or null for no filter (super admin sees all)
 */
export async function getScopedOrgIds(
    userId: string,
    activeOrgId: string | null,
    isSuperAdmin: boolean
): Promise<string[] | null> {
    // Super admin with no active org filter sees everything
    if (isSuperAdmin && !activeOrgId) {
        return null
    }

    // If active org is set, scope to just that org
    if (activeOrgId) {
        // Verify user has access (unless super admin)
        if (!isSuperAdmin) {
            const membership = await db.query.memberships.findFirst({
                where: and(
                    eq(memberships.userId, userId),
                    eq(memberships.organizationId, activeOrgId)
                )
            })
            if (!membership) {
                return [] // No access = empty results
            }
        }
        return [activeOrgId]
    }

    // Fallback: get all orgs user belongs to
    const userMemberships = await db.select({ orgId: memberships.organizationId })
        .from(memberships)
        .where(eq(memberships.userId, userId))

    return userMemberships.map(m => m.orgId)
}

/**
 * Get user's memberships for org switcher
 */
export async function getUserOrganizations(userId: string) {
    return db.query.memberships.findMany({
        where: eq(memberships.userId, userId),
        with: {
            organization: true
        }
    })
}

// ============= SCOPED QUERY HELPERS =============

/**
 * Get projects scoped to org IDs
 */
export async function scopedProjects(orgIds: string[] | null) {
    if (orgIds === null) {
        // No filter - return all
        return db.select().from(projects).orderBy(desc(projects.updatedAt))
    }
    if (orgIds.length === 0) {
        return []
    }
    return db.select()
        .from(projects)
        .where(inArray(projects.organizationId, orgIds))
        .orderBy(desc(projects.updatedAt))
}

/**
 * Check if user can access a specific project.
 *
 * Returns the project and the user's org membership (if any) so callers
 * can make further role-based decisions (e.g. blocking viewers from writes)
 * without a second DB round-trip.
 */
export async function canAccessProject(
    projectId: string,
    userId: string,
    isSuperAdmin: boolean
): Promise<{
    allowed: boolean;
    project: typeof projects.$inferSelect | null;
    membership: typeof memberships.$inferSelect | null;
}> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

    if (!project) {
        return { allowed: false, project: null, membership: null }
    }

    // Super admin can access all
    if (isSuperAdmin) {
        return { allowed: true, project, membership: null }
    }

    // Check org membership
    if (project.organizationId) {
        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, userId),
                eq(memberships.organizationId, project.organizationId)
            )
        }) ?? null
        return { allowed: !!membership || project.userId === userId, project, membership }
    }

    // Legacy personal project - only owner
    return { allowed: project.userId === userId, project, membership: null }
}

/**
 * Get appointments scoped to org IDs (with project join)
 */
export async function scopedAppointments(orgIds: string[] | null) {
    const baseQuery = {
        id: appointments.id,
        description: appointments.description,
        date: appointments.date,
        projectId: appointments.projectId,
        projectName: projects.name
    }

    if (orgIds === null) {
        // No filter - return all
        return db.select(baseQuery)
            .from(appointments)
            .innerJoin(projects, eq(appointments.projectId, projects.id))
            .orderBy(desc(appointments.date))
    }
    if (orgIds.length === 0) {
        return []
    }
    return db.select(baseQuery)
        .from(appointments)
        .innerJoin(projects, eq(appointments.projectId, projects.id))
        .where(inArray(projects.organizationId, orgIds))
        .orderBy(desc(appointments.date))
}
/**
 * Get all organizations for super admins
 */
export async function getAllOrganizations() {
    return db.query.organizations.findMany({
        orderBy: desc(organizations.code)
    })
}
