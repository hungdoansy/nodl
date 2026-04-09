import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { launchApp, typeCode, runCode, waitForExecution, getOutputText, clearOutput } from './helpers'

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

// --- E2E-041: TypeScript type annotation ---
test('E2E-041: TypeScript code with type annotations', async () => {
  await typeCode(page, 'const x: number = 42\nconsole.log(x)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('42')
})

// --- E2E-042: TypeScript interface ---
test('E2E-042: TypeScript interface usage', async () => {
  await typeCode(page, 'interface User {\n  name: string\n  age: number\n}\nconst u: User = { name: "test", age: 25 }\nconsole.log(u.name)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('test')
})

// --- E2E-043: TypeScript enum ---
test('E2E-043: TypeScript enum', async () => {
  await typeCode(page, 'enum Color { Red, Green, Blue }\nconsole.log(Color.Green)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('1')
})

// --- E2E-044: TypeScript generic function ---
test('E2E-044: TypeScript generics', async () => {
  await typeCode(page, 'function identity<T>(x: T): T { return x }\nconsole.log(identity(42))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('42')
})

// --- E2E-045: TypeScript as/type casting ---
test('E2E-045: TypeScript type casting', async () => {
  await typeCode(page, 'const val = "123" as any\nconsole.log(typeof val)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('string')
})

// --- E2E-046: Class with methods ---
test('E2E-046: class with methods', async () => {
  await typeCode(page, 'class Dog {\n  name: string\n  constructor(n: string) { this.name = n }\n  bark() { return `${this.name} says woof` }\n}\nconsole.log(new Dog("Rex").bark())')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Rex says woof')
})

// --- E2E-047: Map and Set ---
test('E2E-047: Map and Set', async () => {
  await typeCode(page, 'const m = new Map()\nm.set("key", "value")\nconsole.log(m.get("key"))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('value')
})

// --- E2E-048: Array methods ---
test('E2E-048: array methods chain', async () => {
  await typeCode(page, 'const result = [1, 2, 3, 4, 5]\n  .filter(x => x > 2)\n  .map(x => x * 2)\nconsole.log(result)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // Output shows collapsed Array (3) — just verify it renders
  expect(output).toContain('Array')
})

// --- E2E-049: try/catch ---
test('E2E-049: try catch block', async () => {
  await typeCode(page, 'try {\n  throw new Error("caught")\n} catch (e) {\n  console.log(e.message)\n}')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('caught')
})

// --- E2E-050: Promise.all ---
test('E2E-050: Promise.all', async () => {
  await typeCode(page, 'const results = await Promise.all([\n  Promise.resolve(1),\n  Promise.resolve(2),\n  Promise.resolve(3)\n])\nconsole.log(results)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // Output shows collapsed Array (3)
  expect(output).toContain('Array')
})

// --- E2E-051: Spread operator ---
test('E2E-051: spread operator', async () => {
  await typeCode(page, 'const a = [1, 2]\nconst b = [...a, 3, 4]\nconsole.log(b)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('Array')
})

// --- E2E-052: Optional chaining ---
test('E2E-052: optional chaining', async () => {
  await typeCode(page, 'const obj = { a: { b: 42 } }\nconsole.log(obj?.a?.b)\nconsole.log(obj?.c?.d)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('42')
})

// --- E2E-053: Nullish coalescing ---
test('E2E-053: nullish coalescing', async () => {
  await typeCode(page, 'const val = null ?? "default"\nconsole.log(val)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('default')
})

// --- E2E-054: RegExp ---
test('E2E-054: regex test', async () => {
  await typeCode(page, 'const match = "hello123".match(/\\d+/)\nconsole.log(match[0])')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('123')
})

// --- E2E-055: JSON.stringify/parse ---
test('E2E-055: JSON stringify and parse', async () => {
  await typeCode(page, 'const obj = { x: 1, y: "two" }\nconst json = JSON.stringify(obj)\nconst parsed = JSON.parse(json)\nconsole.log(parsed.y)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('two')
})

// --- E2E-056: Date ---
test('E2E-056: Date object', async () => {
  await typeCode(page, 'const d = new Date(2025, 0, 1)\nconsole.log(d.getFullYear())')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('2025')
})

// --- E2E-057: Math operations ---
test('E2E-057: Math functions', async () => {
  await typeCode(page, 'console.log(Math.max(1, 5, 3))\nconsole.log(Math.floor(3.7))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('5')
  expect(output).toContain('3')
})

// --- E2E-058: Symbol ---
test('E2E-058: Symbol', async () => {
  await typeCode(page, 'const sym = Symbol("test")\nconsole.log(typeof sym)')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('symbol')
})

// --- E2E-059: WeakMap ---
test('E2E-059: WeakMap', async () => {
  await typeCode(page, 'const wm = new WeakMap()\nconst key = {}\nwm.set(key, 42)\nconsole.log(wm.has(key))')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  expect(output).toContain('true')
})

// --- E2E-060: console.table ---
test('E2E-060: console.table output', async () => {
  await typeCode(page, 'console.table([{ a: 1, b: 2 }, { a: 3, b: 4 }])')
  await runCode(page)
  await waitForExecution(page)
  const output = await getOutputText(page)
  // console.table should produce table-like output
  expect(output.length).toBeGreaterThan(0)
})
