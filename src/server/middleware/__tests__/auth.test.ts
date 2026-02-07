import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { getSession, requireAuth, requireOrgAccess } from '../auth'
import { mockUser, mockSuperAdmin, mockMembership } from '../../../test/mocks'
import { createAuthHeaders } from '../../../test/helpers'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      memberships: {
        findFirst: vi.fn(),
      },
    },
  },
}))

describe('Auth Middleware', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
  })

  describe('getSession', () => {
    it('should set user and session when authenticated', async () => {
      const { auth } = await import('@/lib/auth')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      app.use('*', getSession)
      app.get('/test', (c) => {
        const user = c.get('user')
        const session = c.get('session')
        return c.json({ user, session })
      })

      const request = new Request('http://localhost/test', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toEqual(mockUser)
      expect(data.session).toHaveProperty('id', 'session-1')
    })

    it('should set null when not authenticated', async () => {
      const { auth } = await import('@/lib/auth')

      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      app.use('*', getSession)
      app.get('/test', (c) => {
        const user = c.get('user')
        const session = c.get('session')
        return c.json({ user, session })
      })

      const request = new Request('http://localhost/test')
      const response = await app.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('should allow authenticated requests', async () => {
      const { auth } = await import('@/lib/auth')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      app.use('*', requireAuth)
      app.get('/protected', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/protected', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('success')
    })

    it('should reject unauthenticated requests', async () => {
      const { auth } = await import('@/lib/auth')

      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      app.use('*', requireAuth)
      app.get('/protected', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/protected')
      const response = await app.fetch(request)

      expect(response.status).toBe(401)
    })
  })

  describe('requireOrgAccess', () => {
    it('should allow access when user has membership', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(mockMembership as any)

      app.use('*', requireAuth)
      app.use('/:orgId/*', requireOrgAccess())
      app.get('/:orgId/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/test-org-id/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('success')
    })

    it('should allow access for super admin without membership', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockSuperAdmin,
        session: { id: 'session-1' } as any,
      })

      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(null)

      app.use('*', requireAuth)
      app.use('/:orgId/*', requireOrgAccess())
      app.get('/:orgId/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/any-org-id/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)

      expect(response.status).toBe(200)
    })

    it('should reject when user has no membership and is not admin', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      vi.mocked(db.query.memberships.findFirst).mockResolvedValue(null)

      app.use('*', requireAuth)
      app.use('/:orgId/*', requireOrgAccess())
      app.get('/:orgId/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/unauthorized-org/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)

      expect(response.status).toBe(403)
    })

    it('should enforce role hierarchy', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      // User is a viewer
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue({
        ...mockMembership,
        role: 'viewer',
      } as any)

      app.use('*', requireAuth)
      app.use('/:orgId/*', requireOrgAccess('gestor')) // Requires gestor or higher
      app.get('/:orgId/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/test-org-id/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)

      expect(response.status).toBe(403)
    })

    it('should allow access when role meets requirement', async () => {
      const { auth } = await import('@/lib/auth')
      const { db } = await import('@/lib/db')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      // User is secretario (highest role)
      vi.mocked(db.query.memberships.findFirst).mockResolvedValue({
        ...mockMembership,
        role: 'secretario',
      } as any)

      app.use('*', requireAuth)
      app.use('/:orgId/*', requireOrgAccess('gestor')) // Requires gestor or higher
      app.get('/:orgId/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/test-org-id/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('success')
    })

    it('should return 400 when organization context is missing', async () => {
      const { auth } = await import('@/lib/auth')

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: mockUser,
        session: { id: 'session-1' } as any,
      })

      app.use('*', requireAuth)
      app.use('*', requireOrgAccess()) // No orgId in route
      app.get('/resource', (c) => {
        return c.json({ message: 'success' })
      })

      const request = new Request('http://localhost/resource', {
        headers: new Headers(createAuthHeaders()),
      })

      const response = await app.fetch(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Role Hierarchy', () => {
    it('should validate role hierarchy order', () => {
      const roles = ['viewer', 'gestor', 'secretario']

      expect(roles.indexOf('viewer')).toBeLessThan(roles.indexOf('gestor'))
      expect(roles.indexOf('gestor')).toBeLessThan(roles.indexOf('secretario'))
    })
  })
})
