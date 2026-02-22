import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
    db: {
        query: {
            projectCharters: {
                findFirst: vi.fn(),
            },
            projectMilestones: {
                findMany: vi.fn(),
            },
        },
    },
}))

import { db } from '@/lib/db'
import { generateTapPdf } from '../tap'

describe('TAP PDF Generator', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should generate a valid PDF with charter data', async () => {
        vi.mocked(db.query.projectCharters.findFirst).mockResolvedValue({
            id: 'charter-1',
            projectId: 'proj-1',
            justification: 'Justificativa do projeto de teste',
            smartObjectives: 'Objetivo 1\nObjetivo 2\nObjetivo 3',
            successCriteria: 'Critério A\nCritério B',
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        vi.mocked(db.query.projectMilestones.findMany).mockResolvedValue([
            {
                id: 'ms-1',
                projectId: 'proj-1',
                name: 'Início do Projeto',
                expectedDate: new Date('2025-03-01'),
                phase: 'Iniciação',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'ms-2',
                projectId: 'proj-1',
                name: 'Entrega Final',
                expectedDate: new Date('2025-12-31'),
                phase: 'Encerramento',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ])

        const buffer = await generateTapPdf({
            projectName: 'Projeto Teste',
            orgName: 'Secretaria de Saúde',
            projectId: 'proj-1',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })

    it('should handle missing charter gracefully', async () => {
        vi.mocked(db.query.projectCharters.findFirst).mockResolvedValue(undefined)
        vi.mocked(db.query.projectMilestones.findMany).mockResolvedValue([])

        const buffer = await generateTapPdf({
            projectName: 'Projeto Sem TAP',
            orgName: 'Secretaria de Obras',
            projectId: 'proj-2',
        })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })
})
