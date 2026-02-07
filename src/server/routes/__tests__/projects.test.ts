import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { testRoute, createAuthHeaders } from '../../../test/helpers'
import { mockUser, mockSuperAdmin, mockProject, mockMembership, mockOrganization } from '../../../test/mocks'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ id: 'new-project-id' }])),
    })),
    query: {
      memberships: {
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

describe('Projects API Routes', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamically import the route after mocks are set up
    const projectsRouter = await import('../projects')
    app = new Hono().route('/projects', projectsRouter.default)
  })

  describe('GET /projects', () => {
    it('should return empty array when user is not authenticated', async () => {
      const { auth } = await import('@/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const result = await testRoute(app, 'GET', '/projects', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(401)
    })

    it('should return all projects for super admin', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockSuperAdmin,
        session: { id: 'session-1' } as any,
      })

      const mockProjects = [mockProject]
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve(mockProjects)),
          })),
          orderBy: vi.fn(() => Promise.resolve(mockProjects)),
        })),
      }))

      vi.mocked(db.select).mockImplementation(mockSelect as any)

      const result = await testRoute(app, 'GET', '/projects', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(200)
      expect(result.data).toEqual(mockProjects)
    })

    it('should return user projects based on organization membership', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockProjects = [mockProject]
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([mockUser])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ orgId: 'test-org-id' }])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(mockProjects)),
            })),
          })),
        })

      vi.mocked(db.select).mockImplementation(mockSelect as any)

      const result = await testRoute(app, 'GET', '/projects', {
        headers: createAuthHeaders(),
      })

      expect(result.status).toBe(200)
    })
  })

  describe('POST /projects', () => {
    it('should create a project when user has proper access', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')
      const { createAuditLog } = await import('@/lib/audit-logger')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockUser])),
        })),
      }))

      vi.mocked(db.select).mockImplementation(mockSelect as any)
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(mockMembership as any)

      const result = await testRoute(app, 'POST', '/projects', {
        headers: createAuthHeaders(),
        body: {
          name: 'New Test Project',
          description: 'Test description',
          organizationId: 'test-org-id',
        },
      })

      expect(result.status).toBe(200)
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resource: 'project',
        })
      )
    })

    it('should reject project creation when user lacks organization access', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockUser])),
        })),
      }))

      vi.mocked(db.select).mockImplementation(mockSelect as any)
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(null)

      const result = await testRoute(app, 'POST', '/projects', {
        headers: createAuthHeaders(),
        body: {
          name: 'New Test Project',
          description: 'Test description',
          organizationId: 'unauthorized-org-id',
        },
      })

      expect(result.status).toBe(403)
      expect(result.data).toHaveProperty('error')
    })

    it('should reject project creation when viewer tries to create', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockUser])),
        })),
      }))

      vi.mocked(db.select).mockImplementation(mockSelect as any)
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue({
        ...mockMembership,
        role: 'viewer',
      } as any)

      const result = await testRoute(app, 'POST', '/projects', {
        headers: createAuthHeaders(),
        body: {
          name: 'New Test Project',
          description: 'Test description',
          organizationId: 'test-org-id',
        },
      })

      expect(result.status).toBe(403)
      expect(result.data.error).toContain('Viewers cannot create')
    })

    it('should allow super admin to create project in any organization', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockSuperAdmin,
        session: { id: 'session-1' } as any,
      })

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockSuperAdmin])),
        })),
      }))

      vi.mocked(db.select).mockImplementation(mockSelect as any)
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(null) // No membership

      const result = await testRoute(app, 'POST', '/projects', {
        headers: createAuthHeaders(),
        body: {
          name: 'Admin Project',
          description: 'Test description',
          organizationId: 'any-org-id',
        },
      })

      expect(result.status).toBe(200)
    })
  })
})
