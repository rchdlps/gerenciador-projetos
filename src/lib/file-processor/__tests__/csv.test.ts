import { describe, it, expect } from 'vitest'
import { buildCsvBuffer } from '../csv'

describe('buildCsvBuffer', () => {
    it('should create a CSV with header and data rows', () => {
        const rows = [
            { Nome: 'João', Papel: 'Gerente', Email: 'joao@test.com' },
            { Nome: 'Maria', Papel: 'Analista', Email: 'maria@test.com' },
        ]
        const buffer = buildCsvBuffer(rows)
        const text = buffer.toString('utf-8')
        expect(text).toContain('Nome,Papel,Email')
        expect(text).toContain('João,Gerente,joao@test.com')
        expect(text).toContain('Maria,Analista,maria@test.com')
    })

    it('should handle values with commas by quoting them', () => {
        const rows = [{ Nome: 'Silva, João', Papel: 'Gerente' }]
        const buffer = buildCsvBuffer(rows)
        const text = buffer.toString('utf-8')
        expect(text).toContain('"Silva, João"')
    })

    it('should return empty buffer for empty rows', () => {
        const buffer = buildCsvBuffer([])
        const text = buffer.toString('utf-8')
        expect(text.trim()).toBe('')
    })
})
