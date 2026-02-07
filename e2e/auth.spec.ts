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

    // Fill with invalid email format
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('invalid-email')

    // Trigger validation by attempting to submit or blur
    await page.locator('input[type="password"]').click()

    // Browser's built-in HTML5 validation should prevent submission
    // Check if the email input is invalid
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Use seeded test user credentials
    // Use pressSequentially() to trigger React onChange events properly
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.click()
    await emailInput.pressSequentially('admin@cuiaba.mt.gov.br', { delay: 50 })

    await passwordInput.click()
    await passwordInput.pressSequentially('password123', { delay: 50 })

    // Wait a moment for React state to update
    await page.waitForTimeout(300)

    // Click submit button - better-auth does async login then client-side redirect
    const submitButton = page.locator('button[type="submit"]:has-text("Entrar")')

    // Wait for navigation to occur after clicking submit
    const navigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
    await submitButton.click()
    await navigationPromise

    // Verify we're logged in by checking for the logout button
    await expect(page.locator('button:has-text("Sair")')).toBeVisible({ timeout: 5000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.locator('input[type="email"]').click()
    await page.locator('input[type="email"]').pressSequentially('nonexistent@example.com', { delay: 50 })
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').pressSequentially('wrongpassword', { delay: 50 })
    await page.waitForTimeout(300)
    await page.click('button[type="submit"]')

    // Should show error message - either in toast or error div
    await expect(page.locator('text=/erro|error|incorret|inválid|credenciais/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login')

    // Click on register link
    await page.click('a[href="/register"]')

    await expect(page).toHaveURL(/\/register/)
  })

  test('should display registration form', async ({ page }) => {
    await page.goto('/register')

    // Check for registration form elements (using id selectors)
    await expect(page.locator('input#name')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.locator('input[type="email"]').click()
    await page.locator('input[type="email"]').pressSequentially('admin@cuiaba.mt.gov.br', { delay: 50 })
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').pressSequentially('password123', { delay: 50 })
    await page.waitForTimeout(300)

    const loginNavigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
    await page.locator('button[type="submit"]:has-text("Entrar")').click()
    await loginNavigationPromise

    // Wait for page to be fully loaded
    await expect(page.locator('button:has-text("Sair")')).toBeVisible()

    // Logout - click the "Sair" button
    const logoutNavigationPromise = page.waitForURL(url => url.pathname === '/login', { timeout: 15000 })
    await page.click('button:has-text("Sair")')
    await logoutNavigationPromise

    // Should be on login page
    await expect(page).toHaveURL('/login')
    await expect(page.locator('button[type="submit"]:has-text("Entrar")')).toBeVisible()
  })

  test('should persist session on page reload', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.locator('input[type="email"]').click()
    await page.locator('input[type="email"]').pressSequentially('admin@cuiaba.mt.gov.br', { delay: 50 })
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').pressSequentially('password123', { delay: 50 })
    await page.waitForTimeout(300)

    const navigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
    await page.locator('button[type="submit"]:has-text("Entrar")').click()
    await navigationPromise

    // Reload page
    await page.reload()

    // Should still be authenticated - check for logout button
    await expect(page.locator('button:has-text("Sair")')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Authorization', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.locator('input[type="email"]').click()
    await page.locator('input[type="email"]').pressSequentially('saude@cuiaba.mt.gov.br', { delay: 50 })
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').pressSequentially('password123', { delay: 50 })
    await page.waitForTimeout(300)

    const navigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
    await page.locator('button[type="submit"]:has-text("Entrar")').click()
    await navigationPromise

    // Wait for logout button to be visible
    await expect(page.locator('button:has-text("Sair")')).toBeVisible({ timeout: 5000 })
  })

  test('should hide admin menu for non-admin users', async ({ page }) => {
    await page.goto('/')

    // Admin menu should not be visible
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).not.toBeVisible()
  })

  test('should show admin menu for super admin', async ({ page }) => {
    // Logout and login as admin
    const logoutNavigationPromise = page.waitForURL(url => url.pathname === '/login', { timeout: 15000 })
    await page.click('button:has-text("Sair")')
    await logoutNavigationPromise

    await page.locator('input[type="email"]').click()
    await page.locator('input[type="email"]').pressSequentially('admin@cuiaba.mt.gov.br', { delay: 50 })
    await page.locator('input[type="password"]').click()
    await page.locator('input[type="password"]').pressSequentially('password123', { delay: 50 })
    await page.waitForTimeout(300)

    const loginNavigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
    await page.locator('button[type="submit"]:has-text("Entrar")').click()
    await loginNavigationPromise

    // Admin link should be visible
    const adminLink = page.locator('a[href="/admin"]')
    await expect(adminLink).toBeVisible({ timeout: 5000 })
  })
})
