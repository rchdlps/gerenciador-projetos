import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/')

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display login form', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('text=/invalid|válido/i')).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Use seeded test user credentials
    await page.locator('input[type="email"]').fill('admin@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    // Wait for navigation after clicking submit
    await Promise.all([
      page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
      page.locator('button[type="submit"]:has-text("Entrar")').click()
    ])
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=/incorrect|inválid|erro/i')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login')

    // Click on register link
    await page.click('a[href="/register"]')

    await expect(page).toHaveURL(/\/register/)
  })

  test('should display registration form', async ({ page }) => {
    await page.goto('/register')

    // Check for registration form elements
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    await Promise.all([
      page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
      page.locator('button[type="submit"]:has-text("Entrar")').click()
    ])

    // Logout
    // This assumes there's a logout button/menu - adjust selector as needed
    await page.click('button:has-text("Sair"), button:has-text("Logout")')

    // Should redirect to login or home page
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 5000 })
  })

  test('should persist session on page reload', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    await Promise.all([
      page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
      page.locator('button[type="submit"]:has-text("Entrar")').click()
    ])

    // Reload page
    await page.reload()

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/^\/$|^\/dashboard$/)
  })
})

test.describe('Authorization', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('saude@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    await Promise.all([
      page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
      page.locator('button[type="submit"]:has-text("Entrar")').click()
    ])
  })

  test('should hide admin menu for non-admin users', async ({ page }) => {
    await page.goto('/')

    // Admin menu should not be visible
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).not.toBeVisible()
  })

  test('should show admin menu for super admin', async ({ page, context }) => {
    // Logout and login as admin
    await page.click('button:has-text("Sair"), button:has-text("Logout")')

    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    await Promise.all([
      page.waitForURL(/^\/$|^\/dashboard$/, { timeout: 10000 }),
      page.locator('button[type="submit"]:has-text("Entrar")').click()
    ])

    // Admin link should be visible
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).toBeVisible()
  })
})
