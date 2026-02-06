import { db } from '@/lib/db'
import { auditLogs } from '../../db/schema'
import { nanoid } from 'nanoid'

/**
 * Creates an audit log entry for user actions
 * Non-blocking - errors are logged but don't fail the operation
 */
export async function createAuditLog({
    userId,
    organizationId,
    action,
    resource,
    resourceId,
    metadata
}: {
    userId: string
    organizationId?: string | null
    action: 'CREATE' | 'UPDATE' | 'DELETE'
    resource: string
    resourceId: string
    metadata?: Record<string, any>
}) {
    try {
        await db.insert(auditLogs).values({
            id: nanoid(),
            userId,
            organizationId: organizationId || null,
            action,
            resource,
            resourceId,
            metadata: metadata ? JSON.stringify(metadata) : null,
            createdAt: new Date()
        })
    } catch (error) {
        // Log error but don't fail the operation
        console.error('[Audit Log Error]', error)
    }
}
