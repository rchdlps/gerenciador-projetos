import { test } from '@playwright/test'

test.describe('Login Debug', () => {
  test('debug login with full details', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('[Browser Console]:', msg.text()))
    page.on('pageerror', error => console.log('[Browser Error]:', error.message))

    // Listen for network activity
    page.on('request', async request => {
      if (request.url().includes('/api/auth')) {
        console.log(`\n[Request] ${request.method()} ${request.url()}`)
        console.log('[Request Headers]:', JSON.stringify(request.headers(), null, 2))
        if (request.method() === 'POST') {
          try {
            console.log('[Request Body]:', request.postData())
          } catch (e) {
            console.log('[Request Body] Could not read')
          }
        }
      }
    })

    page.on('response', async response => {
      if (response.url().includes('/api/auth')) {
        console.log(`\n[Response] ${response.status()} ${response.url()}`)
        console.log('[Response Headers]:', JSON.stringify(response.headers(), null, 2))
        try {
          const body = await response.text()
          console.log(`[Response Body]`, body)
        } catch (e) {
          console.log('[Response Body] Could not read')
        }
      }
    })

    // Go to login page
    await page.goto('/login')
    console.log('\n=== Navigated to login page ===')

    // Check cookies before login
    const cookiesBefore = await page.context().cookies()
    console.log('\n[Cookies Before]:', JSON.stringify(cookiesBefore, null, 2))

    // Fill credentials
    await page.locator('input[type="email"]').fill('admin@cuiaba.mt.gov.br')
    await page.locator('input[type="password"]').fill('password123')

    // Get the actual values to verify they're set correctly
    const emailValue = await page.locator('input[type="email"]').inputValue()
    const passwordValue = await page.locator('input[type="password"]').inputValue()
    console.log(`\nEmail input value: "${emailValue}"`)
    console.log(`Password input value length: ${passwordValue.length}`)

    // Click submit
    console.log('\n=== Clicking submit button ===')
    await page.locator('button[type="submit"]:has-text("Entrar")').click()

    // Wait for response
    await page.waitForTimeout(5000)

    // Check cookies after
    const cookiesAfter = await page.context().cookies()
    console.log('\n[Cookies After]:', JSON.stringify(cookiesAfter, null, 2))

    const currentUrl = page.url()
    console.log(`\n=== Current URL: ${currentUrl} ===`)

    // Check for error messages
    const errorDiv = await page.locator('.text-red-500, [class*="error"]').first()
    const isErrorVisible = await errorDiv.isVisible().catch(() => false)

    if (isErrorVisible) {
      const errorText = await errorDiv.textContent()
      console.log(`\nError message: ${errorText}`)
    }

    // Check localStorage and sessionStorage
    const storage = await page.evaluate(() => ({
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage }
    }))
    console.log(`\n[Storage]:`, JSON.stringify(storage, null, 2))

    // Take screenshot
    await page.screenshot({ path: 'test-results/login-debug-full.png', fullPage: true })
  })
})
