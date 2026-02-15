import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations, memberships, invitations } from '../../../db/schema'
import { eq, sql, and, ne } from 'drizzle-orm'
import { createAuditLog } from '@/lib/audit-logger'
import { sendMemberAddedEmail, sendMemberInviteEmail } from '@/lib/email/client'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { canAssignRole } from '@/lib/permissions'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// GET /api/members
// List members of a specific organization
app.get('/', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const orgId = c.req.query('orgId')
    const search = c.req.query('q') || ''

    if (!orgId) {
        return c.json({ error: 'Organization ID required' }, 400)
    }

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Check if user is member of this org (or super admin)
    const [userMembership] = isSuperAdmin
        ? [null]
        : await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, orgId)
            ))

    if (!userMembership && !isSuperAdmin) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const userRole = userMembership?.role || 'secretario'
    const canManage = isSuperAdmin || userRole === 'secretario' || userRole === 'gestor'

    // Build where conditions
    const whereConditions = search
        ? and(
            eq(memberships.organizationId, orgId),
            ne(users.globalRole, 'super_admin'),
            sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`
        )
        : and(
            eq(memberships.organizationId, orgId),
            ne(users.globalRole, 'super_admin')
        )

    const pendingInvitationsWhere = search
        ? and(
            eq(invitations.organizationId, orgId),
            eq(invitations.status, 'pending'),
            sql`${invitations.email} ILIKE ${`%${search}%`}`
        )
        : and(
            eq(invitations.organizationId, orgId),
            eq(invitations.status, 'pending')
        )

    // Parallelize: members + org + pending invitations
    const [membersList, [org], pendingInvitations] = await Promise.all([
        db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            isActive: users.isActive,
            role: memberships.role
        })
            .from(memberships)
            .innerJoin(users, eq(memberships.userId, users.id))
            .where(whereConditions),

        db.select().from(organizations).where(eq(organizations.id, orgId)),

        db.select({
            id: invitations.id,
            email: invitations.email,
            role: invitations.role,
            createdAt: invitations.createdAt,
            expiresAt: invitations.expiresAt
        })
            .from(invitations)
            .where(pendingInvitationsWhere),
    ])

    return c.json({
        data: membersList,
        pendingInvitations,
        meta: {
            organizationId: orgId,
            organizationName: org?.name,
            canManage,
            userRole,
            total: membersList.length
        }
    })
})

// POST /api/members
// Invite/add user to organization
app.post('/',
    zValidator('json', z.object({
        organizationId: z.string(),
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['secretario', 'gestor', 'viewer'])
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { organizationId, email, name, role } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'

        // Check user's role in this org
        const [userMembership] = isSuperAdmin
            ? [null]
            : await db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, organizationId)
                ))

        if (!userMembership && !isSuperAdmin) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const userRole = userMembership?.role || 'secretario'

        if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
            return c.json({ error: 'Viewers cannot invite members' }, 403)
        }

        if (!canAssignRole(userRole, role, isSuperAdmin)) {
            return c.json({ error: 'Cannot assign a role higher than your own' }, 403)
        }

        // Parallelize: get org + check if user exists
        const [[org], [existingUser]] = await Promise.all([
            db.select().from(organizations).where(eq(organizations.id, organizationId)),
            db.select().from(users).where(eq(users.email, email)),
        ])

        if (!org) return c.json({ error: 'Organization not found' }, 404)

        const baseUrl = c.req.header('origin') || c.req.header('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:4321'

        if (existingUser) {
            // Check if already member
            const [existingMember] = await db.select().from(memberships).where(and(
                eq(memberships.userId, existingUser.id),
                eq(memberships.organizationId, organizationId)
            ))

            if (existingMember) {
                return c.json({ error: 'Usuário já é membro desta organização' }, 400)
            }

            // Add membership
            await db.insert(memberships).values({
                userId: existingUser.id,
                organizationId,
                role
            })

            // Fire-and-forget: email + audit
            sendMemberAddedEmail(email, org.name, role, `${baseUrl}/login`)
            createAuditLog({
                userId: user.id,
                organizationId,
                action: 'CREATE',
                resource: 'membership',
                resourceId: existingUser.id,
                metadata: { email, name, role, type: 'existing_user' }
            })

            return c.json({ success: true, userId: existingUser.id, type: 'existing_user' })
        }

        // New user — check for pending invitation
        const [existingInvite] = await db.select().from(invitations).where(and(
            eq(invitations.email, email),
            eq(invitations.organizationId, organizationId),
            eq(invitations.status, 'pending')
        ))

        if (existingInvite) {
            return c.json({ error: 'Já existe um convite pendente para este email' }, 400)
        }

        // Create invitation
        const token = nanoid(32)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await db.insert(invitations).values({
            id: nanoid(),
            email,
            role,
            organizationId,
            token,
            expiresAt,
            inviterId: user.id,
            status: 'pending'
        })

        // Fire-and-forget: email + audit
        const inviteLink = `${baseUrl}/accept-invite/${token}`
        sendMemberInviteEmail(email, org.name, role, inviteLink)
        createAuditLog({
            userId: user.id,
            organizationId,
            action: 'CREATE',
            resource: 'invitation',
            resourceId: email,
            metadata: { email, name, role, type: 'new_user' }
        })

        return c.json({ success: true, type: 'invitation_sent' })
    }
)

// PATCH /api/members/:userId
// Update member's role in organization
app.patch('/:userId',
    zValidator('json', z.object({
        organizationId: z.string(),
        role: z.enum(['secretario', 'gestor', 'viewer'])
    })),
    async (c) => {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const userIdToUpdate = c.req.param('userId')
        const { organizationId, role } = c.req.valid('json')

        const isSuperAdmin = user.globalRole === 'super_admin'

        // Parallelize: user's membership + target membership
        const [[userMembership], [targetMembership]] = await Promise.all([
            isSuperAdmin
                ? [null as any]
                : db.select()
                    .from(memberships)
                    .where(and(
                        eq(memberships.userId, user.id),
                        eq(memberships.organizationId, organizationId)
                    )),
            db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, userIdToUpdate),
                    eq(memberships.organizationId, organizationId)
                )),
        ])

        if (!userMembership && !isSuperAdmin) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const userRole = userMembership?.role || 'secretario'

        if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
            return c.json({ error: 'Viewers cannot modify members' }, 403)
        }

        if (userIdToUpdate === user.id && !isSuperAdmin) {
            return c.json({ error: 'Cannot modify your own role' }, 403)
        }

        if (!canAssignRole(userRole, role, isSuperAdmin)) {
            return c.json({ error: 'Cannot assign a role higher than your own' }, 403)
        }

        if (!targetMembership) {
            return c.json({ error: 'Member not found in this organization' }, 404)
        }

        await db.update(memberships)
            .set({ role })
            .where(and(
                eq(memberships.userId, userIdToUpdate),
                eq(memberships.organizationId, organizationId)
            ))

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId,
            action: 'UPDATE',
            resource: 'membership',
            resourceId: userIdToUpdate,
            metadata: { newRole: role, previousRole: targetMembership.role }
        })

        return c.json({ success: true })
    }
)

// DELETE /api/members/:userId
// Remove user from organization
app.delete('/:userId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const userIdToRemove = c.req.param('userId')
    const orgId = c.req.query('orgId')

    if (!orgId) {
        return c.json({ error: 'Organization ID required' }, 400)
    }

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Parallelize: user's membership + target membership
    const [[userMembership], [targetMembership]] = await Promise.all([
        isSuperAdmin
            ? [null as any]
            : db.select()
                .from(memberships)
                .where(and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, orgId)
                )),
        db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, userIdToRemove),
                eq(memberships.organizationId, orgId)
            )),
    ])

    if (!userMembership && !isSuperAdmin) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const userRole = userMembership?.role || 'secretario'

    if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
        return c.json({ error: 'Viewers cannot remove members' }, 403)
    }

    if (userIdToRemove === user.id) {
        return c.json({ error: 'Cannot remove yourself from the organization' }, 403)
    }

    if (!targetMembership) {
        return c.json({ error: 'Member not found in this organization' }, 404)
    }

    // Check if this is the last secretario
    if (targetMembership.role === 'secretario') {
        const secretarios = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.organizationId, orgId),
                eq(memberships.role, 'secretario')
            ))

        if (secretarios.length === 1) {
            return c.json({ error: 'Cannot remove the last administrator of the organization' }, 403)
        }
    }

    await db.delete(memberships)
        .where(and(
            eq(memberships.userId, userIdToRemove),
            eq(memberships.organizationId, orgId)
        ))

    // Fire-and-forget audit
    createAuditLog({
        userId: user.id,
        organizationId: orgId,
        action: 'DELETE',
        resource: 'membership',
        resourceId: userIdToRemove,
        metadata: { removedRole: targetMembership.role }
    })

    return c.json({ success: true })
})

// POST /api/members/invitations/:id/resend
app.post('/invitations/:id/resend', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const invitationId = c.req.param('id')

    const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))

    if (!invitation) return c.json({ error: 'Invitation not found' }, 404)
    if (invitation.status !== 'pending') return c.json({ error: 'Invitation is no longer pending' }, 400)

    const isSuperAdmin = user.globalRole === 'super_admin'

    if (!isSuperAdmin && invitation.organizationId) {
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, invitation.organizationId)
            ))

        if (!userMembership || !['secretario', 'gestor'].includes(userMembership.role)) {
            return c.json({ error: 'Forbidden' }, 403)
        }
    }

    // Parallelize: get org name + update expiration
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    const [orgResult] = await Promise.all([
        invitation.organizationId
            ? db.select().from(organizations).where(eq(organizations.id, invitation.organizationId))
            : Promise.resolve([null]),
        db.update(invitations)
            .set({ expiresAt: newExpiresAt, updatedAt: new Date() })
            .where(eq(invitations.id, invitationId)),
    ])

    const org = orgResult?.[0] || orgResult

    const baseUrl = c.req.header('origin') || c.req.header('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:4321'
    const inviteLink = `${baseUrl}/accept-invite/${invitation.token}`

    // Fire-and-forget email
    sendMemberInviteEmail(invitation.email, (org as any)?.name || 'Sistema', invitation.role, inviteLink)

    return c.json({ success: true })
})

// DELETE /api/members/invitations/:id
app.delete('/invitations/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const invitationId = c.req.param('id')

    const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))

    if (!invitation) return c.json({ error: 'Invitation not found' }, 404)

    const isSuperAdmin = user.globalRole === 'super_admin'

    if (!isSuperAdmin && invitation.organizationId) {
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, invitation.organizationId)
            ))

        if (!userMembership || !['secretario', 'gestor'].includes(userMembership.role)) {
            return c.json({ error: 'Forbidden' }, 403)
        }
    }

    await db.delete(invitations).where(eq(invitations.id, invitationId))

    // Fire-and-forget audit
    createAuditLog({
        userId: user.id,
        organizationId: invitation.organizationId,
        action: 'DELETE',
        resource: 'invitation',
        resourceId: invitation.email,
        metadata: { email: invitation.email, role: invitation.role }
    })

    return c.json({ success: true })
})

export default app
