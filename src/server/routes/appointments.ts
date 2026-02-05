import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { appointments, projects, users, memberships } from '../../../db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'

const app = new Hono()

const getSession = async (c: any) => {
    return await auth.api.getSession({ headers: c.req.raw.headers });
}

// Get All Appointments (Global Calendar)
app.get('/', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    // Fetch full user to check role
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id))

    let appointmentsQuery;

    if (user && user.globalRole === 'super_admin') {
        // Super Admin sees all
        appointmentsQuery = db.select({
            id: appointments.id,
            description: appointments.description,
            date: appointments.date,
            projectId: appointments.projectId,
            projectName: projects.name
        })
            .from(appointments)
            .innerJoin(projects, eq(appointments.projectId, projects.id))
            .orderBy(desc(appointments.date))
    } else {
        // Regular user sees only their orgs' projects
        const userMemberships = await db.select({ orgId: memberships.organizationId })
            .from(memberships)
            .where(eq(memberships.userId, session.user.id))

        const orgIds = userMemberships.map(m => m.orgId)

        if (orgIds.length === 0) return c.json([])

        appointmentsQuery = db.select({
            id: appointments.id,
            description: appointments.description,
            date: appointments.date,
            projectId: appointments.projectId,
            projectName: projects.name
        })
            .from(appointments)
            .innerJoin(projects, eq(appointments.projectId, projects.id))
            .where(inArray(projects.organizationId, orgIds))
            .orderBy(desc(appointments.date))
    }

    const results = await appointmentsQuery
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

        const id = nanoid()
        const [newAppointment] = await db.insert(appointments).values({
            id,
            projectId,
            description,
            date: new Date(date)
        }).returning()

        return c.json(newAppointment)
    }
)

// Delete Appointment
app.delete('/:id', async (c) => {
    const session = await getSession(c)
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await db.delete(appointments).where(eq(appointments.id, id))
    return c.json({ success: true })
})

export default app
