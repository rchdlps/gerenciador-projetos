/**
 * Test helper utilities
 */

import type { Hono } from 'hono'

/**
 * Create a mock request object for testing Hono routes
 */
export function createMockRequest(
  method: string,
  path: string,
  options?: {
    headers?: Record<string, string>
    body?: any
  }
): Request {
  const url = `http://localhost:4321${path}`
  const headers = new Headers(options?.headers || {})

  const init: RequestInit = {
    method,
    headers,
  }

  if (options?.body) {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(options.body)
  }

  return new Request(url, init)
}

/**
 * Helper to test Hono routes with mocked context
 */
export async function testRoute(
  app: Hono,
  method: string,
  path: string,
  options?: {
    headers?: Record<string, string>
    body?: any
  }
) {
  const request = createMockRequest(method, path, options)
  const response = await app.fetch(request)
  const data = await response.json()

  return {
    response,
    data,
    status: response.status,
  }
}

/**
 * Create mock authorization headers with session token
 */
export function createAuthHeaders(token: string = 'test-token'): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Cookie': `better-auth.session_token=${token}`,
  }
}

/**
 * Generate a random ID for testing
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Wait for a specified amount of time (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a mock Date that's a certain number of days from now
 */
export function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Assert that an object contains expected properties
 */
export function assertContains<T extends Record<string, any>>(
  obj: T,
  expected: Partial<T>
): void {
  for (const [key, value] of Object.entries(expected)) {
    if (obj[key] !== value) {
      throw new Error(`Expected ${key} to be ${value}, but got ${obj[key]}`)
    }
  }
}
