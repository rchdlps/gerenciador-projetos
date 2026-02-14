import { db } from '@/lib/db'
import { projectPhases, tasks, users, stakeholders } from '../../../db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getProjectPhases(projectId: string) {
    const phases = await db.select().from(projectPhases)
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(projectPhases.order), asc(projectPhases.createdAt))

    // Fetch tasks for each phase
    const fasesWithTasks = await Promise.all(phases.map(async phase => {
        const localTasksRaw = await db.select({
            task: tasks,
            assigneeUser: users,
            assigneeStakeholder: stakeholders
        })
            .from(tasks)
            .leftJoin(users, eq(tasks.assigneeId, users.id))
            .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
            .where(eq(tasks.phaseId, phase.id))
            .orderBy(asc(tasks.order))

        const localTasks = localTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
            let assignee = null
            if (assigneeStakeholder) {
                assignee = {
                    id: assigneeStakeholder.id,
                    name: assigneeStakeholder.name,
                    image: null, // Stakeholders don't have images yet
                    role: assigneeStakeholder.role,
                    type: 'stakeholder'
                }
            } else if (assigneeUser) {
                assignee = {
                    id: assigneeUser.id,
                    name: assigneeUser.name,
                    image: assigneeUser.image,
                    type: 'user'
                }
            }

            return {
                ...task,
                assignee
            }
        })

        return { ...phase, tasks: localTasks }
    }))

    return fasesWithTasks
}
