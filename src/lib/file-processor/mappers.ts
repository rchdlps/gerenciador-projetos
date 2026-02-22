import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
    projectPhases,
    stakeholders,
    projectQualityMetrics,
    projectQualityChecklists,
    projectCommunicationPlans,
    procurementSuppliers,
    procurementContracts,
    projectMilestones,
} from '../../../db/schema'

// Translation maps
const STATUS_LABELS: Record<string, string> = {
    todo: 'A Fazer',
    in_progress: 'Em Andamento',
    done: 'Concluído',
}

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
}

const LEVEL_LABELS: Record<string, string> = {
    key_stakeholder: 'Chave',
    primary: 'Primário',
    secondary: 'Secundário',
}

function formatDate(date: Date | string | null | undefined): string {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR')
}

export async function mapTasksForExport(projectId: string): Promise<Record<string, string>[]> {
    const phases = await db.query.projectPhases.findMany({
        where: eq(projectPhases.projectId, projectId),
        with: {
            tasks: {
                with: {
                    assignee: true,
                    stakeholder: true,
                },
            },
        },
    })

    const rows: Record<string, string>[] = []
    for (const phase of phases) {
        for (const task of phase.tasks) {
            rows.push({
                'Fase': phase.name,
                'Título': task.title,
                'Descrição': task.description ?? '',
                'Status': STATUS_LABELS[task.status] ?? task.status,
                'Prioridade': PRIORITY_LABELS[task.priority] ?? task.priority,
                'Responsável': task.assignee?.name ?? '',
                'Stakeholder': task.stakeholder?.name ?? '',
                'Data Início': formatDate(task.startDate),
                'Data Fim': formatDate(task.endDate),
            })
        }
    }
    return rows
}

export async function mapStakeholdersForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.stakeholders.findMany({
        where: eq(stakeholders.projectId, projectId),
    })

    return data.map(s => ({
        'Nome': s.name,
        'Papel': s.role,
        'Nível': LEVEL_LABELS[s.level] ?? s.level,
        'Email': s.email ?? '',
    }))
}

export async function mapQualityMetricsForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.projectQualityMetrics.findMany({
        where: eq(projectQualityMetrics.projectId, projectId),
    })

    return data.map(m => ({
        'Nome': m.name,
        'Meta': m.target,
        'Valor Atual': m.currentValue,
    }))
}

export async function mapQualityChecklistsForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.projectQualityChecklists.findMany({
        where: eq(projectQualityChecklists.projectId, projectId),
    })

    return data.map(c => ({
        'Item': c.item,
        'Concluído': c.completed ? 'Sim' : 'Não',
    }))
}

export async function mapCommunicationPlansForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.projectCommunicationPlans.findMany({
        where: eq(projectCommunicationPlans.projectId, projectId),
    })

    return data.map(p => ({
        'Informação': p.info,
        'Partes Interessadas': p.stakeholders,
        'Frequência': p.frequency,
        'Meio': p.medium,
    }))
}

export async function mapProcurementSuppliersForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.procurementSuppliers.findMany({
        where: eq(procurementSuppliers.projectId, projectId),
    })

    return data.map(s => ({
        'Nome': s.name,
        'Item/Serviço': s.itemService,
        'Contato': s.contact,
    }))
}

export async function mapProcurementContractsForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.procurementContracts.findMany({
        where: eq(procurementContracts.projectId, projectId),
    })

    return data.map(c => ({
        'Descrição': c.description,
        'Valor': c.value,
        'Validade': formatDate(c.validity),
        'Status': c.status,
    }))
}

export async function mapMilestonesForExport(projectId: string): Promise<Record<string, string>[]> {
    const data = await db.query.projectMilestones.findMany({
        where: eq(projectMilestones.projectId, projectId),
    })

    return data.map(m => ({
        'Nome': m.name,
        'Data Prevista': formatDate(m.expectedDate),
        'Fase': m.phase,
    }))
}

export const ENTITY_MAPPERS: Record<string, (projectId: string) => Promise<Record<string, string>[]>> = {
    tasks: mapTasksForExport,
    stakeholders: mapStakeholdersForExport,
    qualityMetrics: mapQualityMetricsForExport,
    qualityChecklists: mapQualityChecklistsForExport,
    communicationPlans: mapCommunicationPlansForExport,
    procurementSuppliers: mapProcurementSuppliersForExport,
    procurementContracts: mapProcurementContractsForExport,
    milestones: mapMilestonesForExport,
}

export const ENTITY_SHEET_NAMES: Record<string, string> = {
    tasks: 'Tarefas',
    stakeholders: 'Partes Interessadas',
    qualityMetrics: 'Métricas de Qualidade',
    qualityChecklists: 'Checklist de Qualidade',
    communicationPlans: 'Plano de Comunicação',
    procurementSuppliers: 'Fornecedores',
    procurementContracts: 'Contratos',
    milestones: 'Marcos',
}
