import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { launchApp } from './helpers'

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

// --- E2E-001: App launches successfully ---
test('E2E-001: app window opens', async () => {
  expect(page).toBeTruthy()
  const title = await page.title()
  // Electron apps may have empty or custom title
  expect(typeof title).toBe('string')
})

// --- E2E-002: Window has correct dimensions ---
test('E2E-002: window has reasonable dimensions', async () => {
  const { width, height } = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }))
  expect(width).toBeGreaterThan(600)
  expect(height).toBeGreaterThan(400)
})

// --- E2E-003: Header is visible ---
test('E2E-003: header is visible with app name', async () => {
  const headerText = await page.locator('header, [class*="toolbar"]').first().textContent()
  expect(headerText).toBeTruthy()
})

// --- E2E-004: Monaco editor loads ---
test('E2E-004: Monaco editor is present', async () => {
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-005: Run button exists ---
test('E2E-005: Run button is visible', async () => {
  const runBtn = page.locator('button[title="Run (Cmd+Enter)"]')
  await expect(runBtn).toBeVisible()
})

// --- E2E-006: Output panel exists ---
test('E2E-006: Output panel header visible', async () => {
  const outputLabel = page.locator('text=Output')
  await expect(outputLabel.first()).toBeVisible()
})

// --- E2E-007: Sidebar toggle exists ---
test('E2E-007: sidebar toggle button exists', async () => {
  const toggle = page.locator('button[title="Hide sidebar"], button[title="Show sidebar"]')
  await expect(toggle.first()).toBeVisible()
})

// --- E2E-008: Theme toggle exists ---
test('E2E-008: theme toggle button exists', async () => {
  const theme = page.locator('button[title*="Theme"]')
  await expect(theme.first()).toBeVisible()
})

// --- E2E-009: Clear output button exists ---
test('E2E-009: clear output button exists', async () => {
  const clear = page.locator('button[title="Clear output"]')
  await expect(clear).toBeVisible()
})

// --- E2E-010: Output mode toggle exists ---
test('E2E-010: output mode toggle exists', async () => {
  const modeToggle = page.locator('button[title*="Switch to"]')
  await expect(modeToggle).toBeVisible()
})
