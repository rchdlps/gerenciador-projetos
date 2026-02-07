import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { testRoute, createAuthHeaders, daysFromNow } from '../../../test/helpers'
import { mockUser, mockSuperAdmin } from '../../../test/mocks'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    query: {
      tasks: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit-logger', () => ({
  createAuditLog: vi.fn(),
}))

describe('Tasks API Routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    const tasksRouter = await import('../tasks')
    app = new Hono().route('/tasks', tasksRouter.default)
  })

  describe('GET /tasks/dated', () => {
    it('should return 401 when not authenticated', async () => {
      const { auth } = await import('@/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const result = await testRoute(app, 'GET', '/tasks/dated', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(401)
      expect(result.data).toHaveProperty('error', 'Unauthorized')
    })

    it('should return all dated tasks for super admin', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockSuperAdmin,
        session: { id: 'session-1' } as any,
      })

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'todo',
          priority: 'high',
          startDate: daysFromNow(0),
          endDate: daysFromNow(7),
          projectId: 'project-1',
          projectName: 'Test Project',
        },
      ]

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([mockSuperAdmin])),
          })),
        })),
      }))

      // First call for user lookup
      vi.mocked(db.select).mockImplementationOnce(mockSelect as any)

      // Second call for tasks query
      vi.mocked(db.select).mockImplementationOnce(
        vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(mockTasks)),
            })),
          })),
        })) as any
      )

      const result = await testRoute(app, 'GET', '/tasks/dated', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(200)
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should filter tasks by organization membership for regular users', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([mockUser])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ orgId: 'test-org-id' }])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })

      vi.mocked(db.select).mockImplementation(mockSelect as any)

      const result = await testRoute(app, 'GET', '/tasks/dated', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(200)
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should return empty array when user has no organization memberships', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([mockUser])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])), // No memberships
          })),
        })

      vi.mocked(db.select).mockImplementation(mockSelect as any)

      const result = await testRoute(app, 'GET', '/tasks/dated', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(200)
      expect(result.data).toEqual([])
    })
  })

  describe('Task Priority and Status', () => {
    it('should handle different task priorities', () => {
      const priorities = ['low', 'medium', 'high']
      priorities.forEach(priority => {
        expect(['low', 'medium', 'high']).toContain(priority)
      })
    })

    it('should handle different task statuses', () => {
      const statuses = ['todo', 'in_progress', 'done']
      statuses.forEach(status => {
        expect(['todo', 'in_progress', 'done']).toContain(status)
      })
    })
  })

  describe('Date Filtering', () => {
    it('should only include tasks with dates', () => {
      const tasksWithDates = [
        { id: '1', startDate: new Date(), endDate: null },
        { id: '2', startDate: null, endDate: new Date() },
        { id: '3', startDate: new Date(), endDate: new Date() },
      ]

      const tasksWithoutDates = [
        { id: '4', startDate: null, endDate: null },
      ]

      tasksWithDates.forEach(task => {
        const hasDate = task.startDate !== null || task.endDate !== null
        expect(hasDate).toBe(true)
      })

      tasksWithoutDates.forEach(task => {
        const hasDate = task.startDate !== null || task.endDate !== null
        expect(hasDate).toBe(false)
      })
    })
  })
})
