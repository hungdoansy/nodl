import { _electron, type ElectronApplication, type Page } from '@playwright/test'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

/**
 * Resolves the path to the packaged app or falls back to electron dev launch.
 */
function getAppPath(): string {
  // Packaged app (macOS)
  const macApp = join(PROJECT_ROOT, 'dist', 'mac-arm64', 'nodl.app', 'Contents', 'MacOS', 'nodl')
  if (existsSync(macApp)) return macApp

  // Packaged app (macOS x64)
  const macX64App = join(PROJECT_ROOT, 'dist', 'mac', 'nodl.app', 'Contents', 'MacOS', 'nodl')
  if (existsSync(macX64App)) return macX64App

  throw new Error('No packaged app found. Run `pnpm run pack` first.')
}

/**
 * Launch the packaged Electron app and return the app + first window.
 */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const executablePath = getAppPath()

  const app = await _electron.launch({
    executablePath,
    args: [],
    env: {
      ...process.env,
      // Ensure clean state for testing
      NODE_ENV: 'production'
    }
  })

  const page = await app.firstWindow()
  // Wait for the app to be fully loaded
  await page.waitForLoadState('domcontentloaded')
  // Give Monaco editor time to initialize
  await page.waitForTimeout(2000)

  return { app, page }
}

/**
 * Type code into the Monaco editor using Monaco's setValue API.
 * keyboard.type() doesn't handle newlines properly in Monaco.
 */
export async function typeCode(page: Page, code: string): Promise<void> {
  // Use Monaco's model API to set the value directly
  await page.evaluate((c) => {
    // Access Monaco editor instance via the global model
    const editors = (window as any).monaco?.editor?.getEditors?.()
    if (editors && editors.length > 0) {
      const editor = editors[0]
      editor.setValue(c)
      return
    }
    // Fallback: find editor model
    const models = (window as any).monaco?.editor?.getModels?.()
    if (models && models.length > 0) {
      models[0].setValue(c)
    }
  }, code)
  await page.waitForTimeout(200)
}

/**
 * Click the Run button (Cmd+Enter).
 */
export async function runCode(page: Page): Promise<void> {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
  await page.keyboard.press(`${modifier}+Enter`)
}

/**
 * Wait for execution to complete (duration badge appears).
 */
export async function waitForExecution(page: Page, timeout = 10000): Promise<void> {
  // Wait for duration text to appear (e.g., "123ms" or "1.2s")
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[style*="userSelect"]')
      // Look for the duration badge - it contains "ms" or "s"
      const allText = document.body.innerText
      return /\d+ms/.test(allText)
    },
    { timeout }
  )
  // Small buffer for output to flush
  await page.waitForTimeout(500)
}

/**
 * Get all visible output text from the output panel.
 */
export async function getOutputText(page: Page): Promise<string> {
  // The output panel is the second panel in the resizable layout
  // Get all text content from console entries
  const text = await page.evaluate(() => {
    // Find output entries - they contain the actual log output
    const outputPanel = document.querySelectorAll('[class*="overflow-y-auto"]')
    if (outputPanel.length === 0) return ''
    const last = outputPanel[outputPanel.length - 1]
    return last?.textContent || ''
  })
  return text
}

/**
 * Get error text from the output panel (errors shown at top).
 */
export async function getErrorText(page: Page): Promise<string> {
  const text = await page.evaluate(() => {
    // Errors have red-tinted background
    const errorEls = document.querySelectorAll('[style*="rgba(239, 68, 68"]')
    return Array.from(errorEls).map(el => el.textContent).join('\n')
  })
  return text
}

/**
 * Click a toolbar button by its title attribute.
 */
export async function clickToolbarButton(page: Page, title: string): Promise<void> {
  await page.locator(`button[title="${title}"]`).click()
}

/**
 * Check if the output panel contains specific text.
 */
export async function outputContains(page: Page, text: string): Promise<boolean> {
  const output = await getOutputText(page)
  return output.includes(text)
}

/**
 * Clear the output panel.
 */
export async function clearOutput(page: Page): Promise<void> {
  await clickToolbarButton(page, 'Clear output')
  await page.waitForTimeout(300)
}
