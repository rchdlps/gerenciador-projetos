import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { projects, memberships, users } from '../../../db/schema'
import { eq, desc, inArray, and } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { logAction } from '@/lib/audit'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

app.get('/', async (c) => {
    const user = c.get('user')

    // Get all organization IDs the user belongs to
    const userMemberships = await db.select({ orgId: memberships.organizationId })
        .from(memberships)
        .where(eq(memberships.userId, user.id))

    const orgIds = userMemberships.map(m => m.orgId)

    if (orgIds.length === 0) {
        return c.json([])
    }

    const userProjects = await db.select()
        .from(projects)
        .where(inArray(projects.organizationId, orgIds))
        .orderBy(desc(projects.updatedAt))

    return c.json(userProjects)
})

app.post('/',
    zValidator('json', z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        organizationId: z.string().min(1)
    })),
    async (c) => {
        const user = c.get('user')
        const { name, description, organizationId } = c.req.valid('json')

        // Verify user has access to this organization
        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, organizationId)
            )
        })

        if (!membership) {
            return c.json({ error: 'Forbidden: You do not have access to this organization' }, 403)
        }

        // Optional: Check if role allows creation (e.g. viewer cannot create)
        if (membership.role === 'viewer') {
            return c.json({ error: 'Forbidden: Viewers cannot create projects' }, 403)
        }

        const id = nanoid()

        const [newProject] = await db.insert(projects).values({
            id,
            name,
            description,
            userId: user.id, // Creator
            organizationId
        }).returning()

        // Audit Log
        await logAction({
            userId: user.id,
            organizationId,
            action: 'CREATE',
            resource: 'PROJECT',
            resourceId: id,
            metadata: { name }
        })

        return c.json(newProject)
    }
)

app.get('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    // Check if project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, id))
    if (!project) return c.json({ error: 'Not found' }, 404)

    // Check if user has access to the project's organization
    if (project.organizationId) {
        const membership = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, project.organizationId)
            )
        })
        if (!membership) return c.json({ error: 'Forbidden' }, 403)
    } else {
        // Fallback for legacy projects (if any) - only owner can see
        if (project.userId !== user.id) return c.json({ error: 'Forbidden' }, 403)
    }

    return c.json(project)
})

app.get('/:id/members', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    // Get project to find organization
    const [project] = await db.select().from(projects).where(eq(projects.id, id))
    if (!project) return c.json({ error: 'Not found' }, 404)

    if (!project.organizationId) {
        // Personal project? Return just the owner.
        const [owner] = await db.select().from(users).where(eq(users.id, project.userId))
        return c.json([owner])
    }

    // Verify access
    const membership = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.userId, user.id),
            eq(memberships.organizationId, project.organizationId)
        )
    })
    if (!membership) return c.json({ error: 'Forbidden' }, 403)

    // Fetch all members of the organization
    const members = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: memberships.role
    })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.organizationId, project.organizationId))

    return c.json(members)
})

export default app
