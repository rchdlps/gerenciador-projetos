import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        query: {
            projectPhases: {
                findMany: vi.fn(),
            },
        },
        select: () => ({ from: mockFrom }),
    },
}))

// Chain select().from().where()
mockFrom.mockReturnValue({ where: mockWhere })

import { db } from '@/lib/db'
import { generateSummaryPdf } from '../summary'

describe('Summary PDF Generator', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFrom.mockReturnValue({ where: mockWhere })
    })

    it('should generate a valid PDF with project data', async () => {
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
                    { id: 't-1', phaseId: 'phase-1', title: 'Tarefa 1', description: null, assigneeId: null, stakeholderId: null, startDate: null, endDate: null, status: 'done', priority: 'high', order: 1, createdAt: new Date(), updatedAt: new Date() },
                    { id: 't-2', phaseId: 'phase-1', title: 'Tarefa 2', description: null, assigneeId: null, stakeholderId: null, startDate: null, endDate: null, status: 'todo', priority: 'medium', order: 2, createdAt: new Date(), updatedAt: new Date() },
                ],
            },
            {
                id: 'phase-2',
                projectId: 'proj-1',
                name: 'Planejamento',
                description: null,
                order: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
                tasks: [
                    { id: 't-3', phaseId: 'phase-2', title: 'Tarefa 3', description: null, assigneeId: null, stakeholderId: null, startDate: null, endDate: null, status: 'done', priority: 'low', order: 1, createdAt: new Date(), updatedAt: new Date() },
                ],
            },
        ])

        // stakeholders query (first call to where)
        // quality metrics query (second call to where)
        mockWhere
            .mockResolvedValueOnce([
                { id: 's-1', projectId: 'proj-1', name: 'João Silva', role: 'Gerente', level: 'Alto', email: null, createdAt: new Date(), updatedAt: new Date() },
            ])
            .mockResolvedValueOnce([
                { id: 'qm-1', projectId: 'proj-1', name: 'Satisfação', target: '90%', currentValue: '85%', createdAt: new Date(), updatedAt: new Date() },
            ])

        const buffer = await generateSummaryPdf({
            project: {
                id: 'proj-1',
                name: 'Projeto Teste',
                type: 'Obra',
                status: 'em_andamento',
                description: 'Uma descrição do projeto',
            },
            orgName: 'Secretaria de Saúde',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })

    it('should handle empty data gracefully', async () => {
        vi.mocked(db.query.projectPhases.findMany).mockResolvedValue([])
        mockWhere
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])

        const buffer = await generateSummaryPdf({
            project: {
                id: 'proj-2',
                name: 'Projeto Vazio',
                type: 'Projeto',
                status: 'suspenso',
                description: null,
            },
            orgName: 'Secretaria de Obras',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })
})
