import { db } from '@/lib/db'
import { projects, projectPhases, tasks, users, organizations } from '../../../db/schema'
import { sql, eq, inArray } from 'drizzle-orm'

const statusLabels: Record<string, string> = {
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    suspenso: "Suspenso",
    cancelado: "Cancelado",
    recorrente: "Recorrente",
    proposta: "Proposta",
    planejamento: "Planejamento",
}

export type DashboardStats = {
    totalProjects: number
    totalUsers: number
    activeTasksCount: number
    completedTasksCount: number
    projectsByType: { name: string; value: number }[]
    projectsByStatus: { name: string; value: number }[]
    projectsByOrg: { name: string; progress: number }[]
    completionRate: { completed: number; recorrente: number; total: number }
}

export async function getDashboardStats(orgIds: string[] | null): Promise<DashboardStats> {
    const orgFilter = orgIds && orgIds.length > 0
        ? inArray(projects.organizationId, orgIds)
        : undefined

    const [
        projectsByStatusRaw,
        projectsByTypeRaw,
        tasksByStatusRaw,
        userCount,
        orgProgressRaw,
    ] = await Promise.all([
        // Project count by status
        db.select({
            status: projects.status,
            count: sql<number>`count(*)::int`,
        }).from(projects)
            .where(orgFilter)
            .groupBy(projects.status),

        // Project count by type
        db.select({
            type: projects.type,
            count: sql<number>`count(*)::int`,
        }).from(projects)
            .where(orgFilter)
            .groupBy(projects.type),

        // Task count by status (join through phases → projects for org scoping)
        db.select({
            status: tasks.status,
            count: sql<number>`count(*)::int`,
        }).from(tasks)
            .innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id))
            .innerJoin(projects, eq(projectPhases.projectId, projects.id))
            .where(orgFilter)
            .groupBy(tasks.status),

        // Total active users
        db.select({ count: sql<number>`count(*)::int` }).from(users),

        // Progress per organization (total tasks + done tasks per org)
        db.select({
            orgCode: organizations.code,
            orgName: organizations.name,
            totalTasks: sql<number>`count(${tasks.id})::int`,
            doneTasks: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
        }).from(organizations)
            .innerJoin(projects, eq(projects.organizationId, organizations.id))
            .innerJoin(projectPhases, eq(projectPhases.projectId, projects.id))
            .innerJoin(tasks, eq(tasks.phaseId, projectPhases.id))
            .where(orgFilter)
            .groupBy(organizations.id, organizations.code, organizations.name),
    ])

    // Transform results to match chart format
    const totalProjects = projectsByStatusRaw.reduce((sum, r) => sum + r.count, 0)

    const projectsByType = projectsByTypeRaw.map(r => ({
        name: r.type || 'Projeto',
        value: r.count,
    }))
    if (projectsByType.length === 0) projectsByType.push({ name: 'N/A', value: 0 })

    const projectsByStatus = projectsByStatusRaw
        .filter(r => r.count > 0)
        .map(r => ({
            name: statusLabels[r.status] || r.status,
            value: r.count,
        }))

    const activeTasksCount = tasksByStatusRaw
        .filter(r => r.status !== 'done')
        .reduce((sum, r) => sum + r.count, 0)

    const completedTasksCount = tasksByStatusRaw
        .filter(r => r.status === 'done')
        .reduce((sum, r) => sum + r.count, 0)

    const projectsByOrg = orgProgressRaw.map(r => ({
        name: r.orgCode || r.orgName,
        progress: r.totalTasks > 0 ? Math.round((r.doneTasks / r.totalTasks) * 100) : 0,
    }))
    if (projectsByOrg.length === 0) projectsByOrg.push({ name: 'N/A', progress: 0 })

    const statusMap = new Map(projectsByStatusRaw.map(r => [r.status, r.count]))
    const completionRate = {
        completed: statusMap.get('concluido') || 0,
        recorrente: statusMap.get('recorrente') || 0,
        total: totalProjects,
    }

    return {
        totalProjects,
        totalUsers: userCount[0]?.count ?? 0,
        activeTasksCount,
        completedTasksCount,
        projectsByType,
        projectsByStatus,
        projectsByOrg,
        completionRate,
    }
}
