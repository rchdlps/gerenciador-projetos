import { Hono } from 'hono'
import { db } from '@/lib/db'
import { auditLogs, users } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, type AuthVariables } from '../middleware/auth'

const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', requireAuth)

// Middleware to enforce Super Admin
app.use('*', async (c, next) => {
    const user = c.get('user') as any
    // Query DB to be sure about role
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id))

    if (dbUser?.globalRole !== 'super_admin') {
        return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
})

app.get('/audit-logs', async (c) => {
    // Fetch last 50 logs
    const logs = await db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        createdAt: auditLogs.createdAt,
        metadata: auditLogs.metadata,
        userName: users.name,
        userEmail: users.email
    })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50)

    return c.json(logs)
})

export default app
