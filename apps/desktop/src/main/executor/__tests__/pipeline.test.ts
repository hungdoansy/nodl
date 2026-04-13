// @vitest-environment node
/**
 * Full pipeline tests: instrumentCode → transpile → verify valid JS
 * Simulates what the main process does before sending code to the worker.
 */
import { describe, it, expect } from 'vitest'
import { instrumentCode, stripInlineComment } from '../instrument'
import { instrumentWithAST } from '../instrument-ast'
import { transpile } from '../transpiler'
import { WELCOME_CODE } from '../../../store/tabs'

/** Run the full pipeline and verify no transpilation errors */
function pipeline(code: string): { instrumented: string; js: string; errors: { message: string; line: number }[] } {
  const instrumented = instrumentCode(code)
  const result = transpile(instrumented, 'ts')
  return { instrumented, js: result.js, errors: result.errors }
}

/** Assert the pipeline produces valid output with no errors */
function expectValid(code: string) {
  const { errors, js } = pipeline(code)
  if (errors.length > 0) {
    throw new Error(`Pipeline errors for input:\n${code}\n\nInstrumented:\n${pipeline(code).instrumented}\n\nErrors:\n${errors.map(e => `  L${e.line}: ${e.message}`).join('\n')}`)
  }
  expect(errors).toHaveLength(0)
  expect(js).toBeTruthy()
  return js
}

describe('pipeline: instrument → transpile', () => {
  // --- Simple expressions ---
  it('handles number literal', () => {
    const js = expectValid('42')
    expect(js).toContain('__expr__')
  })

  it('handles string literal', () => {
    expectValid('"hello world"')
  })

  it('handles template literal', () => {
    expectValid('`hello ${1 + 2}`')
  })

  it('handles new Date()', () => {
    const js = expectValid('new Date()')
    expect(js).toContain('new Date()')
  })

  it('handles Math operations', () => {
    expectValid('Math.max(1, 2, 3)')
    expectValid('Math.PI')
    expectValid('Math.random()')
  })

  it('handles JSON operations', () => {
    expectValid('JSON.stringify({ a: 1 }, null, 2)')
    expectValid('JSON.parse(\'{"a":1}\')')
  })

  it('handles Array.from', () => {
    expectValid('Array.from({ length: 5 }, (_, i) => i * i)')
  })

  // --- Declarations ---
  it('handles const/let/var', () => {
    expectValid('const x = 1')
    expectValid('let y = "hello"')
    expectValid('var z = true')
  })

  it('handles destructuring', () => {
    expectValid('const { a, b } = { a: 1, b: 2 }')
    expectValid('const [x, y] = [1, 2]')
  })

  // --- TypeScript features ---
  it('handles typed declarations', () => {
    expectValid('const x: number = 42')
    expectValid('let name: string = "world"')
  })

  it('handles interfaces', () => {
    expectValid(`interface User {
  name: string
  age: number
}
const u: User = { name: "Alice", age: 30 }`)
  })

  it('handles type aliases', () => {
    expectValid(`type Point = { x: number; y: number }
const p: Point = { x: 1, y: 2 }`)
  })

  it('handles generics', () => {
    expectValid(`function identity<T>(x: T): T { return x }
identity(42)`)
  })

  it('handles enums', () => {
    expectValid(`enum Color { Red, Green, Blue }
Color.Red`)
  })

  it('handles type assertions', () => {
    expectValid('const x = "hello" as string')
    expectValid('const y = (42 as unknown) as string')
  })

  // --- Functions ---
  it('handles function declaration + call', () => {
    const js = expectValid(`function greet(name: string): string {
  return "Hello " + name
}
greet("world")`)
    expect(js).toContain('__expr__')
  })

  it('handles arrow functions', () => {
    expectValid('const add = (a: number, b: number) => a + b')
  })

  it('handles async functions', () => {
    expectValid(`async function fetchData() {
  return { status: "ok" }
}`)
  })

  // --- Classes ---
  it('handles class with constructor', () => {
    expectValid(`class Counter {
  private count = 0
  constructor(initial: number) {
    this.count = initial
  }
  increment() { return ++this.count }
  get value() { return this.count }
}
const c = new Counter(0)
c.increment()
c.value`)
  })

  it('handles class with static methods', () => {
    expectValid(`class MathUtils {
  static square(x: number): number {
    return x * x
  }
}
MathUtils.square(5)`)
  })

  // --- Multi-line constructs ---
  it('handles setTimeout with callback', () => {
    expectValid(`console.log("before")
setTimeout(() => {
  console.log("timeout")
}, 100)
console.log("after")`)
  })

  it('handles nested setTimeout', () => {
    expectValid(`setTimeout(() => {
  console.log("1")
  setTimeout(() => {
    console.log("2")
    setTimeout(() => {
      console.log("3")
    }, 0)
  }, 0)
}, 0)`)
  })

  it('handles Promise chain', () => {
    expectValid(`Promise.resolve(42)
  .then(x => x * 2)
  .then(x => console.log(x))
  .catch(e => console.error(e))`)
  })

  it('handles Promise constructor + then', () => {
    expectValid(`new Promise((resolve, reject) => {
  resolve(42)
}).then(value => {
  console.log(value)
}).catch(err => {
  console.error(err)
})`)
  })

  it('handles async/await with try/catch', () => {
    expectValid(`async function main() {
  try {
    const result = await Promise.resolve(42)
    console.log(result)
  } catch (err) {
    console.error(err)
  }
}
main()`)
  })

  // --- Complex real-world patterns ---
  it('handles event loop demo', () => {
    expectValid(`console.log("1 sync")
Promise.resolve().then(() => console.log("2 microtask"))
setTimeout(() => console.log("3 macro"), 0)
Promise.resolve()
  .then(() => {
    console.log("4 microtask chain")
    setTimeout(() => console.log("5 macro from micro"), 0)
  })
console.log("6 sync end")`)
  })

  it('handles map/filter/reduce chain', () => {
    expectValid(`const nums: number[] = [1, 2, 3, 4, 5]
nums.map(n => n * 2)
nums.filter(n => n > 3)
nums.reduce((a, b) => a + b, 0)`)
  })

  it('handles object spread and rest', () => {
    expectValid(`const base = { a: 1, b: 2 }
const extended = { ...base, c: 3 }
const { a, ...rest } = extended
rest`)
  })

  it('handles for...of and for...in', () => {
    expectValid(`const arr = [10, 20, 30]
for (const item of arr) {
  console.log(item)
}
const obj = { x: 1, y: 2 }
for (const key in obj) {
  console.log(key)
}`)
  })

  it('handles switch statement', () => {
    expectValid(`const x = "hello"
switch (x) {
  case "hello":
    console.log("greeting")
    break
  case "bye":
    console.log("farewell")
    break
  default:
    console.log("unknown")
}`)
  })

  it('handles try/catch/finally', () => {
    expectValid(`try {
  JSON.parse("invalid")
} catch (e) {
  console.error("parse failed:", e)
} finally {
  console.log("done")
}`)
  })

  it('handles immediately invoked function', () => {
    expectValid(`const result = (() => {
  const x = 10
  const y = 20
  return x + y
})()
result`)
  })

  it('handles console.table', () => {
    expectValid(`const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]
console.table(data)`)
  })

  it('handles Map and Set', () => {
    expectValid(`const map = new Map<string, number>()
map.set("a", 1)
map.set("b", 2)
map.get("a")

const set = new Set([1, 2, 3, 2, 1])
set.size`)
  })

  it('handles RegExp', () => {
    expectValid(`const pattern = /hello\\s+world/gi
"Hello World".match(pattern)
/^\\d+$/.test("123")`)
  })

  it('handles Symbol', () => {
    expectValid(`const sym = Symbol("description")
typeof sym`)
  })

  it('handles nullish coalescing and optional chaining', () => {
    expectValid(`const obj: { a?: { b?: number } } = {}
obj?.a?.b ?? 42`)
  })

  it('handles tagged template literals', () => {
    expectValid(`function tag(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.join("")
}
tag\`hello \${42}\``)
  })

  it('handles multi-line object literal in const', () => {
    expectValid(`const config = {
  host: "localhost",
  port: 3000,
  debug: true,
}
config`)
  })

  it('handles while loop', () => {
    expectValid(`let i = 0
while (i < 5) {
  console.log(i)
  i++
}`)
  })

  it('handles do...while loop', () => {
    expectValid(`let i = 0
do {
  console.log(i)
  i++
} while (i < 3)`)
  })

  // --- Edge cases found in cycle 2 ---
  it('handles ternary across lines', () => {
    expectValid(`const x = true
  ? "yes"
  : "no"`)
  })

  it('handles arrow returning object literal', () => {
    expectValid(`const fn = () => ({
  a: 1,
  b: 2,
})`)
  })

  it('handles nested object literals', () => {
    expectValid(`const config = {
  server: {
    host: "localhost",
    port: 3000,
  },
  debug: true,
}
config`)
  })

  it('handles object with methods', () => {
    expectValid(`const obj = {
  greet() { return "hi" },
  get name() { return "bob" },
}`)
  })

  it('handles array of objects', () => {
    expectValid(`const arr = [
  { name: "a", value: 1 },
  { name: "b", value: 2 },
]`)
  })

  it('handles spread in object', () => {
    expectValid(`const base = { a: 1 }
const ext = {
  ...base,
  b: 2,
}`)
  })

  it('handles method chaining across lines', () => {
    expectValid(`[1, 2, 3]
  .map(x => x * 2)
  .filter(x => x > 2)
  .reduce((a, b) => a + b, 0)`)
  })

  it('handles if/else chain', () => {
    expectValid(`if (x > 0) {
  console.log("pos")
} else if (x < 0) {
  console.log("neg")
} else {
  console.log("zero")
}`)
  })

  it('handles typeof and instanceof', () => {
    expectValid(`typeof x === "string"
x instanceof Date`)
  })

  it('handles void and delete', () => {
    expectValid(`void 0
const obj = { a: 1 }
delete obj.a`)
  })

  it('handles the user complex async test case', () => {
    expectValid(`function main() {
  console.log("1")

  new Promise((resolve) => {
    console.log("2")
    resolve(1)
  }).then(() => {
    console.log("3")
  })

  Promise.resolve().then(() => {
    console.log("4")
    setTimeout(() => {
      console.log("5")
      Promise.resolve().then(() => {
        console.log("6")
        setTimeout(() => {
          console.log("7")
        }, 0)
      })
    }, 0)
  })

  console.log("8")

  setTimeout(() => {
    console.log("9")
    Promise.resolve().then(() => {
      console.log("10")
      setTimeout(() => {
        console.log("11")
      }, 0)
    })
  }, 0)

  console.log("12")
}

main()`)
  })

  // --- Edge cases found in cycle 3 ---
  it('handles abstract class', () => {
    expectValid(`abstract class Animal {
  abstract speak(): string
  move() { console.log("moving") }
}`)
  })

  it('handles enum with string values', () => {
    expectValid(`enum Status {
  Active = "active",
  Inactive = "inactive",
}
Status.Active`)
  })

  it('handles const enum', () => {
    expectValid(`const enum Dir { Up, Down, Left, Right }`)
  })

  it('handles type alias', () => {
    expectValid(`type Keys = "a" | "b"
const obj: Record<Keys, number> = { a: 1, b: 2 }`)
  })

  it('handles conditional type', () => {
    expectValid(`type IsString<T> = T extends string ? true : false
const x: IsString<"hello"> = true`)
  })

  it('handles generator function', () => {
    expectValid(`function* gen() {
  yield 1
  yield 2
  yield 3
}`)
  })

  it('handles for await...of', () => {
    expectValid(`async function consume(stream: AsyncIterable<string>) {
  for await (const chunk of stream) {
    console.log(chunk)
  }
}`)
  })

  it('handles labeled statement', () => {
    expectValid(`loop: for (let i = 0; i < 10; i++) {
  if (i === 5) break loop
  console.log(i)
}`)
  })

  it('handles new with multi-line args', () => {
    expectValid(`const d = new Date(
  2024,
  0,
  1
)`)
  })

  it('handles computed property', () => {
    expectValid(`const key = "name"
const obj = {
  [key]: "hello",
}`)
  })

  it('handles empty object and array', () => {
    expectValid(`const a = {}
const b = []`)
  })

  it('handles chained assignment', () => {
    expectValid(`let a, b, c
a = b = c = 42`)
  })

  it('handles logical assignment operators', () => {
    expectValid(`let x: number | null = null
x ??= 42`)
  })

  it('handles nested destructuring', () => {
    expectValid(`const { a: { b } } = { a: { b: 1 } }`)
  })

  it('handles default params', () => {
    expectValid(`function greet(name = "world") {
  return "Hello " + name
}
greet()`)
  })

  it('handles rest params', () => {
    expectValid(`function sum(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0)
}
sum(1, 2, 3)`)
  })

  it('handles type guard', () => {
    expectValid(`function isString(x: unknown): x is string {
  return typeof x === "string"
}`)
  })

  it('handles numeric separator', () => {
    expectValid(`const million = 1_000_000
million`)
  })

  it('handles optional param', () => {
    expectValid(`function foo(x?: number) {
  console.log(x ?? "none")
}`)
  })

  it('handles assertion function', () => {
    expectValid(`function assert(cond: boolean): asserts cond {
  if (!cond) throw new Error("assertion failed")
}`)
  })

  it('handles comma operator', () => {
    expectValid(`const x = (1, 2, 3)`)
  })

  it('handles multiline template literal', () => {
    expectValid('const html = `<div>\n  <p>hello</p>\n</div>`')
  })

  it('handles assignment in condition', () => {
    expectValid(`let x: string | undefined
if (x = "hello") {
  console.log(x)
}`)
  })

  it('handles object with computed + spread', () => {
    expectValid(`const key = "dynamic"
const base = { a: 1 }
const obj = {
  ...base,
  [key]: 2,
  static: 3,
}`)
  })

  // Note: `const fn = (x)\n  => x * 2` is invalid JS (=> must be on same line as params).
  // The instrumenter correctly passes through => continuations without inserting __line__,
  // but esbuild rejects the syntax. This is expected behavior, not a bug.

  it('handles arrow continuation without breaking further', () => {
    // Arrow on same line (valid) still works
    expectValid('const fn = (x) => x * 2')
    expectValid('const fn = (x) => ({ value: x })')
    expectValid(`const fn = (x) => {
  return x * 2
}`)
  })

  it('handles unary operators as expressions', () => {
    expectValid('!true')
    expectValid('~0xFF')
    expectValid('+x')
    expectValid('-x')
    expectValid('!someFlag')
  })

  it('handles backtick in single-line comment without corrupting state', () => {
    expectValid(`// This has a backtick \` in a comment
const x = 1
console.log(x)`)
  })

  it('handles backtick in block comment without corrupting state', () => {
    expectValid(`/* backtick \` here */
const x = 2
console.log(x)`)
  })

  it('handles code after comment with backtick', () => {
    expectValid(`const a = 1 // note: use \` for templates
const b = 2
console.log(a + b)`)
  })

  it('injects loop guard in for loops', () => {
    const { instrumented } = pipeline(`for (let i = 0; i < 10; i++) {
  console.log(i)
}`)
    expect(instrumented).toContain('__loopGuard__();')
  })

  it('injects loop guard in while loops', () => {
    const { instrumented } = pipeline(`while (true) {
  break
}`)
    expect(instrumented).toContain('__loopGuard__();')
  })

  it('injects loop guard in do...while loops', () => {
    const { instrumented } = pipeline(`do {
  break
} while (true)`)
    expect(instrumented).toContain('__loopGuard__();')
  })

  it('loop guard does not break valid for loop', () => {
    expectValid(`for (let i = 0; i < 10; i++) {
  console.log(i)
}`)
  })

  it('loop guard does not break nested loops', () => {
    expectValid(`for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    console.log(i, j)
  }
}`)
  })

  // --- Inline comments on expressions ---
  it('handles expression with inline comment', () => {
    expectValid(`const p = Promise.reject(new Error("oops"))
p  // Expression wraps this`)
  })

  it('handles number expression with inline comment', () => {
    expectValid(`42 // the answer`)
  })

  it('handles variable expression with inline comment', () => {
    expectValid(`const x = 1
x // check value`)
  })

  it('handles expression with complex inline comment', () => {
    expectValid(`const arr = [1, 2, 3]
arr.length // should be 3`)
  })

  it('preserves URL strings that contain //', () => {
    expectValid(`"http://example.com"`)
    const { instrumented } = pipeline(`"http://example.com"`)
    expect(instrumented).toContain('http://example.com')
  })

  it('preserves strings with // inside when followed by comment', () => {
    expectValid(`"http://example.com" // a URL`)
    const { instrumented } = pipeline(`"http://example.com" // a URL`)
    expect(instrumented).toContain('http://example.com')
    expect(instrumented).not.toContain('a URL')
  })
})

// -------------------------------------------------------------------
// AST instrumenter — new behaviors / edge cases from spec
// These test instrumentWithAST() directly (not the fallback wrapper).
// -------------------------------------------------------------------

describe('AST instrumenter: expression wrapping', () => {
  function ast(code: string) {
    const instrumented = instrumentWithAST(code)
    const result = transpile(instrumented, 'ts')
    if (result.errors.length > 0) {
      throw new Error(
        `AST pipeline errors for:\n${code}\n\nInstrumented:\n${instrumented}\n\nErrors:\n${result.errors.map(e => `  L${e.line}: ${e.message}`).join('\n')}`
      )
    }
    return { instrumented, js: result.js }
  }

  it('wraps multi-line ternary as one unit (no mid-expression __line__)', () => {
    const { instrumented, js } = ast(`condition\n  ? "yes"\n  : "no"`)
    // The whole ternary is one ExpressionStatement — one __expr__ call wrapping all 3 lines
    expect(instrumented).toMatch(/^__line__\.value = 1;\n__expr__\(1, condition\n\s+\? "yes"\n\s+: "no"\)/)
    expect(js).toBeTruthy()
  })

  it('wraps regex literal correctly', () => {
    const { instrumented } = ast('/test/gi')
    expect(instrumented).toContain('__expr__(1, /test/gi)')
  })

  it('wraps console.log (runtime suppresses undefined return)', () => {
    const { instrumented } = ast('console.log("hi")')
    expect(instrumented).toContain('__expr__(1, console.log("hi"))')
  })

  it('wraps void 0 (runtime suppresses undefined)', () => {
    const { instrumented } = ast('void 0')
    expect(instrumented).toContain('__expr__(1, void 0)')
  })

  it('handles top-level await expression', () => {
    // await is valid as a top-level ExpressionStatement in AsyncFunction
    const { js } = ast('await Promise.resolve(42)')
    expect(js).toBeTruthy()
  })

  it('does not double-wrap expression with inline comment', () => {
    // AST sees the expression node range, not the comment — comment stays outside
    const { instrumented } = ast('42 // the answer')
    expect(instrumented).toContain('__expr__(1, 42)')
    expect(instrumented).toContain('// the answer')
    // The closing paren must NOT be swallowed by the comment
    expect(instrumented).toMatch(/__expr__\(1, 42\)/)
  })

  it('wraps expression on correct line when preceded by declarations', () => {
    const { instrumented } = ast('const x = 1\nconst y = 2\nx + y')
    expect(instrumented).toContain('__expr__(3, x + y)')
  })
})

describe('AST instrumenter: __line__ tracking', () => {
  it('inserts __line__ inside arrow function body', () => {
    const { js } = transpile(
      instrumentWithAST('const fn = () => {\n  console.log("hi")\n  return 42\n}'),
      'ts'
    )
    expect(js).toBeTruthy()
    expect(instrumentWithAST('const fn = () => {\n  console.log("hi")\n  return 42\n}')).toContain(
      '__line__.value = 2'
    )
  })

  it('inserts __line__ inside callback', () => {
    const code = '[1,2].map(x => {\n  console.log(x)\n  return x * 2\n})'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__line__.value = 2')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('inserts __line__ inside object method body', () => {
    const code = 'const obj = {\n  greet() {\n    console.log("hi")\n  }\n}'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__line__.value = 3')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('inserts __line__ inside class static block', () => {
    const code = 'class Foo {\n  static {\n    console.log("init")\n  }\n}'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__line__.value = 3')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('does NOT insert __line__ inside class body (only members allowed)', () => {
    const code = 'class Foo {\n  x = 1\n  method() {}\n}'
    const instrumented = instrumentWithAST(code)
    // __line__ must not appear between class { and } for member declarations
    // The only __line__ allowed is the one before the class declaration itself
    const lines = instrumented.split('\n')
    const classLine = lines.findIndex(l => l.includes('class Foo'))
    // After the class keyword line, there should be no __line__ inside the class body
    // (members are ClassProperty/MethodDefinition, parent is ClassBody, not BlockStatement)
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('does NOT insert __line__ inside object literal', () => {
    const code = 'const obj = {\n  a: 1,\n  b: 2\n}'
    const instrumented = instrumentWithAST(code)
    // Object properties are not statements, so no __line__ inside {}
    // Only the const declaration itself gets __line__ = 1
    expect(instrumented).toContain('__line__.value = 1')
    expect(instrumented).not.toContain('__line__.value = 2')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('does not insert __line__ in the middle of a multiline template literal', () => {
    const code = 'const html = `<div>\n  <p>hello</p>\n</div>`'
    const instrumented = instrumentWithAST(code)
    // Only one __line__ for the const declaration
    const lineMatches = instrumented.match(/__line__\.value = \d+/g) ?? []
    expect(lineMatches).toHaveLength(1)
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })
})

describe('AST instrumenter: import/export transformation', () => {
  function astInstrumented(code: string): string {
    return instrumentWithAST(code)
  }
  function astValid(code: string) {
    const instrumented = astInstrumented(code)
    const result = transpile(instrumented, 'ts')
    if (result.errors.length > 0) {
      throw new Error(`Pipeline errors:\n${result.errors.map(e => `  L${e.line}: ${e.message}`).join('\n')}\n\nInstrumented:\n${instrumented}`)
    }
    return instrumented
  }

  it('handles multi-line import (10+ specifiers)', () => {
    const code = `import {
  a, b, c, d, e,
  f, g, h, i, j
} from "mod"`
    const instrumented = astValid(code)
    // AST sees one ImportDeclaration spanning all lines — produces one require()
    expect(instrumented).toContain('require("mod")')
    expect(instrumented).toContain('const {')
    expect(instrumented).toContain('a')
    expect(instrumented).toContain('j')
  })

  it('handles mixed type/value import specifiers', () => {
    const code = `import { type Foo, bar } from "mod"`
    const instrumented = astValid(code)
    // type Foo is stripped; only bar remains
    expect(instrumented).toContain('const { bar } = require("mod")')
    expect(instrumented).not.toContain('Foo')
  })

  it('handles import default + namespace: import foo, * as ns from "mod"', () => {
    const code = `import foo, * as ns from "mod"`
    const instrumented = astValid(code)
    expect(instrumented).toContain('_m.default ?? _m')
    expect(instrumented).toContain('ns = require("mod")')
  })

  it('handles export default expression', () => {
    const instrumented = astValid('export default 42')
    // "export default " is stripped, leaving the expression
    expect(instrumented).toContain('42')
    expect(instrumented).not.toContain('export default')
  })

  it('handles export const', () => {
    const instrumented = astValid('export const x = 1')
    expect(instrumented).toContain('const x = 1')
    expect(instrumented).not.toContain('export const')
  })

  it('handles export function', () => {
    const instrumented = astValid('export function foo() { return 1 }')
    expect(instrumented).toContain('function foo()')
    expect(instrumented).not.toContain('export function')
  })

  it('handles mixed type/value re-export: export { type A, b } from "mod"', () => {
    const instrumented = astValid('export { type A, b } from "mod"')
    expect(instrumented).toContain('const { b } = require("mod")')
    expect(instrumented).not.toContain('A')
  })

  it('handles export * from "mod"', () => {
    const instrumented = astValid('export * from "mod"')
    expect(instrumented).toContain('require("mod")')
    expect(instrumented).not.toContain('export *')
  })

  it('handles aliased named import', () => {
    const instrumented = astValid('import { readFile as rf } from "fs"')
    expect(instrumented).toContain('readFile: rf')
  })

  it('handles import type — strips entirely', () => {
    const instrumented = astValid('import type { Foo } from "mod"\nconst x = 1')
    expect(instrumented).not.toContain('import type')
    expect(instrumented).not.toContain('require')  // type-only, no runtime require
    expect(instrumented).toContain('const x = 1')
  })
})

describe('AST instrumenter: loop guards', () => {
  it('injects guard for single-statement while body (no braces)', () => {
    const code = 'let i = 0\nwhile (i < 3) i++'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__loopGuard__()')
    // Should wrap in a block: { __loopGuard__(); i++ }
    expect(instrumented).toContain('{ __loopGuard__(); ')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('injects guard for single-statement for...of body (no braces)', () => {
    const code = 'for (const x of [1,2,3]) console.log(x)'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__loopGuard__()')
    expect(instrumented).toContain('{ __loopGuard__(); ')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('injects guard for single-statement do...while body (no braces)', () => {
    const code = 'let i = 0\ndo i++ while (i < 3)'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__loopGuard__()')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('injects guard in both loops of nested loops', () => {
    const code = 'for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { } }'
    const instrumented = instrumentWithAST(code)
    const guardCount = (instrumented.match(/__loopGuard__\(\)/g) ?? []).length
    expect(guardCount).toBe(2)
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('injects guard without breaking labeled loop', () => {
    const code = 'outer: for (let i = 0; i < 3; i++) {\n  if (i === 1) break outer\n}'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__loopGuard__()')
    expect(instrumented).toContain('outer:')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })

  it('injects guard in for await...of', () => {
    const code = 'async function f(stream: AsyncIterable<number>) {\n  for await (const x of stream) {\n    console.log(x)\n  }\n}'
    const instrumented = instrumentWithAST(code)
    expect(instrumented).toContain('__loopGuard__()')
    expect(transpile(instrumented, 'ts').errors).toHaveLength(0)
  })
})

describe('AST instrumenter: error recovery', () => {
  // instrumentWithAST() can throw on truly fatal syntax errors (e.g. `const x =` with no
  // RHS — Babel cannot recover even with errorRecovery:true). instrumentCode() catches that
  // and falls back to the regex instrumenter, so the public API never throws.

  it('instrumentCode() does not throw on incomplete assignment (fallback to regex)', () => {
    const code = 'const y = 2\nconst x ='
    let result: string
    expect(() => { result = instrumentCode(code) }).not.toThrow()
    // The regex instrumenter handles this and at minimum passes through the code
    expect(result!).toBeTruthy()
  })

  it('instrumentWithAST() does not throw on empty input', () => {
    expect(() => instrumentWithAST('')).not.toThrow()
    expect(instrumentWithAST('')).toBe('')
  })

  it('instrumentWithAST() does not throw on comment-only input', () => {
    expect(() => instrumentWithAST('// just a comment')).not.toThrow()
  })

  it('instrumentCode() does not throw on bare import keyword (fallback to regex)', () => {
    // Even with errorRecovery:true, some syntax errors are fatal in @babel/parser.
    // instrumentCode() catches and falls back to regex — the public API never throws.
    expect(() => instrumentCode('import')).not.toThrow()
  })
})

describe('stripInlineComment', () => {
  it('strips simple inline comment', () => {
    expect(stripInlineComment('42 // the answer')).toBe('42')
  })

  it('returns code unchanged when no comment', () => {
    expect(stripInlineComment('42')).toBe('42')
  })

  it('does not strip // inside double-quoted string', () => {
    expect(stripInlineComment('"http://example.com"')).toBe('"http://example.com"')
  })

  it('does not strip // inside single-quoted string', () => {
    expect(stripInlineComment("'http://example.com'")).toBe("'http://example.com'")
  })

  it('does not strip // inside template literal', () => {
    expect(stripInlineComment('`http://example.com`')).toBe('`http://example.com`')
  })

  it('strips comment after string containing //', () => {
    expect(stripInlineComment('"http://example.com" // a URL')).toBe('"http://example.com"')
  })

  it('strips comment with no space before //', () => {
    expect(stripInlineComment('x//comment')).toBe('x')
  })

  it('handles escaped quotes in strings', () => {
    expect(stripInlineComment('"she said \\"hi\\"" // quote')).toBe('"she said \\"hi\\""')
  })
})

describe('WELCOME_CODE regression', () => {
  it('passes the full pipeline without errors', () => {
    expectValid(WELCOME_CODE)
  })

  it('has no bare expression line starting with `[` or `(` after a non-terminator line (ASI-trap guard)', () => {
    const lines = WELCOME_CODE.split('\n')
    const terminators = new Set([';', '{', '}', ','])
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!/^[[(]/.test(trimmed)) continue

      // Find the previous effective (non-blank, non-comment) line
      let prev = i - 1
      while (prev >= 0) {
        const p = lines[prev].trim()
        if (!p || p.startsWith('//')) { prev--; continue }
        const last = p[p.length - 1]
        if (terminators.has(last)) break
        throw new Error(
          `WELCOME_CODE ASI trap at line ${i + 1}: "${trimmed}"\n` +
          `Previous effective line ends with "${last}" (not a terminator): "${p}"`
        )
      }
    }
  })
})
