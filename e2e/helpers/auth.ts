import type { Page } from '@playwright/test'

/**
 * Helper function to log in a user
 * Uses pressSequentially() instead of fill() to properly trigger React onChange events
 */
export async function login(page: Page, email: string, password: string) {
  // Fill email
  const emailInput = page.locator('input[type="email"]')
  await emailInput.click()
  await emailInput.pressSequentially(email, { delay: 50 })

  // Fill password
  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.click()
  await passwordInput.pressSequentially(password, { delay: 50 })

  // Wait for React state to update
  await page.waitForTimeout(300)

  // Click submit and wait for navigation
  const navigationPromise = page.waitForURL(url => url.pathname === '/', { timeout: 15000 })
  await page.locator('button[type="submit"]:has-text("Entrar")').click()
  await navigationPromise
}
