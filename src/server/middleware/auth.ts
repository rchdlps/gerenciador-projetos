import { createMiddleware } from 'hono/factory'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { memberships, sessions } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { ORG_ROLES, hasMinRole, type OrgRole } from '@/lib/permissions'

export type AuthVariables = {
    activeOrgId: string | null
    user: typeof auth.$Infer.Session.user
    session: typeof auth.$Infer.Session.session
    membership?: typeof memberships.$inferSelect
}

// ── In-memory session cache ──────────────────────────────────────────
// Avoids calling auth.api.getSession() (which hits the DB) on every
// single API request. TTL of 30s means sessions are re-validated at most
// once every 30 seconds per token. Concurrent requests with the same
// token share a single in-flight promise (deduplication).
const SESSION_CACHE_TTL = 30_000 // 30 seconds
const SESSION_CACHE_MAX = 500    // max entries before cleanup

type CachedSession = {
    data: typeof auth.$Infer.Session | null
    expiresAt: number
}

const sessionCache = new Map<string, CachedSession>()
// Track in-flight promises to deduplicate concurrent requests
const inflightSessions = new Map<string, Promise<typeof auth.$Infer.Session | null>>()

function extractSessionToken(headers: Headers): string | null {
    const cookie = headers.get('cookie')
    if (!cookie) return null

    const match = cookie.match(/better-auth\.session_token=([^;]+)/)
    return match?.[1] || null
}

function cleanupCache() {
    if (sessionCache.size <= SESSION_CACHE_MAX) return
    const now = Date.now()
    for (const [key, entry] of sessionCache) {
        if (entry.expiresAt < now) sessionCache.delete(key)
    }
    // If still over limit, remove oldest entries
    if (sessionCache.size > SESSION_CACHE_MAX) {
        const entries = [...sessionCache.entries()]
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        const toRemove = entries.slice(0, entries.length - SESSION_CACHE_MAX)
        for (const [key] of toRemove) sessionCache.delete(key)
    }
}

/**
 * Build minimal headers for auth.api.getSession().
 *
 * better-auth's origin-check middleware validates the Origin header on
 * non-GET requests and throws APIError("FORBIDDEN") when it doesn't match
 * trustedOrigins. That check is meant for browser→auth-endpoint calls,
 * NOT for server-side session lookups. We only need the cookie header.
 */
function sessionOnlyHeaders(headers: Headers): Headers {
    const h = new Headers()
    const cookie = headers.get('cookie')
    if (cookie) h.set('cookie', cookie)
    return h
}

export async function getCachedSession(headers: Headers): Promise<typeof auth.$Infer.Session | null> {
    const token = extractSessionToken(headers)
    const safeHeaders = sessionOnlyHeaders(headers)

    if (!token) return auth.api.getSession({ headers: safeHeaders })

    const now = Date.now()

    // Check cache
    const cached = sessionCache.get(token)
    if (cached && cached.expiresAt > now) {
        return cached.data
    }

    // Deduplicate concurrent requests for the same token
    const inflight = inflightSessions.get(token)
    if (inflight) return inflight

    // Fetch and cache
    const promise = auth.api.getSession({ headers: safeHeaders }).then(session => {
        sessionCache.set(token, { data: session, expiresAt: now + SESSION_CACHE_TTL })
        inflightSessions.delete(token)
        cleanupCache()
        return session
    }).catch(err => {
        inflightSessions.delete(token)
        throw err
    })

    inflightSessions.set(token, promise)
    return promise
}

/** Invalidate cache for a token (call after sign-out, org switch, etc.) */
export function invalidateSessionCache(token?: string) {
    if (token) {
        sessionCache.delete(token)
    } else {
        sessionCache.clear()
    }
}
// ─────────────────────────────────────────────────────────────────────

export const getSession = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const session = await getCachedSession(c.req.raw.headers)

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
    const session = await getCachedSession(c.req.raw.headers)

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('user', session.user)
    c.set('session', session.session)

    // Fetch activeOrganizationId once (avoids redundant session queries in routes)
    const [sessionRow] = await db.select({ activeOrganizationId: sessions.activeOrganizationId })
        .from(sessions).where(eq(sessions.id, session.session.id))
    c.set('activeOrgId', sessionRow?.activeOrganizationId || null)
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
