import { db } from '@/lib/db'
import { auditLogs } from '../../db/schema'
import { nanoid } from 'nanoid'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'VIEW'
export type AuditResource = 'PROJECT' | 'MEMBER' | 'ORGANIZATION' | 'TASK' | 'AUTH'

type LogParams = {
    userId: string
    organizationId?: string | null
    action: AuditAction
    resource: AuditResource
    resourceId: string
    metadata?: Record<string, any>
}

export async function logAction(params: LogParams) {
    try {
        await db.insert(auditLogs).values({
            id: nanoid(),
            userId: params.userId,
            organizationId: params.organizationId || null,
            action: params.action,
            resource: params.resource,
            resourceId: params.resourceId,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null
        })
    } catch (error) {
        console.error("Failed to write audit log:", error)
        // gracefully fail so we don't block the actual action
    }
}
