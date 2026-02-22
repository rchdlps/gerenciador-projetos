import { describe, it, expect } from 'vitest'
import { buildExcelWorkbook } from '../excel'

describe('buildExcelWorkbook', () => {
    it('should create a workbook with header row and data rows for tasks', async () => {
        const rows = [
            { Fase: 'Iniciação', Título: 'Tarefa 1', Descrição: 'Desc', Status: 'A Fazer', Prioridade: 'Média', Responsável: 'João', Stakeholder: '', 'Data Início': '01/01/2026', 'Data Fim': '15/01/2026' },
            { Fase: 'Iniciação', Título: 'Tarefa 2', Descrição: '', Status: 'Em Andamento', Prioridade: 'Alta', Responsável: '', Stakeholder: 'Maria', 'Data Início': '', 'Data Fim': '' },
        ]

        const buffer = await buildExcelWorkbook({ sheetName: 'Tarefas', projectName: 'Projeto Teste', rows })

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)

        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.getWorksheet('Tarefas')!
        expect(ws).toBeDefined()
        expect(ws.getRow(3).getCell(1).value).toBe('Fase')
        expect(ws.getRow(3).getCell(2).value).toBe('Título')
        expect(ws.getRow(4).getCell(2).value).toBe('Tarefa 1')
        expect(ws.getRow(5).getCell(2).value).toBe('Tarefa 2')
    })

    it('should create a workbook for stakeholders', async () => {
        const rows = [{ Nome: 'João Silva', Papel: 'Gerente', Nível: 'Chave', Email: 'joao@test.com' }]
        const buffer = await buildExcelWorkbook({ sheetName: 'Stakeholders', projectName: 'Projeto Teste', rows })

        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        const ws = wb.getWorksheet('Stakeholders')!
        expect(ws.getRow(3).getCell(1).value).toBe('Nome')
        expect(ws.getRow(4).getCell(1).value).toBe('João Silva')
    })

    it('should handle empty rows array', async () => {
        const buffer = await buildExcelWorkbook({ sheetName: 'Vazio', projectName: 'Projeto Teste', rows: [] })
        expect(buffer).toBeInstanceOf(Buffer)
        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(buffer)
        expect(wb.getWorksheet('Vazio')).toBeDefined()
    })
})
