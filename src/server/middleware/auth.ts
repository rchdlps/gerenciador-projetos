import { createMiddleware } from 'hono/factory'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { memberships } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { ORG_ROLES, hasMinRole, type OrgRole } from '@/lib/permissions'

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
        return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('user', session.user)
    c.set('session', session.session)
    await next()
})

/**
 * Organization-level access middleware. Checks membership + optional role hierarchy.
 *
 * Best suited for **org-scoped routes** where `orgId` is available as a param or header
 * (e.g., member management, org settings). For **project-scoped routes**, prefer
 * `canAccessProject()` from `@/lib/queries/scoped` — it handles the project→org lookup
 * chain and returns the membership for viewer checks in a single call.
 */
export const requireOrgAccess = (requiredRole?: OrgRole) => createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const orgId = c.req.param('orgId') || c.req.header('X-Organization-ID')

    if (!orgId) {
        throw new HTTPException(400, { message: 'Organization Context Missing' })
    }

    const membership = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, orgId)
        )
    })

    if (!membership) {
        if (user.globalRole === 'super_admin') {
            await next()
            return
        }
        throw new HTTPException(403, { message: 'Forbidden: No access to this Organization' })
    }

    // Role Hierarchy Check
    if (requiredRole) {
        if (!hasMinRole(membership.role, requiredRole)) {
            throw new HTTPException(403, { message: 'Forbidden: Insufficient Permissions' })
        }
    }

    c.set('membership', membership)
    await next()
})
