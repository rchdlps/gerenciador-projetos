import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { appointments, projects } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'
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

    // Get active org from middleware-cached value
    const activeOrgId = c.get('activeOrgId')

    // Use centralized scoped query logic with active org from session
    const orgIds = await getScopedOrgIds(user.id, activeOrgId, isSuperAdmin)
    const results = await scopedAppointments(orgIds)

    return c.json(results)
})

// Get Appointments for Project
app.get('/:projectId', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const projectId = c.req.param('projectId')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Access check and data fetch in parallel
    const [access, projectAppointments] = await Promise.all([
        canAccessProject(projectId, user.id, isSuperAdmin),
        db.select()
            .from(appointments)
            .where(eq(appointments.projectId, projectId))
            .orderBy(desc(appointments.date)),
    ])

    if (!access.project) return c.json({ error: 'Project not found' }, 404)
    if (!access.allowed) return c.json({ error: 'Forbidden' }, 403)

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
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { projectId, description, date } = c.req.valid('json')
        const isSuperAdmin = user.globalRole === 'super_admin'

        const { allowed, project, membership } = await canAccessProject(projectId, user.id, isSuperAdmin)
        if (!project) return c.json({ error: 'Project not found' }, 404)
        if (!allowed) return c.json({ error: 'Forbidden' }, 403)

        // Viewers cannot create appointments
        if (membership?.role === 'viewer' && !isSuperAdmin) {
            return c.json({ error: 'Visualizadores não podem criar compromissos' }, 403)
        }

        const id = nanoid()
        const [newAppointment] = await db.insert(appointments).values({
            id,
            projectId,
            description,
            date: new Date(date)
        }).returning()

        createAuditLog({
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
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const isSuperAdmin = user.globalRole === 'super_admin'

    // Single join: appointment → project
    const [row] = await db.select({
        appointment: appointments,
        projectOrgId: projects.organizationId,
        projectUserId: projects.userId,
    })
        .from(appointments)
        .innerJoin(projects, eq(projects.id, appointments.projectId))
        .where(eq(appointments.id, id))

    if (!row) return c.json({ error: 'Appointment not found' }, 404)

    const { allowed, membership } = await canAccessProject(row.appointment.projectId, user.id, isSuperAdmin)
    if (!allowed) return c.json({ error: 'Forbidden' }, 403)

    // Viewers cannot delete appointments
    if (membership?.role === 'viewer' && !isSuperAdmin) {
        return c.json({ error: 'Visualizadores não podem excluir compromissos' }, 403)
    }

    await db.delete(appointments).where(eq(appointments.id, id))

    createAuditLog({
        userId: user.id,
        organizationId: row.projectOrgId,
        action: 'DELETE',
        resource: 'appointment',
        resourceId: id,
        metadata: { description: row.appointment.description, projectId: row.appointment.projectId }
    })

    return c.json({ success: true })
})

export default app
