import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations, memberships, invitations } from '../../../db/schema'
import { eq, sql, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { sendMemberAddedEmail, sendMemberInviteEmail } from '@/lib/email/client'
import { nanoid } from 'nanoid'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Helper to get session
const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers })
}

// Role hierarchy check
const canAssignRole = (userRole: string, targetRole: string, isSuperAdmin: boolean): boolean => {
    if (isSuperAdmin) return true
    const roleHierarchy = ['viewer', 'gestor', 'secretario']
    const userRoleIndex = roleHierarchy.indexOf(userRole)
    const targetRoleIndex = roleHierarchy.indexOf(targetRole)
    // User can only assign roles at or below their level
    // Gestor cannot assign secretario
    return targetRoleIndex <= userRoleIndex && userRoleIndex >= 1 // At least gestor
}

// GET /api/members
// List members of a specific organization
app.get('/', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const orgId = c.req.query('orgId')
    const search = c.req.query('q') || ''

    if (!orgId) {
        return c.json({ error: 'Organization ID required' }, 400)
    }

    // Check access
    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

    // Check if user is member of this org (or super admin)
    const [userMembership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, orgId)
        ))

    if (!userMembership && !isSuperAdmin) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const userRole = userMembership?.role || 'secretario' // Super admin gets full access
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

    // Query members of this org
    const members = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        isActive: users.isActive,
        role: memberships.role
    })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(whereConditions)

    // Get org name
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))

    // Get pending invitations for this org
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

    const pendingInvitations = await db.select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt
    })
        .from(invitations)
        .where(pendingInvitationsWhere)

    return c.json({
        data: members,
        pendingInvitations,
        meta: {
            organizationId: orgId,
            organizationName: org?.name,
            canManage,
            userRole,
            total: members.length
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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { organizationId, email, name, role } = c.req.valid('json')

        // Check permissions
        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
        const isSuperAdmin = currentUser?.globalRole === 'super_admin'

        // Check user's role in this org
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, organizationId)
            ))

        if (!userMembership && !isSuperAdmin) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const userRole = userMembership?.role || 'secretario'

        // Check if user can manage (secretario/gestor)
        if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
            return c.json({ error: 'Viewers cannot invite members' }, 403)
        }

        // Check role hierarchy
        if (!canAssignRole(userRole, role, isSuperAdmin)) {
            return c.json({ error: 'Cannot assign a role higher than your own' }, 403)
        }

        // Get organization name for email
        const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId))
        if (!org) {
            return c.json({ error: 'Organization not found' }, 404)
        }

        // Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email))

        // Get base URL for email links
        const baseUrl = c.req.header('origin') || c.req.header('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:4321'

        if (existingUser) {
            // User exists - check if already member
            const [existingMember] = await db.select().from(memberships).where(and(
                eq(memberships.userId, existingUser.id),
                eq(memberships.organizationId, organizationId)
            ))

            if (existingMember) {
                return c.json({ error: 'Usuário já é membro desta organização' }, 400)
            }

            // Add membership for existing user
            await db.insert(memberships).values({
                userId: existingUser.id,
                organizationId,
                role
            })

            // Send notification email to existing user
            await sendMemberAddedEmail(email, org.name, role, `${baseUrl}/login`)

            // Audit log
            await createAuditLog({
                userId: session.user.id,
                organizationId,
                action: 'CREATE',
                resource: 'membership',
                resourceId: existingUser.id,
                metadata: { email, name, role, type: 'existing_user' }
            })

            return c.json({ success: true, userId: existingUser.id, type: 'existing_user' })
        }

        // New user - check for pending invitation
        const [existingInvite] = await db.select().from(invitations).where(and(
            eq(invitations.email, email),
            eq(invitations.organizationId, organizationId),
            eq(invitations.status, 'pending')
        ))

        if (existingInvite) {
            return c.json({ error: 'Já existe um convite pendente para este email' }, 400)
        }

        // Create invitation for new user
        const token = nanoid(32)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

        await db.insert(invitations).values({
            id: nanoid(),
            email,
            role,
            organizationId,
            token,
            expiresAt,
            inviterId: session.user.id,
            status: 'pending'
        })

        // Send invitation email
        const inviteLink = `${baseUrl}/accept-invite/${token}`
        await sendMemberInviteEmail(email, org.name, role, inviteLink)

        // Audit log
        await createAuditLog({
            userId: session.user.id,
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
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const userIdToUpdate = c.req.param('userId')
        const { organizationId, role } = c.req.valid('json')

        // Check permissions
        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
        const isSuperAdmin = currentUser?.globalRole === 'super_admin'

        // Check user's role in this org
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, organizationId)
            ))

        if (!userMembership && !isSuperAdmin) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const userRole = userMembership?.role || 'secretario'

        // Check if user can manage
        if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
            return c.json({ error: 'Viewers cannot modify members' }, 403)
        }

        // Cannot modify own role (unless super admin)
        if (userIdToUpdate === session.user.id && !isSuperAdmin) {
            return c.json({ error: 'Cannot modify your own role' }, 403)
        }

        // Check role hierarchy
        if (!canAssignRole(userRole, role, isSuperAdmin)) {
            return c.json({ error: 'Cannot assign a role higher than your own' }, 403)
        }

        // Check if target membership exists
        const [targetMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, userIdToUpdate),
                eq(memberships.organizationId, organizationId)
            ))

        if (!targetMembership) {
            return c.json({ error: 'Member not found in this organization' }, 404)
        }

        // Update role
        await db.update(memberships)
            .set({ role })
            .where(and(
                eq(memberships.userId, userIdToUpdate),
                eq(memberships.organizationId, organizationId)
            ))

        // Audit log
        await createAuditLog({
            userId: session.user.id,
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
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const userIdToRemove = c.req.param('userId')
    const orgId = c.req.query('orgId')

    if (!orgId) {
        return c.json({ error: 'Organization ID required' }, 400)
    }

    // Check permissions
    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

    // Check user's role in this org
    const [userMembership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, orgId)
        ))

    if (!userMembership && !isSuperAdmin) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const userRole = userMembership?.role || 'secretario'

    // Check if user can manage
    if (!isSuperAdmin && !['secretario', 'gestor'].includes(userRole)) {
        return c.json({ error: 'Viewers cannot remove members' }, 403)
    }

    // Cannot remove self
    if (userIdToRemove === session.user.id) {
        return c.json({ error: 'Cannot remove yourself from the organization' }, 403)
    }

    // Check if target membership exists
    const [targetMembership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, userIdToRemove),
            eq(memberships.organizationId, orgId)
        ))

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

    // Delete membership
    await db.delete(memberships)
        .where(and(
            eq(memberships.userId, userIdToRemove),
            eq(memberships.organizationId, orgId)
        ))

    // Audit log
    await createAuditLog({
        userId: session.user.id,
        organizationId: orgId,
        action: 'DELETE',
        resource: 'membership',
        resourceId: userIdToRemove,
        metadata: { removedRole: targetMembership.role }
    })

    return c.json({ success: true })
})

// POST /api/members/invitations/:id/resend
// Resend invitation email
app.post('/invitations/:id/resend', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const invitationId = c.req.param('id')

    // Get the invitation
    const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))

    if (!invitation) {
        return c.json({ error: 'Invitation not found' }, 404)
    }

    if (invitation.status !== 'pending') {
        return c.json({ error: 'Invitation is no longer pending' }, 400)
    }

    // Check permissions
    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

    if (!isSuperAdmin && invitation.organizationId) {
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, invitation.organizationId)
            ))

        if (!userMembership || !['secretario', 'gestor'].includes(userMembership.role)) {
            return c.json({ error: 'Forbidden' }, 403)
        }
    }

    // Get organization name
    const [org] = invitation.organizationId
        ? await db.select().from(organizations).where(eq(organizations.id, invitation.organizationId))
        : [null]

    // Update expiration date
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    await db.update(invitations)
        .set({ expiresAt: newExpiresAt, updatedAt: new Date() })
        .where(eq(invitations.id, invitationId))

    // Get base URL for email links
    const baseUrl = c.req.header('origin') || c.req.header('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:4321'

    // Resend invitation email
    const inviteLink = `${baseUrl}/accept-invite/${invitation.token}`
    await sendMemberInviteEmail(invitation.email, org?.name || 'Sistema', invitation.role, inviteLink)

    return c.json({ success: true })
})

// DELETE /api/members/invitations/:id
// Cancel/delete a pending invitation
app.delete('/invitations/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const invitationId = c.req.param('id')

    // Get the invitation
    const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))

    if (!invitation) {
        return c.json({ error: 'Invitation not found' }, 404)
    }

    // Check permissions
    const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id))
    const isSuperAdmin = currentUser?.globalRole === 'super_admin'

    if (!isSuperAdmin && invitation.organizationId) {
        const [userMembership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, invitation.organizationId)
            ))

        if (!userMembership || !['secretario', 'gestor'].includes(userMembership.role)) {
            return c.json({ error: 'Forbidden' }, 403)
        }
    }

    // Delete the invitation
    await db.delete(invitations).where(eq(invitations.id, invitationId))

    // Audit log
    await createAuditLog({
        userId: session.user.id,
        organizationId: invitation.organizationId,
        action: 'DELETE',
        resource: 'invitation',
        resourceId: invitation.email,
        metadata: { email: invitation.email, role: invitation.role }
    })

    return c.json({ success: true })
})

export default app
