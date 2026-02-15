import { db } from '@/lib/db'
import { tasks, projectPhases, users, stakeholders } from '../../../db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getBoardData(projectId: string) {
    // Fetch all tasks linked to this project via phases
    const projectTasksRaw = await db.select({
        task: tasks,
        assigneeUser: users,
        assigneeStakeholder: stakeholders
    })
        .from(tasks)
        .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(asc(tasks.order))

    const projectTasks = projectTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
        let assignee = undefined
        if (assigneeStakeholder) {
            assignee = {
                name: assigneeStakeholder.name,
                image: "" // Stakeholders don't have images yet
            }
        } else if (assigneeUser) {
            assignee = {
                name: assigneeUser.name,
                image: assigneeUser.image || ""
            }
        }

        return {
            id: task.id,
            title: task.title,
            content: task.title,
            status: task.status,
            priority: task.priority,
            order: task.order,
            description: task.description,
            endDate: task.endDate,
            startDate: task.startDate,
            assignee
        }
    })

    // Define fixed columns based on status
    const columns = [
        { id: 'todo', name: 'Não Iniciada', cards: [] as any[] },
        { id: 'in_progress', name: 'Em Andamento', cards: [] as any[] },
        { id: 'review', name: 'Em Revisão', cards: [] as any[] },
        { id: 'done', name: 'Concluída', cards: [] as any[] }
    ]

    // Distribute tasks to columns
    projectTasks.forEach(task => {
        const column = columns.find(c => c.id === task.status)
        if (column) {
            column.cards.push(task)
        } else {
            // Fallback to todo if status matches none
            columns[0].cards.push(task)
        }
    })

    return columns
}
