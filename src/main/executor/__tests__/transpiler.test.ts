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
})
