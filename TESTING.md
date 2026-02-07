# Testing Guide

This document provides detailed information about the testing strategy and how to write tests for this project.

## Quick Start

```bash
# Run all unit and integration tests
npm test

# Run tests once (CI mode)
npm run test:run

# Open interactive test UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Open Playwright UI
npm run test:e2e:ui
```

## Test Structure

### 1. Unit Tests
**Location:** `src/**/__tests__/*.test.ts`
**Framework:** Vitest
**Purpose:** Test utilities and helpers in isolation

**Example:**
```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn, formatBytes } from '../utils'

describe('cn (className merger)', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toBe('px-4 py-2')
  })
})
```

### 2. API Integration Tests
**Location:** `src/server/routes/__tests__/*.test.ts`
**Framework:** Vitest + Hono testing utilities
**Purpose:** Test API routes with mocked dependencies

**Example:**
```typescript
// src/server/routes/__tests__/projects.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testRoute, createAuthHeaders } from '../../../test/helpers'
import { mockUser } from '../../../test/mocks'

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}))

describe('Projects API', () => {
  it('should allow authenticated access', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: mockUser,
      session: { id: 'test-session' }
    })

    const result = await testRoute(app, 'GET', '/projects', {
      headers: createAuthHeaders()
    })

    expect(result.status).toBe(200)
  })
})
```

### 3. E2E Tests
**Location:** `e2e/*.spec.ts`
**Framework:** Playwright
**Purpose:** Test complete user flows in a browser

**Example:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('should login with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@cuiaba.mt.gov.br')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/dashboard/)
})
```

## Test Utilities

### Mock Factories (`src/test/mocks.ts`)

Provides pre-configured mock objects:
- `mockUser` - Regular user
- `mockSuperAdmin` - Super admin user
- `mockOrganization` - Organization
- `mockProject` - Project
- `mockMembership` - Organization membership
- `mockSession` - Authentication session
- `mockDb` - Mocked database
- `mockAuth` - Mocked auth module
- `mockStorage` - Mocked S3 storage

### Test Helpers (`src/test/helpers.ts`)

Utility functions for testing:

```typescript
// Create a mock request
createMockRequest(method, path, { headers, body })

// Test a Hono route
testRoute(app, method, path, { headers, body })

// Create auth headers
createAuthHeaders(token)

// Generate test IDs
generateTestId(prefix)

// Wait for async operations
wait(ms)

// Create dates relative to now
daysFromNow(days)
```

### Setup (`src/test/setup.ts`)

Global test setup that runs before all tests:
- Sets mock environment variables
- Configures test environment

## Writing Tests

### Testing an API Route

1. **Create test file:** `src/server/routes/__tests__/myroute.test.ts`

2. **Mock dependencies:**
```typescript
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } }
}))

vi.mock('@/lib/db', () => ({
  db: { /* mock db methods */ }
}))
```

3. **Write tests:**
```typescript
describe('My Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle authentication', async () => {
    // Setup mocks
    // Call route
    // Assert results
  })
})
```

### Testing Authentication/Authorization

Always test these scenarios:
- ✅ Unauthenticated access (should return 401)
- ✅ Authenticated access (should succeed)
- ✅ Super admin bypass (should have full access)
- ✅ Role hierarchy (viewer < gestor < secretario)
- ✅ Organization membership (user can only access their orgs)

### Testing Validation

Test Zod schema validation:
```typescript
it('should reject invalid input', async () => {
  const result = await testRoute(app, 'POST', '/endpoint', {
    headers: createAuthHeaders(),
    body: { name: '' } // Invalid: empty name
  })

  expect(result.status).toBe(400)
  expect(result.data).toHaveProperty('error')
})
```

### Testing Audit Logging

Verify audit logs are created:
```typescript
import { createAuditLog } from '@/lib/audit-logger'

it('should create audit log', async () => {
  await doSomething()

  expect(createAuditLog).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'CREATE',
      resource: 'project'
    })
  )
})
```

## E2E Testing

### Seeded Test Users

Use these credentials for E2E tests:

| Email | Password | Role | Organization |
|-------|----------|------|--------------|
| admin@cuiaba.mt.gov.br | password123 | Super Admin | All |
| saude@cuiaba.mt.gov.br | password123 | Gestor | SMS |
| obras@cuiaba.mt.gov.br | password123 | Gestor | SMOB |
| educacao@cuiaba.mt.gov.br | password123 | Viewer | SME |

### Best Practices

1. **Use data-testid attributes** for stable selectors:
```tsx
<button data-testid="create-project-btn">Create</button>
```

2. **Wait for navigation:**
```typescript
await page.click('button[type="submit"]')
await expect(page).toHaveURL(/\/dashboard/)
```

3. **Handle async operations:**
```typescript
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 })
```

4. **Test different user roles:**
```typescript
test.describe('As Admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
  })
})

test.describe('As Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Login as viewer
  })
})
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:run

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage Reports

Generate coverage with:
```bash
npm run test:coverage
```

View HTML report at `coverage/index.html`

**Coverage Goals:**
- Unit tests: 80%+ for utilities and helpers
- Integration tests: All API routes covered
- E2E tests: Critical user journeys

## Troubleshooting

### Tests fail with "MODULE_NOT_FOUND"
- Check `vitest.config.ts` path aliases match `tsconfig.json`
- Ensure mocks use correct import paths

### E2E tests timeout
- Increase timeout in test: `{ timeout: 10000 }`
- Check dev server is running: `npm run dev`
- Ensure database is seeded: `npx tsx db/seed.ts`

### Mock not working
- Clear all mocks in `beforeEach`: `vi.clearAllMocks()`
- Check mock is defined before importing tested module
- Use dynamic imports: `const { auth } = await import('@/lib/auth')`

### Database errors in tests
- Tests should use mocked database by default
- For real DB tests, use `TEST_DATABASE_URL` env variable
- Ensure test database is migrated and seeded

## Next Steps

- [ ] Add more API route tests (stakeholders, knowledge areas, etc.)
- [ ] Add component tests with React Testing Library
- [ ] Set up visual regression testing (Playwright screenshots)
- [ ] Add performance tests for critical API endpoints
- [ ] Configure CI/CD pipeline with test coverage reports
