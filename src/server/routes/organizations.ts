import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { organizations, memberships } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { createAuditLog } from '@/lib/audit-logger'
import { invalidateOrgCache } from '@/lib/queries/page-context'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

app.get('/', async (c) => {
    const user = c.get('user')

    // Super Admin sees all organizations
    if (user && user.globalRole === 'super_admin') {
        const allOrgs = await db.select().from(organizations)
        return c.json(allOrgs.map(o => ({
            ...o,
            userRole: 'super_admin'
        })))
    }

    // Get organizations the user is a member of
    const userOrgs = await db.select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
        logoUrl: organizations.logoUrl,
        userRole: memberships.role
    })
        .from(memberships)
        .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
        .where(eq(memberships.userId, user.id))

    return c.json(userOrgs)
})

app.get('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    // Super admin: just fetch org
    if (user && user.globalRole === 'super_admin') {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, id))
        if (!org) return c.json({ error: 'Not found' }, 404)
        return c.json(org)
    }

    // Parallelize: org fetch + membership check
    const [[org], membership] = await Promise.all([
        db.select().from(organizations).where(eq(organizations.id, id)),
        db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, id)
            )
        }),
    ])

    if (!org) return c.json({ error: 'Not found' }, 404)
    if (!membership) return c.json({ error: 'Forbidden' }, 403)

    return c.json(org)
})

// Create Organization (Super Admin Only)
app.post('/',
    zValidator('json', z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        logoUrl: z.string().optional(),
        secretario: z.string().optional(),
        secretariaAdjunta: z.string().optional(),
        diretoriaTecnica: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user') as any

        if (user.globalRole !== 'super_admin') {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const { name, code, logoUrl, secretario, secretariaAdjunta, diretoriaTecnica } = c.req.valid('json')
        const id = nanoid()

        // Insert org first (membership depends on it via FK)
        await db.insert(organizations).values({
            id,
            name,
            code,
            logoUrl,
            secretario,
            secretariaAdjunta,
            diretoriaTecnica
        })

        // Auto-add creator as 'secretario' — depends on org existing
        await db.insert(memberships).values({
            userId: user.id,
            organizationId: id,
            role: 'secretario'
        })

        invalidateOrgCache()

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId: id,
            action: 'CREATE',
            resource: 'organization',
            resourceId: id,
            metadata: { name, code }
        })

        return c.json({ id, name, code })
    }
)

// Update Organization (Super Admin Only)
app.put('/:id',
    zValidator('json', z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        logoUrl: z.string().optional(),
        secretario: z.string().optional(),
        secretariaAdjunta: z.string().optional(),
        diretoriaTecnica: z.string().optional()
    })),
    async (c) => {
        const user = c.get('user') as any

        if (user.globalRole !== 'super_admin') {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const id = c.req.param('id')
        const { name, code, logoUrl, secretario, secretariaAdjunta, diretoriaTecnica } = c.req.valid('json')

        await db.update(organizations)
            .set({
                name,
                code,
                logoUrl,
                secretario,
                secretariaAdjunta,
                diretoriaTecnica,
                updatedAt: new Date()
            })
            .where(eq(organizations.id, id))

        invalidateOrgCache()

        // Fire-and-forget audit
        createAuditLog({
            userId: user.id,
            organizationId: id,
            action: 'UPDATE',
            resource: 'organization',
            resourceId: id,
            metadata: { name, code, changes: ['name', 'code', 'logoUrl', 'secretario'] }
        })

        return c.json({ id, name, code, logoUrl })
    }
)

export default app
