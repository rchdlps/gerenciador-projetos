import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => {
    const mockDb = {
        query: {
            projectPhases: { findMany: vi.fn() },
            stakeholders: { findMany: vi.fn() },
            projectQualityMetrics: { findMany: vi.fn() },
            projectQualityChecklists: { findMany: vi.fn() },
            projectCommunicationPlans: { findMany: vi.fn() },
            procurementSuppliers: { findMany: vi.fn() },
            procurementContracts: { findMany: vi.fn() },
            projectMilestones: { findMany: vi.fn() },
        },
    }
    return { db: mockDb }
})

import { db } from '@/lib/db'
import {
    mapTasksForExport,
    mapStakeholdersForExport,
    mapQualityMetricsForExport,
    mapQualityChecklistsForExport,
    mapCommunicationPlansForExport,
    mapProcurementSuppliersForExport,
    mapProcurementContractsForExport,
    mapMilestonesForExport,
    ENTITY_MAPPERS,
    ENTITY_SHEET_NAMES,
} from '../mappers'

describe('Entity Data Mappers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('mapTasksForExport', () => {
        it('should flatten phases and tasks into rows with translated fields', async () => {
            vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([
                {
                    id: 'phase-1',
                    projectId: 'proj-1',
                    name: 'Iniciação',
                    description: null,
                    order: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    tasks: [
                        {
                            id: 'task-1',
                            phaseId: 'phase-1',
                            title: 'Definir escopo',
                            description: 'Descrição da tarefa',
                            status: 'todo',
                            priority: 'high',
                            startDate: new Date('2025-03-01'),
                            endDate: new Date('2025-03-15'),
                            assignee: { id: 'u1', name: 'João Silva', email: 'joao@test.com' },
                            stakeholder: { id: 's1', name: 'Maria Costa' },
                            assigneeId: 'u1',
                            stakeholderId: 's1',
                            order: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        {
                            id: 'task-2',
                            phaseId: 'phase-1',
                            title: 'Reunião kickoff',
                            description: null,
                            status: 'in_progress',
                            priority: 'medium',
                            startDate: null,
                            endDate: null,
                            assignee: null,
                            stakeholder: null,
                            assigneeId: null,
                            stakeholderId: null,
                            order: 2,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    ],
                },
            ] as any)

            const rows = await mapTasksForExport('proj-1')

            expect(rows).toHaveLength(2)
            expect(rows[0]).toEqual({
                'Fase': 'Iniciação',
                'Título': 'Definir escopo',
                'Descrição': 'Descrição da tarefa',
                'Status': 'A Fazer',
                'Prioridade': 'Alta',
                'Responsável': 'João Silva',
                'Stakeholder': 'Maria Costa',
                'Data Início': new Date('2025-03-01').toLocaleDateString('pt-BR'),
                'Data Fim': new Date('2025-03-15').toLocaleDateString('pt-BR'),
            })
            expect(rows[1]['Responsável']).toBe('')
            expect(rows[1]['Stakeholder']).toBe('')
            expect(rows[1]['Status']).toBe('Em Andamento')
            expect(rows[1]['Prioridade']).toBe('Média')
            expect(rows[1]['Data Início']).toBe('')
            expect(rows[1]['Data Fim']).toBe('')
        })

        it('should return empty array when no phases exist', async () => {
            vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([])
            const rows = await mapTasksForExport('proj-empty')
            expect(rows).toEqual([])
        })
    })

    describe('mapStakeholdersForExport', () => {
        it('should map stakeholders with translated levels', async () => {
            vi.mocked(db.query.stakeholders.findMany).mockResolvedValue([
                { id: 's1', projectId: 'proj-1', name: 'Ana', role: 'Gerente', level: 'key_stakeholder', email: 'ana@test.com', createdAt: new Date(), updatedAt: new Date() },
                { id: 's2', projectId: 'proj-1', name: 'Pedro', role: 'Analista', level: 'secondary', email: null, createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapStakeholdersForExport('proj-1')

            expect(rows).toHaveLength(2)
            expect(rows[0]).toEqual({
                'Nome': 'Ana',
                'Papel': 'Gerente',
                'Nível': 'Chave',
                'Email': 'ana@test.com',
            })
            expect(rows[1]['Nível']).toBe('Secundário')
            expect(rows[1]['Email']).toBe('')
        })
    })

    describe('mapQualityMetricsForExport', () => {
        it('should map quality metrics', async () => {
            vi.mocked(db.query.projectQualityMetrics.findMany).mockResolvedValue([
                { id: 'qm1', projectId: 'proj-1', name: 'Cobertura de testes', target: '80%', currentValue: '65%', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapQualityMetricsForExport('proj-1')
            expect(rows).toEqual([{ 'Nome': 'Cobertura de testes', 'Meta': '80%', 'Valor Atual': '65%' }])
        })
    })

    describe('mapQualityChecklistsForExport', () => {
        it('should map checklists with Sim/Não', async () => {
            vi.mocked(db.query.projectQualityChecklists.findMany).mockResolvedValue([
                { id: 'qc1', projectId: 'proj-1', item: 'Revisão de código', completed: true, createdAt: new Date(), updatedAt: new Date() },
                { id: 'qc2', projectId: 'proj-1', item: 'Testes unitários', completed: false, createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapQualityChecklistsForExport('proj-1')
            expect(rows[0]).toEqual({ 'Item': 'Revisão de código', 'Concluído': 'Sim' })
            expect(rows[1]).toEqual({ 'Item': 'Testes unitários', 'Concluído': 'Não' })
        })
    })

    describe('mapCommunicationPlansForExport', () => {
        it('should map communication plans', async () => {
            vi.mocked(db.query.projectCommunicationPlans.findMany).mockResolvedValue([
                { id: 'cp1', projectId: 'proj-1', info: 'Status semanal', stakeholders: 'Equipe', frequency: 'Semanal', medium: 'Email', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapCommunicationPlansForExport('proj-1')
            expect(rows).toEqual([{ 'Informação': 'Status semanal', 'Partes Interessadas': 'Equipe', 'Frequência': 'Semanal', 'Meio': 'Email' }])
        })
    })

    describe('mapProcurementSuppliersForExport', () => {
        it('should map suppliers', async () => {
            vi.mocked(db.query.procurementSuppliers.findMany).mockResolvedValue([
                { id: 'ps1', projectId: 'proj-1', name: 'Fornecedor A', itemService: 'Cimento', contact: '(65) 9999-0000', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapProcurementSuppliersForExport('proj-1')
            expect(rows).toEqual([{ 'Nome': 'Fornecedor A', 'Item/Serviço': 'Cimento', 'Contato': '(65) 9999-0000' }])
        })
    })

    describe('mapProcurementContractsForExport', () => {
        it('should map contracts with formatted date', async () => {
            vi.mocked(db.query.procurementContracts.findMany).mockResolvedValue([
                { id: 'pc1', projectId: 'proj-1', description: 'Contrato obra', value: 'R$ 100.000', validity: new Date('2025-12-31'), status: 'Ativo', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapProcurementContractsForExport('proj-1')
            expect(rows[0]['Descrição']).toBe('Contrato obra')
            expect(rows[0]['Valor']).toBe('R$ 100.000')
            expect(rows[0]['Validade']).toBe(new Date('2025-12-31').toLocaleDateString('pt-BR'))
            expect(rows[0]['Status']).toBe('Ativo')
        })

        it('should handle null validity', async () => {
            vi.mocked(db.query.procurementContracts.findMany).mockResolvedValue([
                { id: 'pc2', projectId: 'proj-1', description: 'Contrato', value: 'R$ 50.000', validity: null, status: 'Encerrado', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapProcurementContractsForExport('proj-1')
            expect(rows[0]['Validade']).toBe('')
        })
    })

    describe('mapMilestonesForExport', () => {
        it('should map milestones with formatted date', async () => {
            vi.mocked(db.query.projectMilestones.findMany).mockResolvedValue([
                { id: 'ms1', projectId: 'proj-1', name: 'Início das obras', expectedDate: new Date('2025-06-01'), phase: 'Execução', createdAt: new Date(), updatedAt: new Date() },
            ] as any)

            const rows = await mapMilestonesForExport('proj-1')
            expect(rows).toEqual([{
                'Nome': 'Início das obras',
                'Data Prevista': new Date('2025-06-01').toLocaleDateString('pt-BR'),
                'Fase': 'Execução',
            }])
        })
    })

    describe('ENTITY_MAPPERS', () => {
        it('should have all expected entity keys', () => {
            const expectedKeys = [
                'tasks',
                'stakeholders',
                'qualityMetrics',
                'qualityChecklists',
                'communicationPlans',
                'procurementSuppliers',
                'procurementContracts',
                'milestones',
            ]
            expect(Object.keys(ENTITY_MAPPERS)).toEqual(expect.arrayContaining(expectedKeys))
            expect(Object.keys(ENTITY_MAPPERS)).toHaveLength(expectedKeys.length)
        })

        it('should have functions as values', () => {
            for (const fn of Object.values(ENTITY_MAPPERS)) {
                expect(typeof fn).toBe('function')
            }
        })
    })

    describe('ENTITY_SHEET_NAMES', () => {
        it('should have matching keys with ENTITY_MAPPERS', () => {
            expect(Object.keys(ENTITY_SHEET_NAMES).sort()).toEqual(Object.keys(ENTITY_MAPPERS).sort())
        })

        it('should have PT-BR sheet names', () => {
            expect(ENTITY_SHEET_NAMES.tasks).toBe('Tarefas')
            expect(ENTITY_SHEET_NAMES.stakeholders).toBe('Partes Interessadas')
            expect(ENTITY_SHEET_NAMES.milestones).toBe('Marcos')
        })
    })
})
