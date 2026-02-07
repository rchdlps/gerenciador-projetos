/**
 * Vitest setup file - runs before all tests
 */

import { vi } from 'vitest'

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.BETTER_AUTH_URL = 'http://localhost:4321'
process.env.S3_ENDPOINT = 'http://localhost:9000'
process.env.S3_REGION = 'us-east-1'
process.env.S3_ACCESS_KEY = 'test-access-key'
process.env.S3_SECRET_KEY = 'test-secret-key'
process.env.S3_BUCKET_NAME = 'test-bucket'

// Mock console methods to reduce noise in tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   error: vi.fn(),
//   warn: vi.fn(),
// }
