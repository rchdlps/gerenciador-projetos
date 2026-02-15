import { db } from '@/lib/db'
import { stakeholders } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export async function getProjectStakeholders(projectId: string) {
    return db.select()
        .from(stakeholders)
        .where(eq(stakeholders.projectId, projectId))
}
