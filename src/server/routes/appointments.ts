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

// Get All Appointments (Global Calendar)
app.get('/', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const isSuperAdmin = user.globalRole === 'super_admin'

    // Get active org from a fresh DB query (better-auth session object
    // may not include custom columns like activeOrganizationId)
    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.id))
    const activeOrgId = sessionRow?.activeOrganizationId || null

    // Use centralized scoped query logic with active org from session
    const orgIds = await getScopedOrgIds(user.id, activeOrgId, isSuperAdmin)
    const results = await scopedAppointments(orgIds)

    return c.json(results)
})

// Get Appointments for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

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
        const user = c.get('user')
        const session = c.get('session')
        if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

        const { projectId, description, date } = c.req.valid('json')

        // Verify Access
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
        if (!project) return c.json({ error: 'Project not found' }, 404)

        const [membership] = await db.select()
            .from(memberships)
            .where(and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, project.organizationId!)
            ))

        // Check access
        if ((!user || user.globalRole !== 'super_admin') && project.userId !== user.id && !membership) {
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
            userId: user.id,
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
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')

    // Get appointment info before deletion
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id))
    if (!appointment) return c.json({ error: 'Appointment not found' }, 404)

    const [project] = await db.select().from(projects).where(eq(projects.id, appointment.projectId))
    if (!project) return c.json({ error: 'Project not found' }, 404)

    const [membership] = await db.select()
        .from(memberships)
        .where(and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, project.organizationId!)
        ))

    // Check access
    if ((!user || user.globalRole !== 'super_admin') && project.userId !== user.id && !membership) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    // Viewers cannot delete appointments
    if (membership && membership.role === 'viewer' && user?.globalRole !== 'super_admin') {
        return c.json({ error: 'Visualizadores não podem excluir compromissos' }, 403)
    }

    await db.delete(appointments).where(eq(appointments.id, id))

    // Audit log
    await createAuditLog({
        userId: user.id,
        organizationId: project.organizationId,
        action: 'DELETE',
        resource: 'appointment',
        resourceId: id,
        metadata: { description: appointment.description, projectId: appointment.projectId }
    })

    return c.json({ success: true })
})

export default app
