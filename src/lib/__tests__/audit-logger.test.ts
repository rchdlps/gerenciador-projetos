import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuditLog } from '../audit-logger'

// Mock the db module
vi.mock('../db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })) as unknown as any,
  },
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mocked-id'),
}))

describe('audit-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAuditLog', () => {
    it('should create an audit log entry with all fields', async () => {
      const { db } = await import('../db')
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })) as unknown as any
      db.insert = mockInsert

      await createAuditLog({
        userId: 'user-123',
        organizationId: 'org-456',
        action: 'CREATE',
        resource: 'project',
        resourceId: 'project-789',
        metadata: { name: 'Test Project', status: 'active' },
      })

      expect(mockInsert).toHaveBeenCalled()
      const valuesCall = mockInsert.mock.results[0].value.values
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mocked-id',
          userId: 'user-123',
          organizationId: 'org-456',
          action: 'CREATE',
          resource: 'project',
          resourceId: 'project-789',
          metadata: JSON.stringify({ name: 'Test Project', status: 'active' }),
        })
      )
    })

    it('should handle missing organizationId', async () => {
      const { db } = await import('../db')
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })) as unknown as any
      db.insert = mockInsert

      await createAuditLog({
        userId: 'user-123',
        action: 'UPDATE',
        resource: 'task',
        resourceId: 'task-456',
      })

      const valuesCall = mockInsert.mock.results[0].value.values
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
        })
      )
    })

    it('should handle missing metadata', async () => {
      const { db } = await import('../db')
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })) as unknown as any
      db.insert = mockInsert

      await createAuditLog({
        userId: 'user-123',
        action: 'DELETE',
        resource: 'stakeholder',
        resourceId: 'stakeholder-789',
      })

      const valuesCall = mockInsert.mock.results[0].value.values
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        })
      )
    })

    it('should not throw error if database insert fails', async () => {
      const { db } = await import('../db')
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.reject(new Error('Database error'))),
      })) as unknown as any
      db.insert = mockInsert

      // Should not throw
      await expect(
        createAuditLog({
          userId: 'user-123',
          action: 'CREATE',
          resource: 'project',
          resourceId: 'project-789',
        })
      ).resolves.not.toThrow()
    })

    it('should support all action types', async () => {
      const { db } = await import('../db')
      const mockInsert = vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })) as unknown as any
      db.insert = mockInsert

      const actions: Array<'CREATE' | 'UPDATE' | 'DELETE'> = ['CREATE', 'UPDATE', 'DELETE']

      for (const action of actions) {
        await createAuditLog({
          userId: 'user-123',
          action,
          resource: 'test',
          resourceId: 'test-id',
        })
      }

      expect(mockInsert).toHaveBeenCalledTimes(3)
    })
  })
})
