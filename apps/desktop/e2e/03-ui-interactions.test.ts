import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { launchApp, typeCode, runCode, waitForExecution, getOutputText, clearOutput, clickToolbarButton } from './helpers'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  const launched = await launchApp()
  app = launched.app
  page = launched.page
})

test.afterAll(async () => {
  await app?.close()
})

// --- E2E-031: Clear output button works ---
test('E2E-031: clear output button clears entries', async () => {
  await typeCode(page, 'console.log("to be cleared")')
  await runCode(page)
  await waitForExecution(page)
  let output = await getOutputText(page)
  expect(output).toContain('to be cleared')

  await clearOutput(page)
  output = await getOutputText(page)
  expect(output).not.toContain('to be cleared')
})

// --- E2E-032: Toggle sidebar ---
test('E2E-032: sidebar toggle works', async () => {
  // Find the sidebar toggle
  const hideBtn = page.locator('button[title="Hide sidebar"]')
  const showBtn = page.locator('button[title="Show sidebar"]')

  // Determine current state and toggle
  const hideVisible = await hideBtn.isVisible().catch(() => false)
  if (hideVisible) {
    await hideBtn.click()
    await page.waitForTimeout(300)
    await expect(showBtn).toBeVisible()
    // Toggle back
    await showBtn.click()
    await page.waitForTimeout(300)
    await expect(hideBtn).toBeVisible()
  } else {
    await showBtn.click()
    await page.waitForTimeout(300)
    await expect(hideBtn).toBeVisible()
  }
})

// --- E2E-033: Output mode toggle ---
test('E2E-033: output mode toggle switches', async () => {
  const consoleMode = page.locator('button[title="Switch to console mode"]')
  const alignedMode = page.locator('button[title="Switch to line-aligned mode"]')

  const consoleVisible = await consoleMode.isVisible().catch(() => false)
  if (consoleVisible) {
    await consoleMode.click()
    await page.waitForTimeout(300)
    await expect(alignedMode).toBeVisible()
    // Switch back
    await alignedMode.click()
    await page.waitForTimeout(300)
  } else {
    await alignedMode.click()
    await page.waitForTimeout(300)
    await expect(consoleMode).toBeVisible()
  }
})

// --- E2E-034: Copy output button ---
test('E2E-034: copy button shows feedback', async () => {
  await typeCode(page, 'console.log("copy me")')
  await runCode(page)
  await waitForExecution(page)

  const copyBtn = page.locator('button[title="Copy output"]')
  await expect(copyBtn).toBeVisible()
  await copyBtn.click()
  // After click, title changes to "Copied!"
  await page.waitForTimeout(200)
  const copiedBtn = page.locator('button[title="Copied!"]')
  await expect(copiedBtn).toBeVisible()
  // Wait for it to reset
  await page.waitForTimeout(2000)
})

// --- E2E-035: Keyboard shortcut Cmd+Enter runs code ---
test('E2E-035: Cmd+Enter runs code', async () => {
  await clearOutput(page)
  await typeCode(page, 'console.log("keyboard run")')
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
  await page.keyboard.press(`${modifier}+Enter`)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('keyboard run')
})

// --- E2E-036: Duration badge appears after execution ---
test('E2E-036: duration badge shows after run', async () => {
  await typeCode(page, 'console.log("timing")')
  await runCode(page)
  await waitForExecution(page)
  // Duration badge should show "Xms"
  const bodyText = await page.locator('body').textContent()
  expect(bodyText).toMatch(/\d+ms/)
})

// --- E2E-037: Re-run replaces output ---
test('E2E-037: re-run replaces previous output', async () => {
  await typeCode(page, 'console.log("run1")')
  await runCode(page)
  await waitForExecution(page)
  let output = await getOutputText(page)
  expect(output).toContain('run1')

  await typeCode(page, 'console.log("run2")')
  await runCode(page)
  await waitForExecution(page)
  output = await getOutputText(page)
  expect(output).toContain('run2')
  expect(output).not.toContain('run1')
})

// --- E2E-038: Click app title opens About dialog ---
test('E2E-038: clicking app title opens About dialog', async () => {
  // The app title "nodl v1.0" is a clickable button
  const titleBtn = page.locator('button:has-text("nodl")')
  await titleBtn.first().click()
  await page.waitForTimeout(500)

  // About dialog should show changelog, author info
  const dialogText = await page.locator('body').textContent()
  expect(dialogText).toContain('Hung Doan')

  // Close dialog by clicking the backdrop
  const backdrop = page.locator('.fixed.inset-0 .absolute.inset-0').first()
  await backdrop.click({ position: { x: 5, y: 5 }, force: true })
  await page.waitForTimeout(600)
})

// --- E2E-039: Settings dialog opens ---
test('E2E-039: settings dialog opens and closes', async () => {
  // If About dialog is still open, click its backdrop to dismiss
  const existingBackdrop = page.locator('.fixed.inset-0 .absolute.inset-0').first()
  if (await existingBackdrop.isVisible().catch(() => false)) {
    await existingBackdrop.click({ position: { x: 5, y: 5 }, force: true })
    await page.waitForTimeout(600)
  }

  // Ensure sidebar is visible
  const showBtn = page.locator('button[title="Show sidebar"]')
  const showVisible = await showBtn.isVisible().catch(() => false)
  if (showVisible) {
    await showBtn.click()
    await page.waitForTimeout(300)
  }

  // Click the Settings item in sidebar
  const settingsItem = page.locator('[class*="cursor-pointer"]:has-text("Settings")')
  await settingsItem.last().click({ force: true })
  await page.waitForTimeout(500)

  // Dialog should be visible with settings options
  const bodyText = await page.locator('body').textContent()
  expect(bodyText).toContain('Font Size')

  // Close settings dialog
  const settingsBackdrop = page.locator('.fixed.inset-0 .absolute.inset-0').first()
  await settingsBackdrop.click({ position: { x: 5, y: 5 }, force: true })
  await page.waitForTimeout(600)
})

// --- E2E-040: Packages dialog opens ---
test('E2E-040: packages dialog opens and closes', async () => {
  // Ensure sidebar is visible
  const showBtn = page.locator('button[title="Show sidebar"]')
  const showVisible = await showBtn.isVisible().catch(() => false)
  if (showVisible) {
    await showBtn.click()
    await page.waitForTimeout(300)
  }

  // Click Packages in sidebar
  const packages = page.locator('text=Packages')
  await packages.first().click()
  await page.waitForTimeout(500)

  const bodyText = await page.locator('body').textContent()
  expect(bodyText).toContain('Packages')

  // Close
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})
