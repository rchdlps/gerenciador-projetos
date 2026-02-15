import { db } from '@/lib/db'
import { tasks, projectPhases, projects } from '../../../db/schema'
import { eq, or, isNotNull, and, inArray, asc } from 'drizzle-orm'

export async function getDatedTasks(orgIds: string[] | null) {
    const dateCondition = (t: any) => or(isNotNull(t.startDate), isNotNull(t.endDate))

    if (orgIds === null) {
        // Super admin with no filter - see all
        return db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            startDate: tasks.startDate,
            endDate: tasks.endDate,
            projectId: projectPhases.projectId,
            projectName: projects.name
        })
            .from(tasks)
            .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
            .innerJoin(projects, eq(projectPhases.projectId, projects.id))
            .where(dateCondition(tasks))
            .orderBy(asc(tasks.endDate))
    }

    if (orgIds.length === 0) {
        return []
    }

    return db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        projectId: projectPhases.projectId,
        projectName: projects.name
    })
        .from(tasks)
        .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
        .innerJoin(projects, eq(projectPhases.projectId, projects.id))
        .where(and(
            inArray(projects.organizationId, orgIds),
            dateCondition(tasks)
        ))
        .orderBy(asc(tasks.endDate))
}
