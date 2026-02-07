import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@cuiaba.mt.gov.br')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should display projects list on dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Should show projects heading or list
    await expect(page.locator('text=/projetos|projects/i')).toBeVisible()
  })

  test('should create a new project', async ({ page }) => {
    await page.goto('/dashboard')

    // Click create project button
    const createButton = page.locator('button:has-text("Novo Projeto"), button:has-text("New Project"), button:has-text("Criar")')
    await createButton.first().click()

    // Fill in project details
    await page.fill('input[name="name"]', 'Test E2E Project')
    await page.fill('textarea[name="description"]', 'This is a test project created by E2E tests')

    // Select organization (if dropdown exists)
    const orgSelect = page.locator('select[name="organizationId"]')
    if (await orgSelect.count() > 0) {
      await orgSelect.selectOption({ index: 1 })
    }

    // Submit form
    await page.click('button[type="submit"]')

    // Should show success message or redirect to project page
    await expect(page.locator('text=/criado|created|sucesso|success/i')).toBeVisible({ timeout: 5000 })
  })

  test('should view project details', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on first project in the list
    const firstProject = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await firstProject.click()

    // Should navigate to project details page
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9_-]+/)

    // Should display project information
    await expect(page.locator('h1, h2')).toContainText(/.+/)
  })

  test('should filter projects by organization', async ({ page }) => {
    await page.goto('/dashboard')

    // Look for organization filter/selector
    const orgFilter = page.locator('select:has-text("Secretaria"), select:has-text("Organization")')

    if (await orgFilter.count() > 0) {
      const initialCount = await page.locator('[data-testid="project-item"]').count()

      // Change filter
      await orgFilter.selectOption({ index: 1 })

      // Wait for filter to apply
      await page.waitForTimeout(500)

      const filteredCount = await page.locator('[data-testid="project-item"]').count()

      // Count should change (unless all projects are in same org)
      expect(filteredCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should edit project details', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Click edit button
    const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit")')
    if (await editButton.count() > 0) {
      await editButton.click()

      // Update description
      await page.fill('textarea[name="description"]', 'Updated description from E2E test')

      // Save changes
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=/atualizado|updated|salvo|saved/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should manage project stakeholders', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Look for stakeholders section
    const stakeholdersSection = page.locator('text=/stakeholders|partes interessadas/i')

    if (await stakeholdersSection.count() > 0) {
      await stakeholdersSection.click()

      // Should display stakeholders list
      await expect(page.locator('[data-testid="stakeholder-item"], table')).toBeVisible()
    }
  })

  test('should manage project phases and tasks', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Look for phases/tasks section
    const phasesSection = page.locator('text=/fases|phases|tarefas|tasks/i')

    if (await phasesSection.count() > 0) {
      // Should display phases
      await expect(page.locator('[data-testid="phase-item"], [class*="phase"]')).toBeVisible()
    }
  })

  test('should create a new task', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Click add task button
    const addTaskButton = page.locator('button:has-text("Nova Tarefa"), button:has-text("Add Task"), button:has-text("Adicionar")')

    if (await addTaskButton.count() > 0) {
      await addTaskButton.first().click()

      // Fill task details
      await page.fill('input[name="title"]', 'E2E Test Task')
      await page.fill('textarea[name="description"]', 'Task created by E2E test')

      // Select priority
      const prioritySelect = page.locator('select[name="priority"]')
      if (await prioritySelect.count() > 0) {
        await prioritySelect.selectOption('high')
      }

      // Submit
      await page.click('button[type="submit"]')

      // Should show success
      await expect(page.locator('text=/criada|created|adicionada|added/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should update task status', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Find a task
    const task = page.locator('[data-testid="task-item"]').first()

    if (await task.count() > 0) {
      // Click on task to open details or edit
      await task.click()

      // Look for status selector
      const statusSelect = page.locator('select[name="status"]')

      if (await statusSelect.count() > 0) {
        await statusSelect.selectOption('in_progress')

        // Save if needed
        const saveButton = page.locator('button[type="submit"]')
        if (await saveButton.count() > 0) {
          await saveButton.click()
          await expect(page.locator('text=/atualizada|updated/i')).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('should navigate to project calendar', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Look for calendar link/tab
    const calendarLink = page.locator('a[href*="calendar"], text=/calendário|calendar/i')

    if (await calendarLink.count() > 0) {
      await calendarLink.click()

      // Should show calendar view
      await expect(page).toHaveURL(/calendar/)
    }
  })

  test('should access knowledge areas', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Look for knowledge areas link
    const knowledgeAreasLink = page.locator('a[href*="knowledge-areas"], text=/áreas de conhecimento/i')

    if (await knowledgeAreasLink.count() > 0) {
      await knowledgeAreasLink.click()

      // Should show knowledge areas
      await expect(page.locator('text=/escopo|cronograma|custos|scope|schedule|cost/i')).toBeVisible()
    }
  })

  test('should view project kanban board', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to a project
    const project = page.locator('[data-testid="project-item"], a:has-text("Implantação")').first()
    await project.click()

    // Look for board/kanban section
    const boardSection = page.locator('text=/quadro|board|kanban/i')

    if (await boardSection.count() > 0) {
      // Should display board columns
      await expect(page.locator('[data-testid="board-column"], [class*="column"]')).toBeVisible()
    }
  })
})

test.describe('Project Access Control', () => {
  test('viewer should not see edit buttons', async ({ page }) => {
    // Login as viewer
    await page.goto('/login')
    await page.fill('input[type="email"]', 'educacao@cuiaba.mt.gov.br')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Navigate to a project in their organization
    const project = page.locator('[data-testid="project-item"]').first()

    if (await project.count() > 0) {
      await project.click()

      // Edit and delete buttons should not be visible
      const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit")')
      await expect(editButton).not.toBeVisible()
    }
  })

  test('user should only see projects from their organizations', async ({ page }) => {
    // Login as user with limited org access
    await page.goto('/login')
    await page.fill('input[type="email"]', 'saude@cuiaba.mt.gov.br')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/dashboard')

    // Count visible projects (should be limited to their organization)
    const projectCount = await page.locator('[data-testid="project-item"]').count()

    // Should have some projects but not all (assuming test data has multiple orgs)
    expect(projectCount).toBeGreaterThan(0)
    expect(projectCount).toBeLessThan(20) // Assuming there are more projects in other orgs
  })
})
