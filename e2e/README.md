# E2E Testing Guide

## Overview

This directory contains end-to-end tests using Playwright that test the complete user flows of the application in a real browser environment.

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Open Playwright UI for interactive testing
npm run test:e2e:ui

# Run tests in debug mode with inspector
npm run test:e2e:debug
```

## Prerequisites

Before running E2E tests, ensure:

1. **Database is seeded** with test data:
   ```bash
   npx tsx db/seed.ts
   ```

2. **Dev server is running** (Playwright will auto-start if not running):
   ```bash
   npm run dev
   ```

## Test Files

- **auth.spec.ts** - Authentication and authorization flows
  - Login/logout
  - Registration
  - Session persistence
  - Role-based access control

- **projects.spec.ts** - Project management flows
  - Project CRUD operations
  - Task management
  - Stakeholder management
  - Kanban board
  - Calendar views
  - Knowledge areas
  - Access control by organization and role

## Test Users

The E2E tests use seeded user accounts:

| Email | Password | Role | Organization |
|-------|----------|------|--------------|
| admin@cuiaba.mt.gov.br | password123 | Super Admin | All orgs |
| saude@cuiaba.mt.gov.br | password123 | Gestor | SMS |
| obras@cuiaba.mt.gov.br | password123 | Gestor | SMOB |
| educacao@cuiaba.mt.gov.br | password123 | Viewer | SME |

## Best Practices

### 1. Use Proper Waiting Patterns

✅ **DO** - Wait for navigation explicitly:
```typescript
await Promise.all([
  page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
  page.locator('button[type="submit"]:has-text("Entrar")').click()
])
```

❌ **DON'T** - Click and hope navigation completes:
```typescript
await page.click('button[type="submit"]')
await expect(page).toHaveURL(/\/dashboard/) // May fail if navigation not complete
```

**Note:** The application redirects to `/` (root) after successful login, which serves as the main dashboard. Tests should accept either `/` or `/dashboard` in URL patterns to handle both the redirect and direct navigation.

### 2. Use Specific Locators

✅ **DO** - Use `page.locator()` with specific selectors:
```typescript
await page.locator('button[type="submit"]:has-text("Entrar")').click()
```

❌ **DON'T** - Use generic methods that may not wait properly:
```typescript
await page.click('button[type="submit"]') // Less specific
```

### 3. Handle Conditional Elements

When testing features that may not always be visible:

```typescript
const editButton = page.locator('button:has-text("Editar")')
if (await editButton.count() > 0) {
  await editButton.click()
  // ... test edit flow
}
```

### 4. Use data-testid Attributes

When possible, add `data-testid` attributes to components for stable selectors:

```tsx
<div data-testid="project-item">...</div>
```

Then in tests:
```typescript
const project = page.locator('[data-testid="project-item"]').first()
```

### 5. Verify UI Feedback

Always verify that the UI shows appropriate feedback:

```typescript
// After creating a resource
await expect(page.locator('text=/criado|created|sucesso|success/i')).toBeVisible({ timeout: 5000 })

// After deleting
await expect(page.locator('text=/excluído|deleted/i')).toBeVisible()
```

## Debugging Failed Tests

### View Test Reports

After test run:
```bash
npx playwright show-report
```

### Run Single Test

```bash
npx playwright test auth.spec.ts
```

### Run Specific Test by Name

```bash
npx playwright test -g "should login with valid credentials"
```

### Debug Mode with Inspector

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through test actions
- Inspect page state
- View screenshots
- Check network requests

### Common Issues

**Test fails with timeout on login:**
- Ensure database is seeded: `npx tsx db/seed.ts`
- Check test user credentials exist
- Verify dev server is running on port 4321

**Element not found:**
- Check if element selector matches actual HTML
- Use Playwright Inspector to find correct selector
- Verify element is visible (not hidden by CSS)

**Flaky tests:**
- Add explicit waits: `await page.waitForURL()`
- Use `page.waitForLoadState('networkidle')` when needed
- Avoid `page.waitForTimeout()` - use explicit conditions instead

## Network Conditions

To test under different network conditions:

```typescript
test('should handle slow network', async ({ page, context }) => {
  await context.route('**/*', route => {
    setTimeout(() => route.continue(), 1000) // Add 1s delay
  })

  // ... your test
})
```

## Screenshots and Videos

Playwright automatically captures:
- Screenshots on failure
- Videos on retry
- Traces for debugging

Configure in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry'
}
```

## Adding New Tests

1. **Create test file** in `e2e/` directory
2. **Import Playwright test utilities:**
   ```typescript
   import { test, expect } from '@playwright/test'
   ```
3. **Group related tests:**
   ```typescript
   test.describe('Feature Name', () => {
     test.beforeEach(async ({ page }) => {
       // Setup for each test
     })

     test('should do something', async ({ page }) => {
       // Test implementation
     })
   })
   ```
4. **Use seeded test data** from `db/seed.ts`
5. **Test different user roles** to verify access control
6. **Verify both success and error paths**

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Seed Test Database
  run: npx tsx db/seed.ts
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Playwright Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```
