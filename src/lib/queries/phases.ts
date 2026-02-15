import { db } from '@/lib/db'
import { projectPhases, tasks, users, stakeholders } from '../../../db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getProjectPhases(projectId: string) {
    // Single query: fetch all phases + tasks + assignees in one round-trip
    const rows = await db.select({
        phase: projectPhases,
        task: tasks,
        assigneeUser: {
            id: users.id,
            name: users.name,
            image: users.image,
        },
        assigneeStakeholder: {
            id: stakeholders.id,
            name: stakeholders.name,
            role: stakeholders.role,
        },
    })
        .from(projectPhases)
        .leftJoin(tasks, eq(tasks.phaseId, projectPhases.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(projectPhases.order), asc(projectPhases.createdAt), asc(tasks.order))

    // Group rows by phase in-memory
    const phaseMap = new Map<string, any>()

    for (const row of rows) {
        if (!phaseMap.has(row.phase.id)) {
            phaseMap.set(row.phase.id, { ...row.phase, tasks: [] })
        }

        if (row.task) {
            let assignee = null
            if (row.assigneeStakeholder?.id) {
                assignee = {
                    id: row.assigneeStakeholder.id,
                    name: row.assigneeStakeholder.name,
                    image: null,
                    role: row.assigneeStakeholder.role,
                    type: 'stakeholder' as const,
                }
            } else if (row.assigneeUser?.id) {
                assignee = {
                    id: row.assigneeUser.id,
                    name: row.assigneeUser.name,
                    image: row.assigneeUser.image,
                    type: 'user' as const,
                }
            }

            phaseMap.get(row.phase.id).tasks.push({
                ...row.task,
                assignee,
            })
        }
    }

    return [...phaseMap.values()]
}
