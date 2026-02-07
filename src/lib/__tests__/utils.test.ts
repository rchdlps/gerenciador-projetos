import { describe, it, expect } from 'vitest'
import { cn, formatBytes } from '../utils'

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-4', 'py-2')
      expect(result).toBe('px-4 py-2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'active', false && 'inactive')
      expect(result).toBe('base active')
    })

    it('should merge tailwind classes and resolve conflicts', () => {
      const result = cn('px-4', 'px-8')
      // tailwind-merge should keep only the last px value
      expect(result).toBe('px-8')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle array inputs', () => {
      const result = cn(['px-4', 'py-2'])
      expect(result).toBe('px-4 py-2')
    })

    it('should handle object inputs', () => {
      const result = cn({
        'px-4': true,
        'py-2': false,
        'text-red': true,
      })
      expect(result).toBe('px-4 text-red')
    })
  })

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
    })

    it('should format bytes', () => {
      expect(formatBytes(100)).toBe('100 Bytes')
      expect(formatBytes(1023)).toBe('1023 Bytes')
    })

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(10240)).toBe('10 KB')
    })

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB')
      expect(formatBytes(5242880)).toBe('5 MB')
      expect(formatBytes(1572864)).toBe('1.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB')
      expect(formatBytes(5368709120)).toBe('5 GB')
    })

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB')
      expect(formatBytes(1536, 1)).toBe('1.5 KB')
      expect(formatBytes(1536, 3)).toBe('1.5 KB')
    })

    it('should handle large numbers', () => {
      const terabyte = 1099511627776
      expect(formatBytes(terabyte)).toBe('1 TB')
    })

    it('should handle negative decimals parameter', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB')
    })
  })
})
