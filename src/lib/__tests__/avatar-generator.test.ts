import { describe, it, expect } from 'vitest'
import { generateInitialsAvatar, getInitials, getAvatarColor } from '../avatar-generator'

describe('avatar-generator', () => {
    describe('getInitials', () => {
        it('extracts first + last initials from full name', () => {
            expect(getInitials('João Silva')).toBe('JS')
        })

        it('extracts single initial from single name', () => {
            expect(getInitials('Admin')).toBe('A')
        })

        it('handles three-part names (first + last)', () => {
            expect(getInitials('Maria da Silva')).toBe('MS')
        })

        it('returns ? for empty string', () => {
            expect(getInitials('')).toBe('?')
        })

        it('returns ? for null/undefined', () => {
            expect(getInitials(null as any)).toBe('?')
            expect(getInitials(undefined as any)).toBe('?')
        })

        it('uppercases initials', () => {
            expect(getInitials('joão silva')).toBe('JS')
        })

        it('trims whitespace', () => {
            expect(getInitials('  Ana Costa  ')).toBe('AC')
        })
    })

    describe('getAvatarColor', () => {
        it('returns a hex color string', () => {
            const color = getAvatarColor('user-id-123')
            expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
        })

        it('is deterministic (same ID = same color)', () => {
            const a = getAvatarColor('user-abc')
            const b = getAvatarColor('user-abc')
            expect(a).toBe(b)
        })

        it('different IDs can produce different colors', () => {
            const a = getAvatarColor('user-1')
            const b = getAvatarColor('user-2')
            expect(a).toMatch(/^#[0-9a-fA-F]{6}$/)
            expect(b).toMatch(/^#[0-9a-fA-F]{6}$/)
        })
    })

    describe('generateInitialsAvatar', () => {
        it('returns a valid SVG string', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain('<svg')
            expect(svg).toContain('</svg>')
            expect(svg).toContain('200')
        })

        it('contains the initials in the SVG', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain('>JS<')
        })

        it('contains the hash-based color', () => {
            const color = getAvatarColor('user-123')
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain(color)
        })

        it('uses ? for empty name', () => {
            const svg = generateInitialsAvatar('', 'user-123')
            expect(svg).toContain('>?<')
        })

        it('produces compact output (under 1KB)', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg.length).toBeLessThan(1024)
        })

        it('escapes XML special characters in initials', () => {
            const svg = generateInitialsAvatar('<script> foo', 'user-123')
            expect(svg).not.toContain('><')
            expect(svg).toContain('&lt;')
            expect(svg).toContain('</svg>')
        })

        it('uses larger font size for single-character initials', () => {
            const svg = generateInitialsAvatar('Admin', 'user-123')
            expect(svg).toContain('font-size="90"')
        })

        it('uses smaller font size for two-character initials', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain('font-size="80"')
        })
    })
})
