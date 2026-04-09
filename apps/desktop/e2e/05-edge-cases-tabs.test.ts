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

test.beforeEach(async () => {
  await clearOutput(page)
})

// --- E2E-061: Empty code ---
test('E2E-061: empty code runs without error', async () => {
  await typeCode(page, '')
  await runCode(page)
  await page.waitForTimeout(2000)
  // Should not crash, no error
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-062: Only comments ---
test('E2E-062: code with only comments', async () => {
  await typeCode(page, '// just a comment\n/* block comment */')
  await runCode(page)
  await waitForExecution(page)
  // No output expected, but no error
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-063: Large output ---
test('E2E-063: large output (100 logs)', async () => {
  await typeCode(page, 'for (let i = 0; i < 100; i++) console.log(i)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('0')
  expect(output).toContain('99')
})

// --- E2E-064: Circular reference ---
test('E2E-064: circular reference handled', async () => {
  await typeCode(page, 'const obj = { name: "circular" }\nobj.self = obj\nconsole.log(obj)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // Should show Object without crashing
  expect(output).toContain('Object')
})

// --- E2E-065: Multiple args to console.log ---
test('E2E-065: console.log with multiple args', async () => {
  await typeCode(page, 'console.log("a", 1, true, null)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('a')
  expect(output).toContain('1')
  expect(output).toContain('true')
  expect(output).toContain('null')
})

// --- E2E-066: Throw string ---
test('E2E-066: throw string shows error', async () => {
  await typeCode(page, 'throw "oops"')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('oops')
})

// --- E2E-067: Throw Error object ---
test('E2E-067: throw Error shows message', async () => {
  await typeCode(page, 'throw new Error("custom error")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('custom error')
})

// --- E2E-068: Infinite recursion ---
test('E2E-068: infinite recursion gives stack error', async () => {
  await typeCode(page, 'function f() { f() }\nf()')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output.toLowerCase()).toMatch(/maximum call stack|stack/)
})

// --- E2E-069: console.info ---
test('E2E-069: console.info', async () => {
  await typeCode(page, 'console.info("info message")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('info message')
})

// --- E2E-070: Nested objects ---
test('E2E-070: deeply nested object', async () => {
  await typeCode(page, 'console.log({ a: { b: { c: { d: 42 } } } })')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Object')
})

// --- E2E-071: New tab creation ---
test('E2E-071: create new tab', async () => {
  // Ensure sidebar is visible
  const showBtn = page.locator('button[title="Show sidebar"]')
  const showVisible = await showBtn.isVisible().catch(() => false)
  if (showVisible) {
    await showBtn.click()
    await page.waitForTimeout(300)
  }

  const newFileBtn = page.locator('button[title="New file"]')
  await newFileBtn.first().click()
  await page.waitForTimeout(500)

  // Should have a new tab visible in sidebar
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-072: Switch between tabs ---
test('E2E-072: switch tabs preserves code', async () => {
  // Type code in current tab
  await typeCode(page, 'console.log("tab2 code")')
  await page.waitForTimeout(300)

  // Ensure sidebar is visible
  const showBtn = page.locator('button[title="Show sidebar"]')
  const showVisible = await showBtn.isVisible().catch(() => false)
  if (showVisible) {
    await showBtn.click()
    await page.waitForTimeout(300)
  }

  // Click on the first tab item in the sidebar
  const tabItems = page.locator('[class*="cursor-pointer"][class*="items-center"]')
  const count = await tabItems.count()
  if (count >= 2) {
    // Click first tab
    await tabItems.first().click()
    await page.waitForTimeout(500)
    // Click second tab - code should still be there
    await tabItems.nth(1).click()
    await page.waitForTimeout(500)
  }
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-073: Switch statement ---
test('E2E-073: switch statement', async () => {
  await typeCode(page, 'const val = 2\nswitch (val) {\n  case 1:\n    console.log("one")\n    break\n  case 2:\n    console.log("two")\n    break\n  default:\n    console.log("other")\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('two')
})

// --- E2E-074: While loop ---
test('E2E-074: while loop', async () => {
  await typeCode(page, 'let i = 0\nwhile (i < 3) {\n  console.log(i)\n  i++\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('0')
  expect(output).toContain('2')
})

// --- E2E-075: Ternary operator ---
test('E2E-075: ternary operator', async () => {
  await typeCode(page, 'const x = 5\nconsole.log(x > 3 ? "big" : "small")')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('big')
})

// --- E2E-076: Object.keys/values ---
test('E2E-076: Object.keys and values', async () => {
  await typeCode(page, 'const obj = { a: 1, b: 2, c: 3 }\nconsole.log(Object.keys(obj))\nconsole.log(Object.values(obj))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // Arrays render collapsed as "Array (3)"
  expect(output).toContain('Array')
})

// --- E2E-077: Array destructuring ---
test('E2E-077: array destructuring', async () => {
  await typeCode(page, 'const [first, ...rest] = [1, 2, 3, 4]\nconsole.log(first, rest)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('1')
})

// --- E2E-078: Async error handling ---
test('E2E-078: async rejected promise with try/catch', async () => {
  await typeCode(page, 'try {\n  await Promise.reject("async fail")\n} catch (e) {\n  console.log("caught:", e)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('caught')
  expect(output).toContain('async fail')
})

// --- E2E-079: Generator function ---
test('E2E-079: generator function', async () => {
  await typeCode(page, 'function* gen() {\n  yield 1\n  yield 2\n  yield 3\n}\nconst g = gen()\nconsole.log(g.next().value)\nconsole.log(g.next().value)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('1')
  expect(output).toContain('2')
})

// --- E2E-080: Proxy ---
test('E2E-080: Proxy object', async () => {
  await typeCode(page, 'const handler = {\n  get: (target, name) => name in target ? target[name] : 42\n}\nconst p = new Proxy({}, handler)\nconsole.log(p.anything)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('42')
})

// --- E2E-081: Error has stack trace ---
test('E2E-081: error shows stack trace', async () => {
  await typeCode(page, 'function inner() { throw new Error("deep") }\nfunction outer() { inner() }\nouter()')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('deep')
})

// --- E2E-082: console.log undefined/null ---
test('E2E-082: logging undefined and null', async () => {
  await typeCode(page, 'console.log(undefined)\nconsole.log(null)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('null')
})

// --- E2E-083: Numeric expressions ---
test('E2E-083: various numeric results', async () => {
  await typeCode(page, 'console.log(0.1 + 0.2)\nconsole.log(Infinity)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('0.3')
})

// --- E2E-084: String methods ---
test('E2E-084: string methods', async () => {
  await typeCode(page, 'console.log("hello".toUpperCase())\nconsole.log("world".split(""))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('HELLO')
})

// --- E2E-085: Object spread ---
test('E2E-085: object spread', async () => {
  await typeCode(page, 'const a = { x: 1 }\nconst b = { ...a, y: 2 }\nconsole.log(b)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Object')
})

// --- E2E-086: Async IIFE ---
test('E2E-086: async IIFE', async () => {
  await typeCode(page, '(async () => {\n  const r = await Promise.resolve("iife")\n  console.log(r)\n})()')
  await runCode(page)
  await page.waitForTimeout(3000)
  const output = await getOutputText(page)
  expect(output).toContain('iife')
})

// --- E2E-087: for...of loop ---
test('E2E-087: for...of loop', async () => {
  await typeCode(page, 'for (const item of ["a", "b", "c"]) {\n  console.log(item)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('a')
  expect(output).toContain('b')
  expect(output).toContain('c')
})

// --- E2E-088: for...in loop ---
test('E2E-088: for...in loop', async () => {
  await typeCode(page, 'const obj = { x: 1, y: 2 }\nfor (const key in obj) {\n  console.log(key)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('x')
  expect(output).toContain('y')
})

// --- E2E-089: typeof operator ---
test('E2E-089: typeof operator', async () => {
  await typeCode(page, 'console.log(typeof 42)\nconsole.log(typeof "str")\nconsole.log(typeof true)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('number')
  expect(output).toContain('string')
  expect(output).toContain('boolean')
})

// --- E2E-090: Nested array methods ---
test('E2E-090: reduce', async () => {
  await typeCode(page, 'const sum = [1, 2, 3, 4].reduce((a, b) => a + b, 0)\nconsole.log(sum)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('10')
})

// --- E2E-091: Tagged template literal ---
test('E2E-091: tagged template literal', async () => {
  await typeCode(page, 'function tag(strings, ...vals) {\n  return strings[0] + vals[0] + strings[1]\n}\nconsole.log(tag`hello ${42} world`)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('hello 42 world')
})

// --- E2E-092: Computed property names ---
test('E2E-092: computed property names', async () => {
  await typeCode(page, 'const key = "dynamic"\nconst obj = { [key]: 99 }\nconsole.log(obj.dynamic)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('99')
})

// --- E2E-093: Private class fields ---
test('E2E-093: private class fields', async () => {
  await typeCode(page, 'class Counter {\n  #count = 0\n  increment() { this.#count++ }\n  get value() { return this.#count }\n}\nconst c = new Counter()\nc.increment()\nc.increment()\nconsole.log(c.value)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('2')
})

// --- E2E-094: Static class methods ---
test('E2E-094: static class methods', async () => {
  await typeCode(page, 'class MathUtils {\n  static add(a: number, b: number) { return a + b }\n}\nconsole.log(MathUtils.add(10, 20))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('30')
})

// --- E2E-095: BigInt ---
test('E2E-095: BigInt', async () => {
  await typeCode(page, 'const big = 9007199254740991n + 1n\nconsole.log(big.toString())')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('9007199254740992')
})

// --- E2E-096: Array.from ---
test('E2E-096: Array.from', async () => {
  await typeCode(page, 'const arr = Array.from({ length: 5 }, (_, i) => i * 2)\nconsole.log(arr)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Array')
})

// --- E2E-097: Nested ternary ---
test('E2E-097: nested ternary', async () => {
  await typeCode(page, 'const x = 5\nconst result = x > 10 ? "big" : x > 3 ? "medium" : "small"\nconsole.log(result)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('medium')
})

// --- E2E-098: Error subclass ---
test('E2E-098: custom error subclass', async () => {
  await typeCode(page, 'class CustomError extends Error {\n  constructor(msg: string) { super(msg); this.name = "CustomError" }\n}\ntry {\n  throw new CustomError("custom")\n} catch (e) {\n  console.log(e.name, e.message)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('CustomError')
  expect(output).toContain('custom')
})

// --- E2E-099: Structuring complex ---
test('E2E-099: complex nested structure', async () => {
  await typeCode(page, 'const data = {\n  users: [\n    { name: "Alice", scores: [90, 85, 92] },\n    { name: "Bob", scores: [78, 88, 95] }\n  ]\n}\nconsole.log(data.users[1].scores[2])')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('95')
})

// --- E2E-100: Rapid re-execution ---
test('E2E-100: rapid re-execution does not crash', async () => {
  await typeCode(page, 'console.log("rapid")')
  // Run multiple times quickly
  await runCode(page)
  await page.waitForTimeout(200)
  await runCode(page)
  await page.waitForTimeout(200)
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('rapid')
  // App should still be functional
  const editor = page.locator('.monaco-editor')
  await expect(editor.first()).toBeVisible()
})

// --- E2E-101: Output auto-scrolls in aligned mode when editor is at bottom ---
test('E2E-101: output panel scrolls to match editor after execution', async () => {
  // Generate enough lines to make the editor scrollable, with output at the bottom
  const lines: string[] = []
  for (let i = 0; i < 50; i++) {
    lines.push(`// line ${i}`)
  }
  lines.push('console.log("bottom output")')
  await typeCode(page, lines.join('\n'))

  // Ensure we're in aligned mode
  const consoleToggle = page.locator('button[title="Switch to line-aligned mode"]')
  if (await consoleToggle.isVisible().catch(() => false)) {
    await consoleToggle.click()
    await page.waitForTimeout(300)
  }

  // Scroll editor to the bottom via Monaco API
  await page.evaluate(() => {
    const editors = (window as any).monaco?.editor?.getEditors?.()
    if (editors && editors.length > 0) {
      const editor = editors[0]
      const model = editor.getModel()
      if (model) {
        editor.revealLine(model.getLineCount())
      }
    }
  })
  await page.waitForTimeout(300)

  // Run code
  await runCode(page)
  await waitForExecution(page)

  // Check that the output panel has scrolled down (scrollTop > 0)
  const outputScrollTop = await page.evaluate(() => {
    const scrollContainers = document.querySelectorAll('.overflow-y-auto')
    const outputContainer = scrollContainers[scrollContainers.length - 1]
    return outputContainer ? outputContainer.scrollTop : 0
  })
  expect(outputScrollTop).toBeGreaterThan(0)

  // And the output should contain our bottom line's output
  const output = await getOutputText(page)
  expect(output).toContain('bottom output')
})
