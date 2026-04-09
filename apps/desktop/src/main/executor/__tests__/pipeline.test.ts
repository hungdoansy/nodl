// @vitest-environment node
/**
 * Full pipeline tests: instrumentCode → transpile → verify valid JS
 * Simulates what the main process does before sending code to the worker.
 */
import { describe, it, expect } from 'vitest'
import { instrumentCode } from '../instrument'
import { transpile } from '../transpiler'

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
})
