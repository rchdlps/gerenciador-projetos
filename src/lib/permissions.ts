/**
 * Shared role hierarchy and permission helpers.
 *
 * Organization roles ordered from least to most privileged.
 * Index comparison drives all hierarchy checks across the codebase.
 */

export const ORG_ROLES = ['viewer', 'gestor', 'secretario'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/**
 * Check if `userRole` meets or exceeds `requiredRole` in the hierarchy.
 */
export function hasMinRole(userRole: string, requiredRole: OrgRole): boolean {
    const userIdx = ORG_ROLES.indexOf(userRole as OrgRole)
    const requiredIdx = ORG_ROLES.indexOf(requiredRole)
    return userIdx >= requiredIdx
}

/**
 * Check if a user can assign `targetRole` to another member.
 *
 * Rules:
 * - Super admins can assign any role.
 * - At least `gestor` is required to assign roles at all.
 * - Users can only assign roles at or below their own level.
 */
export function canAssignRole(userRole: string, targetRole: string, isSuperAdmin: boolean): boolean {
    if (isSuperAdmin) return true
    const userIdx = ORG_ROLES.indexOf(userRole as OrgRole)
    const targetIdx = ORG_ROLES.indexOf(targetRole as OrgRole)
    return targetIdx <= userIdx && userIdx >= 1 // At least gestor
}
