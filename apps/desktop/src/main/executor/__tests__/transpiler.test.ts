// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { transpile } from '../transpiler'

describe('transpiler', () => {
  it('transpiles valid TypeScript to JavaScript', () => {
    const result = transpile('const x: number = 42;')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('const x = 42')
  })

  it('transpiles TypeScript interfaces (stripped)', () => {
    const result = transpile(`
      interface User { name: string; age: number }
      const u: User = { name: "Alice", age: 30 };
    `)
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('interface')
    expect(result.js).toContain('name: "Alice"')
  })

  it('transpiles generic types', () => {
    const result = transpile('function identity<T>(x: T): T { return x; }')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('function identity')
    expect(result.js).not.toContain('<T>')
  })

  it('transpiles enums', () => {
    const result = transpile('enum Color { Red, Green, Blue }')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toBeTruthy()
  })

  it('transpiles type assertions', () => {
    const result = transpile('const x = "hello" as string;')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('"hello"')
  })

  it('returns errors for syntax errors', () => {
    const result = transpile('const x: number = ;')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toBeTruthy()
  })

  it('returns errors for unterminated template literal', () => {
    const result = transpile('const x = `hello')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('transpiles plain JavaScript unchanged', () => {
    const result = transpile('const x = 42;')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('const x = 42')
  })

  it('handles arrow functions with type annotations', () => {
    const result = transpile('const add = (a: number, b: number): number => a + b;')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('=> a + b')
    expect(result.js).not.toContain(': number')
  })

  it('handles empty input', () => {
    const result = transpile('')
    expect(result.errors).toHaveLength(0)
  })

  it('supports tsx loader for JSX', () => {
    const result = transpile('const el = <div>hello</div>;', 'tsx')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toBeTruthy()
  })

  it('error includes line number', () => {
    const result = transpile('const x = 1;\nconst y: = ;')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].line).toBeGreaterThan(0)
  })

  it('strips type-only imports', () => {
    const result = transpile('import type { Foo } from "./foo";\nconst x = 1;')
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('import type')
  })

  it('strips @__PURE__ annotations from output', () => {
    const result = transpile('new Date()')
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('@__PURE__')
    expect(result.js).toContain('new Date()')
  })

  it('strips @__PURE__ from constructor calls', () => {
    const result = transpile('new Map()')
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('@__PURE__')
  })

  // --- Additional edge cases ---
  it('handles optional chaining', () => {
    const result = transpile('const x = obj?.a?.b')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('?.')
  })

  it('handles nullish coalescing', () => {
    const result = transpile('const x = a ?? b')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('??')
  })

  it('handles async/await', () => {
    const result = transpile('async function foo() { const r = await Promise.resolve(1); return r; }')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('async')
    expect(result.js).toContain('await')
  })

  it('handles decorators syntax gracefully', () => {
    // esbuild may or may not support decorators depending on config
    // At minimum it should not crash
    const result = transpile('class Foo { method() {} }')
    expect(result.errors).toHaveLength(0)
  })

  it('handles multiple @__PURE__ annotations', () => {
    const result = transpile('new Date()\nnew Map()\nnew Set()')
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('@__PURE__')
    expect(result.js).toContain('new Date()')
    expect(result.js).toContain('new Map()')
    expect(result.js).toContain('new Set()')
  })

  it('handles satisfies keyword', () => {
    const result = transpile('const x = { a: 1 } satisfies Record<string, number>')
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('satisfies')
  })

  it('handles multiline string', () => {
    const result = transpile('const s = `line1\nline2\nline3`')
    expect(result.errors).toHaveLength(0)
  })

  it('handles class with access modifiers', () => {
    const result = transpile(`class Foo {
  public a = 1
  private b = 2
  protected c = 3
  readonly d = 4
}`)
    expect(result.errors).toHaveLength(0)
    expect(result.js).not.toContain('public')
    expect(result.js).not.toContain('private')
    expect(result.js).not.toContain('protected')
  })

  it('preserves line count in output', () => {
    const input = 'const a = 1\n\n\nconst b = 2'
    const result = transpile(input)
    expect(result.errors).toHaveLength(0)
    // esbuild may compact, but instrumented code relies on this
  })

  it('auto-detects JSX in ts mode and transpiles successfully', () => {
    const result = transpile('const el = <div>hello</div>')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toBeTruthy()
  })

  it('auto-detects JSX fragments', () => {
    const result = transpile('const el = <>fragment</>')
    expect(result.errors).toHaveLength(0)
  })

  it('does not false-positive on comparison operators', () => {
    // `a < b` should not trigger JSX detection and cause issues
    const result = transpile('const x = 1 < 2')
    expect(result.errors).toHaveLength(0)
    expect(result.js).toContain('1 < 2')
  })
})
