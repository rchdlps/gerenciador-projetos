import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db before imports
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        query: {},
    },
}))

vi.mock('@/lib/audit-logger', () => ({
    createAuditLog: vi.fn(),
}))

vi.mock('nanoid', () => ({
    nanoid: () => 'test-id-123',
}))

import { parseExcelOrCsv, parseAndImportTasks, parseAndImportStakeholders } from '../import'
import type { RawRow } from '../import'
import { db } from '@/lib/db'
import { createAuditLog } from '@/lib/audit-logger'

describe('parseExcelOrCsv', () => {
    it('should parse a simple CSV', async () => {
        const csv = 'Nome,Papel,Email\nJoão,Gerente,joao@test.com\nMaria,Analista,maria@test.com'
        const buffer = Buffer.from(csv, 'utf-8')
        const rows = await parseExcelOrCsv(buffer, 'test.csv')

        expect(rows).toHaveLength(2)
        expect(rows[0]).toEqual({ Nome: 'João', Papel: 'Gerente', Email: 'joao@test.com' })
        expect(rows[1]).toEqual({ Nome: 'Maria', Papel: 'Analista', Email: 'maria@test.com' })
    })

    it('should handle CSV with BOM', async () => {
        const csv = '\uFEFFNome,Email\nTest,test@test.com'
        const buffer = Buffer.from(csv, 'utf-8')
        const rows = await parseExcelOrCsv(buffer, 'data.csv')

        expect(rows).toHaveLength(1)
        expect(rows[0].Nome).toBe('Test')
    })

    it('should handle quoted fields with commas', async () => {
        const csv = 'Nome,Descrição\n"Silva, João","Descrição com, vírgulas"'
        const buffer = Buffer.from(csv, 'utf-8')
        const rows = await parseExcelOrCsv(buffer, 'test.csv')

        expect(rows).toHaveLength(1)
        expect(rows[0].Nome).toBe('Silva, João')
        expect(rows[0]['Descrição']).toBe('Descrição com, vírgulas')
    })

    it('should handle quoted fields with newlines', async () => {
        const csv = 'Nome,Descrição\n"João","Linha 1\nLinha 2"\nMaria,Simples'
        const buffer = Buffer.from(csv, 'utf-8')
        const rows = await parseExcelOrCsv(buffer, 'test.csv')

        expect(rows).toHaveLength(2)
        expect(rows[0]['Descrição']).toBe('Linha 1\nLinha 2')
        expect(rows[1].Nome).toBe('Maria')
    })

    it('should skip empty rows', async () => {
        const csv = 'Nome,Email\nJoão,joao@test.com\n,,\nMaria,maria@test.com'
        const buffer = Buffer.from(csv, 'utf-8')
        const rows = await parseExcelOrCsv(buffer, 'test.csv')

        expect(rows).toHaveLength(2)
    })

    it('should throw for unsupported file types', async () => {
        const buffer = Buffer.from('data', 'utf-8')
        await expect(parseExcelOrCsv(buffer, 'test.txt')).rejects.toThrow('Unsupported file type')
    })
})

describe('parseAndImportTasks', () => {
    const mockPhases = [
        { id: 'phase-1', name: 'Iniciação', projectId: 'proj-1' },
        { id: 'phase-2', name: 'Planejamento', projectId: 'proj-1' },
    ]

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock db.select().from().where() chain for phases
        const mockWhere = vi.fn().mockResolvedValue(mockPhases)
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any)

        // Mock db.insert().values() chain
        const mockValues = vi.fn().mockResolvedValue([])
        vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)
    })

    it('should import valid task rows', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Task 1', 'Descrição': 'Desc 1', 'Status': 'Em Andamento', 'Prioridade': 'Alta', 'Fase': 'Iniciação' },
            { 'Título': 'Task 2', 'Status': 'A Fazer', 'Prioridade': 'Baixa' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.total).toBe(2)
        expect(result.imported).toBe(2)
        expect(result.errors).toHaveLength(0)
        expect(db.insert).toHaveBeenCalledOnce()
        expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            action: 'CREATE',
            resource: 'task',
            metadata: { bulkImport: true, count: 2 },
        }))
    })

    it('should report error for rows with missing title', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Valid Task', 'Status': 'todo' },
            { 'Título': '', 'Status': 'todo' },
            { 'Descrição': 'No title here' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.total).toBe(3)
        expect(result.imported).toBe(1)
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0]).toEqual({ row: 3, reason: 'Título é obrigatório' })
        expect(result.errors[1]).toEqual({ row: 4, reason: 'Título é obrigatório' })
    })

    it('should default status to todo and priority to medium for invalid values', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Task', 'Status': 'invalid', 'Prioridade': 'unknown' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].status).toBe('todo')
        expect(valuesCall[0].priority).toBe('medium')
    })

    it('should parse DD/MM/YYYY and YYYY-MM-DD dates', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Task', 'Data Início': '15/03/2025', 'Data Fim': '2025-06-30' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].startDate).toEqual(new Date(2025, 2, 15))
        expect(valuesCall[0].endDate).toEqual(new Date(2025, 5, 30))
    })

    it('should match phase by name case-insensitively', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Task', 'Fase': 'planejamento' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].phaseId).toBe('phase-2')
    })

    it('should use default phase when phase name not found', async () => {
        const rows: RawRow[] = [
            { 'Título': 'Task', 'Fase': 'Unknown Phase' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].phaseId).toBe('phase-1')
    })

    it('should error all rows when no phases exist', async () => {
        // Override mock to return empty phases
        const mockWhere = vi.fn().mockResolvedValue([])
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
        vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any)

        const rows: RawRow[] = [
            { 'Título': 'Task 1' },
            { 'Título': 'Task 2' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.total).toBe(2)
        expect(result.imported).toBe(0)
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0].reason).toContain('Nenhuma fase')
    })

    it('should handle accent-insensitive column matching', async () => {
        const rows: RawRow[] = [
            { 'titulo': 'Task Without Accents', 'descricao': 'Desc' },
        ]

        const result = await parseAndImportTasks(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
    })
})

describe('parseAndImportStakeholders', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Mock db.insert().values() chain
        const mockValues = vi.fn().mockResolvedValue([])
        vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)
    })

    it('should import valid stakeholder rows', async () => {
        const rows: RawRow[] = [
            { 'Nome': 'João Silva', 'Papel': 'Gerente', 'Nível': 'Primário', 'Email': 'joao@test.com' },
            { 'Nome': 'Maria Santos', 'Papel': 'Analista', 'Nível': 'Secundário' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.total).toBe(2)
        expect(result.imported).toBe(2)
        expect(result.errors).toHaveLength(0)
        expect(db.insert).toHaveBeenCalledOnce()
        expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            action: 'CREATE',
            resource: 'stakeholder',
            metadata: { bulkImport: true, count: 2 },
        }))
    })

    it('should report error for rows with missing name', async () => {
        const rows: RawRow[] = [
            { 'Nome': 'Valid Name', 'Papel': 'Gerente' },
            { 'Nome': '', 'Papel': 'Analista' },
            { 'Papel': 'Dev' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.total).toBe(3)
        expect(result.imported).toBe(1)
        expect(result.errors).toHaveLength(2)
        expect(result.errors[0]).toEqual({ row: 3, reason: 'Nome é obrigatório' })
        expect(result.errors[1]).toEqual({ row: 4, reason: 'Nome é obrigatório' })
    })

    it('should default level to secondary for invalid values', async () => {
        const rows: RawRow[] = [
            { 'Nome': 'Test', 'Papel': 'Dev', 'Nível': 'invalid' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].level).toBe('secondary')
    })

    it('should reject rows with invalid email', async () => {
        const rows: RawRow[] = [
            { 'Nome': 'Test', 'Papel': 'Dev', 'Email': 'not-an-email' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(0)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].reason).toContain('Email inválido')
    })

    it('should accept rows without email', async () => {
        const rows: RawRow[] = [
            { 'Nome': 'Test', 'Papel': 'Dev' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
        const insertCall = vi.mocked(db.insert).mock.results[0].value
        const valuesCall = insertCall.values.mock.calls[0][0]
        expect(valuesCall[0].email).toBeNull()
    })

    it('should handle English column names', async () => {
        const rows: RawRow[] = [
            { 'Name': 'Test User', 'Role': 'Developer', 'Level': 'Primary', 'Email': 'test@test.com' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(1)
    })

    it('should not call insert when all rows have errors', async () => {
        const rows: RawRow[] = [
            { 'Nome': '', 'Papel': 'Dev' },
        ]

        const result = await parseAndImportStakeholders(rows, 'proj-1', 'user-1')

        expect(result.imported).toBe(0)
        expect(db.insert).not.toHaveBeenCalled()
    })
})
