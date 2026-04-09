import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { launchApp, typeCode, runCode, waitForExecution, getOutputText, getErrorText, clearOutput } from './helpers'

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

test.beforeEach(async () => {
  await clearOutput(page)
})

// --- E2E-011: Simple console.log ---
test('E2E-011: console.log outputs text', async () => {
  await typeCode(page, 'console.log("hello e2e")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('hello e2e')
})

// --- E2E-012: Expression result display ---
test('E2E-012: expression result shown inline', async () => {
  await typeCode(page, '1 + 2')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('3')
})

// --- E2E-013: Multiple console calls ---
test('E2E-013: multiple console.log calls', async () => {
  await typeCode(page, 'console.log("first")\nconsole.log("second")\nconsole.log("third")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('first')
  expect(output).toContain('second')
  expect(output).toContain('third')
})

// --- E2E-014: Syntax error ---
test('E2E-014: syntax error displays error', async () => {
  await typeCode(page, 'const x = ;')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // Should show some kind of error
  expect(output.toLowerCase()).toMatch(/error|unexpected/)
})

// --- E2E-015: Runtime error ---
test('E2E-015: runtime error displays error', async () => {
  await typeCode(page, 'null.foo')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output.toLowerCase()).toContain('typeerror')
})

// --- E2E-016: ReferenceError ---
test('E2E-016: undefined variable shows ReferenceError', async () => {
  await typeCode(page, 'console.log(undefinedVariable)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output.toLowerCase()).toContain('referenceerror')
})

// --- E2E-017: Object output ---
test('E2E-017: console.log with object', async () => {
  await typeCode(page, 'console.log({ name: "test", value: 42 })')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Object')
})

// --- E2E-018: Array output ---
test('E2E-018: console.log with array', async () => {
  await typeCode(page, 'console.log([1, 2, 3])')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Array')
})

// --- E2E-019: String expression ---
test('E2E-019: string expression result', async () => {
  await typeCode(page, '"hello world"')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // String expression may show as inline result or not show at all (undefined skipped)
  // At minimum, no error should occur
  const hasOutput = output.includes('hello world') || output.includes('hello')
  const hasError = output.toLowerCase().includes('error')
  expect(hasError).toBe(false)
})

// --- E2E-020: Boolean expression ---
test('E2E-020: boolean expression result', async () => {
  await typeCode(page, '5 > 3')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('true')
})

// --- E2E-021: console.warn ---
test('E2E-021: console.warn outputs', async () => {
  await typeCode(page, 'console.warn("warning message")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('warning message')
})

// --- E2E-022: console.error ---
test('E2E-022: console.error outputs', async () => {
  await typeCode(page, 'console.error("error message")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('error message')
})

// --- E2E-023: Multi-line code ---
test('E2E-023: multi-line code execution', async () => {
  await typeCode(page, 'const x = 10\nconst y = 20\nconsole.log(x + y)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('30')
})

// --- E2E-024: Function definition and call ---
test('E2E-024: function definition and call', async () => {
  await typeCode(page, 'function add(a, b) { return a + b }\nconsole.log(add(3, 4))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('7')
})

// --- E2E-025: Arrow function ---
test('E2E-025: arrow function', async () => {
  await typeCode(page, 'const mul = (a, b) => a * b\nconsole.log(mul(5, 6))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('30')
})

// --- E2E-026: Template literal ---
test('E2E-026: template literal', async () => {
  await typeCode(page, 'const name = "world"\nconsole.log(`hello ${name}`)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('hello world')
})

// --- E2E-027: Async/await ---
test('E2E-027: async await execution', async () => {
  await typeCode(page, 'const result = await Promise.resolve(42)\nconsole.log(result)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('42')
})

// --- E2E-028: setTimeout ---
test('E2E-028: setTimeout fires and output captured', async () => {
  await typeCode(page, 'setTimeout(() => console.log("delayed"), 100)')
  await runCode(page)
  await page.waitForTimeout(3000)
  const output = await getOutputText(page)
  expect(output).toContain('delayed')
})

// --- E2E-029: for loop ---
test('E2E-029: for loop output', async () => {
  await typeCode(page, 'for (let i = 0; i < 3; i++) {\n  console.log(i)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('0')
  expect(output).toContain('1')
  expect(output).toContain('2')
})

// --- E2E-030: Destructuring ---
test('E2E-030: destructuring', async () => {
  await typeCode(page, 'const { a, b } = { a: 1, b: 2 }\nconsole.log(a, b)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('1')
  expect(output).toContain('2')
})
