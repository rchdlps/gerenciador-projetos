/**
 * Mock factories for testing
 */

import { vi } from 'vitest'
import type { users, organizations, projects, memberships } from '../../db/schema'

export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: false,
  image: null,
  globalRole: 'user' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockSuperAdmin = {
  ...mockUser,
  id: 'super-admin-id',
  name: 'Super Admin',
  email: 'admin@example.com',
  globalRole: 'super_admin' as const,
}

export const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  code: 'TEST',
  logoUrl: null,
  secretario: 'Test Secretary',
  secretariaAdjunta: 'Test Assistant',
  diretoriaTecnica: 'Test Director',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockMembership = {
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  role: 'gestor' as const,
}

export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockSession = {
  user: mockUser,
  session: {
    id: 'test-session-id',
    userId: 'test-user-id',
    expiresAt: new Date(Date.now() + 86400000),
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
}

export const mockAdminSession = {
  user: mockSuperAdmin,
  session: {
    id: 'admin-session-id',
    userId: 'super-admin-id',
    expiresAt: new Date(Date.now() + 86400000),
    token: 'admin-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
}

/**
 * Mock the auth module
 */
export const mockAuth = {
  api: {
    getSession: vi.fn(),
    signUpEmail: vi.fn(),
  },
  $Infer: {
    Session: {
      user: mockUser,
      session: mockSession.session,
    },
  },
}

/**
 * Mock the database
 */
export const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  innerJoin: vi.fn(() => mockDb),
  leftJoin: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
  execute: vi.fn(() => Promise.resolve([])),
  query: {
    memberships: {
      findFirst: vi.fn(),
    },
    projects: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
  },
}

/**
 * Mock the audit logger
 */
export const mockCreateAuditLog = vi.fn()

/**
 * Mock storage utilities
 */
export const mockStorage = {
  uploadFile: vi.fn(() => Promise.resolve()),
  getDownloadUrl: vi.fn(() => Promise.resolve('https://test-download-url.com')),
  getPublicUrl: vi.fn((key: string) => `https://test-storage.example.com/bucket/${key}`),
  deleteFile: vi.fn(() => Promise.resolve()),
}
