import { describe, it, expect } from 'vitest'
import { createPdfBuffer, COLORS, FONTS } from '../core'

describe('PDF Core', () => {
    it('should create a valid PDF buffer from a builder function', async () => {
        const buffer = await createPdfBuffer((doc) => {
            doc.fontSize(20).text('Test Document', { align: 'center' })
            doc.moveDown()
            doc.fontSize(12).text('Hello, world!')
        })
        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF')
    })

    it('should export color and font constants', () => {
        expect(COLORS).toHaveProperty('primary')
        expect(COLORS).toHaveProperty('text')
        expect(FONTS).toHaveProperty('title')
        expect(FONTS).toHaveProperty('body')
    })
})
