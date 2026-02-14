import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { appointments, projects, users, memberships, sessions } from '../../../db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { getScopedOrgIds, scopedAppointments, canAccessProject } from '@/lib/queries/scoped'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get All Appointments (Global Calendar)
app.get('/', async (c) => {
    const authSession = await getSession(c)
    if (!authSession) return c.json({ error: 'Unauthorized' }, 401)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, authSession.user.id))
    const isSuperAdmin = user?.globalRole === 'super_admin'

    // Get active org from session
    const [sessionData] = await db.select()
        .from(sessions)
        .where(eq(sessions.id, authSession.session.id))

    const activeOrgId = sessionData?.activeOrganizationId || null

    // Use centralized scoped query logic with active org from session
    const orgIds = await getScopedOrgIds(authSession.user.id, activeOrgId, isSuperAdmin)
    const results = await scopedAppointments(orgIds)

    return c.json(results)
})

// Get Appointments for Project
app.get('/:projectId', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')

    // Verify Access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    // TODO: stricter role check?

    const projectAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.projectId, projectId))
        .orderBy(desc(appointments.date))

    console.log(`[DEBUG] Project Appointments:`, {
        projectId,
        count: projectAppointments.length,
        first: projectAppointments[0]
    })

    return c.json(projectAppointments)
})

// Create Appointment
app.post('/',
    zValidator('json', z.object({
        projectId: z.string(),
        description: z.string(),
        date: z.string()
    })),
    async (c) => {
        const session = await getSession(c)
        if (!session) return c.json({ error: 'Unauthorized' }, 401)

        const { projectId, description, date } = c.req.valid('json')

        // Verify Access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, project.organizationId!)
            ))

        // Check access
        if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        // Viewers cannot create appointments
        if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
            return c.json({ error: 'Visualizadores não podem criar compromissos' }, 403)
        }

        const id = nanoid()
        const [newAppointment] = await db.insert(appointments).values({
            id,
            projectId,
            description,
            date: new Date(date)
        }).returning()

        // Audit log
        await createAuditLog({
            userId: session.user.id,
            organizationId: project.organizationId,
            action: 'CREATE',
            resource: 'appointment',
            resourceId: id,
            metadata: { description, date, projectId }
        })

        return c.json(newAppointment)
    }
)

// Delete Appointment
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Get appointment info before deletion
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id))
    if (!appointment) return c.json({ error: 'Appointment not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, appointment.projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, session.user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    // Check access
    if ((!user || user.globalRole !== 'super_admin') && project.userId !== session.user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Viewers cannot delete appointments
    if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
        return c.json({ error: 'Visualizadores não podem excluir compromissos' }, 403)
    }

    await db.delete(appointments).where(eq(appointments.id, id))

    // Audit log
    await createAuditLog({
        userId: session.user.id,
        organizationId: project.organizationId,
        action: 'DELETE',
        resource: 'appointment',
        resourceId: id,
        metadata: { description: appointment.description, projectId: appointment.projectId }
    })

    return c.json({ success: true })
})

export default app
