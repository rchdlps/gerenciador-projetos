import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createAuthHeaders, createMockRequest } from '../../../test/helpers'
import {
  mockUser,
  mockSuperAdmin,
  mockProject,
  mockMembership,
} from '../../../test/mocks'

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ name: 'Test Org' }])),
      })),
    })),
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

vi.mock('@/lib/queries/scoped', () => ({
  canAccessProject: vi.fn(),
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/lib/storage', () => ({
  storage: {
    uploadFile: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/lib/file-processor/mappers', () => ({
  ENTITY_MAPPERS: {
    tasks: vi.fn(() => Promise.resolve([{ col: 'val' }])),
    stakeholders: vi.fn(() => Promise.resolve([{ col: 'val' }])),
    qualityMetrics: vi.fn(() => Promise.resolve([])),
    qualityChecklists: vi.fn(() => Promise.resolve([])),
    communicationPlans: vi.fn(() => Promise.resolve([])),
    procurementSuppliers: vi.fn(() => Promise.resolve([])),
    procurementContracts: vi.fn(() => Promise.resolve([])),
    milestones: vi.fn(() => Promise.resolve([])),
  },
  ENTITY_SHEET_NAMES: {
    tasks: 'Tarefas',
    stakeholders: 'Partes Interessadas',
    qualityMetrics: 'Métricas de Qualidade',
    qualityChecklists: 'Checklists de Qualidade',
    communicationPlans: 'Planos de Comunicação',
    procurementSuppliers: 'Fornecedores',
    procurementContracts: 'Contratos',
    milestones: 'Marcos',
  },
}))

vi.mock('@/lib/file-processor/excel', () => ({
  buildExcelWorkbook: vi.fn(() => Promise.resolve(Buffer.from('excel-data'))),
}))

vi.mock('@/lib/file-processor/csv', () => ({
  buildCsvBuffer: vi.fn(() => Buffer.from('csv-data')),
}))

vi.mock('@/lib/file-processor/pdf/tap', () => ({
  generateTapPdf: vi.fn(() => Promise.resolve(Buffer.from('pdf-data'))),
}))

vi.mock('@/lib/file-processor/pdf/summary', () => ({
  generateSummaryPdf: vi.fn(() => Promise.resolve(Buffer.from('pdf-data'))),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(user: typeof mockUser | typeof mockSuperAdmin) {
  return import('@/lib/auth').then(({ auth }) => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user,
      session: { id: 'session-1' } as any,
    })
  })
}

function setupProjectAccess(overrides?: Record<string, any>) {
  return import('@/lib/queries/scoped').then(({ canAccessProject }) => {
    vi.mocked(canAccessProject).mockResolvedValue({
      allowed: true,
      project: { ...mockProject, type: 'infraestrutura', status: 'em_andamento' },
      membership: mockMembership,
      ...overrides,
    } as any)
  })
}

function setupProjectAccessDenied() {
  return import('@/lib/queries/scoped').then(({ canAccessProject }) => {
    vi.mocked(canAccessProject).mockResolvedValue({
      allowed: false,
      project: null,
      membership: null,
    } as any)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('File Processor API Routes', () => {
  let app: Hono<{ Variables: { user: any; session: any } }>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module cache so mocks take effect cleanly
    vi.resetModules()

    // Re-setup mocks after resetModules
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const router = await import('../file-processor')
    app = new Hono<{ Variables: { user: any; session: any } }>().route(
      '/file-processor',
      router.default,
    )
  })

  // -------------------------------------------------------------------------
  // POST /export
  // -------------------------------------------------------------------------
  describe('POST /export', () => {
    it('should return 400 for invalid entity', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'nonexistent', projectId: 'p1', format: 'xlsx', sync: true },
      })
      const response = await app.fetch(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Entidade inválida')
    })

    it('should return spreadsheet content type for sync xlsx export', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'tasks', projectId: 'test-project-id', format: 'xlsx', sync: true },
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    })

    it('should return text/csv content type for sync csv export', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'tasks', projectId: 'test-project-id', format: 'csv', sync: true },
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
    })

    it('should return application/pdf content type for sync PDF TAP export', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'tap', projectId: 'test-project-id', format: 'pdf', sync: true },
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
    })

    it('should return jobId for async export', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'tasks', projectId: 'test-project-id', format: 'xlsx' },
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('jobId')
      expect(typeof data.jobId).toBe('string')

      // Verify inngest.send was called
      const { inngest } = await import('@/lib/inngest/client')
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'file-processor/export',
          data: expect.objectContaining({
            entity: 'tasks',
            projectId: 'test-project-id',
            format: 'xlsx',
          }),
        }),
      )
    })

    it('should return 400 when requesting PDF for non-document entities', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const request = createMockRequest('POST', '/file-processor/export', {
        headers: createAuthHeaders(),
        body: { entity: 'tasks', projectId: 'test-project-id', format: 'pdf', sync: true },
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('PDF')
    })
  })

  // -------------------------------------------------------------------------
  // POST /import
  // -------------------------------------------------------------------------
  describe('POST /import', () => {
    it('should return 400 for invalid entity', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const formData = new FormData()
      formData.append('file', new File(['data'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      formData.append('entity', 'invalidEntity')
      formData.append('projectId', 'test-project-id')

      const request = new Request('http://localhost:4321/file-processor/import', {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
        },
        body: formData,
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Entidade inválida')
    })

    it('should return 403 for viewer role trying to import', async () => {
      await setupAuth(mockUser)

      const viewerMembership = { ...mockMembership, role: 'viewer' as const }
      await import('@/lib/queries/scoped').then(({ canAccessProject }) => {
        vi.mocked(canAccessProject).mockResolvedValue({
          allowed: true,
          project: { ...mockProject, type: 'infraestrutura', status: 'em_andamento' },
          membership: viewerMembership,
        } as any)
      })

      const formData = new FormData()
      formData.append('file', new File(['data'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      formData.append('entity', 'tasks')
      formData.append('projectId', 'test-project-id')

      const request = new Request('http://localhost:4321/file-processor/import', {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
        },
        body: formData,
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Visualizadores')
    })

    it('should return jobId for valid import', async () => {
      await setupAuth(mockUser)
      await setupProjectAccess()

      const formData = new FormData()
      formData.append('file', new File(['col1,col2\nval1,val2'], 'tasks.csv', { type: 'text/csv' }))
      formData.append('entity', 'tasks')
      formData.append('projectId', 'test-project-id')

      const request = new Request('http://localhost:4321/file-processor/import', {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
        },
        body: formData,
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('jobId')
      expect(typeof data.jobId).toBe('string')

      // Verify storage.uploadFile was called
      const { storage } = await import('@/lib/storage')
      expect(storage.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('imports/test-project-id/'),
        expect.any(Buffer),
        'text/csv',
      )

      // Verify inngest.send was called
      const { inngest } = await import('@/lib/inngest/client')
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'file-processor/import',
          data: expect.objectContaining({
            entity: 'tasks',
            projectId: 'test-project-id',
          }),
        }),
      )
    })
  })
})
