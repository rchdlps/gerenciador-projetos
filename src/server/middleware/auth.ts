import { createMiddleware } from 'hono/factory'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { memberships, organizations } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

type Role = 'secretario' | 'gestor' | 'viewer'

export type AuthVariables = {
    user: typeof auth.$Infer.Session.user
    session: typeof auth.$Infer.Session.session
    membership?: typeof memberships.$inferSelect
}

export const getSession = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    })

    if (!session) {
        c.set('user', null as any)
        c.set('session', null as any)
    } else {
        c.set('user', session.user)
        c.set('session', session.session)
    }

    await next()
})

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    })

    if (!session) {
        throw new HTTPException(401, { message: 'Unauthorized' })
    }

    c.set('user', session.user)
    c.set('session', session.session)
    await next()
})

export const requireOrgAccess = (requiredRole?: Role) => createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' })
    }

    // Attempt to get Organization ID from params, query, or header
    // Strategy: Look for :orgId param, or explicit header X-Organization-ID
    // For now, let's assume specific routes will use :orgId param mostly.
    // Or we stick to project-based access where we look up the project first.

    // For specific Organization Management routes:
    const orgId = c.req.param('orgId') || c.req.header('X-Organization-ID')

    if (!orgId) {
        // If no org context, we can't check org access. 
        // Logic depends on usage. For now, let's assume this middleware is used on routes WITH orgId.
        throw new HTTPException(400, { message: 'Organization Context Missing' })
    }

    // Check Membership
    const membership = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, orgId)
        )
    })

    if (!membership) {
        // Check if Super Admin? (Not implemented yet, but good hook)
        if (user.globalRole === 'super_admin') {
            await next()
            return
        }
        throw new HTTPException(403, { message: 'Forbidden: No access to this Organization' })
    }

    // Role Hierarchy Check
    if (requiredRole) {
        const roles: Role[] = ['viewer', 'gestor', 'secretario']
        const userRoleIndex = roles.indexOf(membership.role as Role)
        const requiredRoleIndex = roles.indexOf(requiredRole)

        if (userRoleIndex < requiredRoleIndex) {
            throw new HTTPException(403, { message: 'Forbidden: Insufficient Permissions' })
        }
    }

    c.set('membership', membership)
    await next()
})
