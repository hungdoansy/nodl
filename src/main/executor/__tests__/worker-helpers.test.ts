// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isExpression, instrumentCode } from '../instrument'

describe('isExpression', () => {
  it('identifies standalone numbers', () => {
    expect(isExpression('42')).toBe(true)
  })

  it('identifies standalone strings', () => {
    expect(isExpression('"hello"')).toBe(true)
  })

  it('identifies function calls (non-console)', () => {
    expect(isExpression('Math.max(1, 2)')).toBe(true)
    expect(isExpression('foo()')).toBe(true)
    expect(isExpression('arr.map(x => x + 1)')).toBe(true)
  })

  it('identifies variable references', () => {
    expect(isExpression('b')).toBe(true)
    expect(isExpression('x + y')).toBe(true)
  })

  it('rejects declarations', () => {
    expect(isExpression('const x = 1')).toBe(false)
    expect(isExpression('let y = 2')).toBe(false)
    expect(isExpression('var z = 3')).toBe(false)
  })

  it('rejects control flow', () => {
    expect(isExpression('if (true) {}')).toBe(false)
    expect(isExpression('for (;;) {}')).toBe(false)
    expect(isExpression('while (true) {}')).toBe(false)
    expect(isExpression('throw new Error()')).toBe(false)
  })

  it('rejects function/class declarations', () => {
    expect(isExpression('function foo() {}')).toBe(false)
    expect(isExpression('class Foo {}')).toBe(false)
  })

  it('rejects lines ending with braces', () => {
    expect(isExpression('if (true) {')).toBe(false)
    expect(isExpression('}')).toBe(false)
  })

  it('rejects multi-statement lines', () => {
    expect(isExpression('a(); b()')).toBe(false)
    expect(isExpression('a(); b();')).toBe(false)
  })

  it('rejects console.* calls', () => {
    expect(isExpression('console.log("hi")')).toBe(false)
    expect(isExpression('console.warn("w")')).toBe(false)
    expect(isExpression('console.error("e")')).toBe(false)
  })

  it('rejects comments', () => {
    expect(isExpression('// comment')).toBe(false)
    expect(isExpression('/* block */')).toBe(false)
  })

  it('rejects empty lines', () => {
    expect(isExpression('')).toBe(false)
    expect(isExpression('   ')).toBe(false)
  })
})

describe('instrumentCode', () => {
  it('wraps standalone expressions with __expr__', () => {
    const result = instrumentCode('42')
    expect(result).toContain('__expr__(1, 42)')
  })

  it('wraps multiple standalone expressions', () => {
    const code = 'const x = 1\n\nx\n\n65'
    const result = instrumentCode(code)
    expect(result).toContain('__expr__(3, x)')
    expect(result).toContain('__expr__(5, 65)')
  })

  it('preserves empty lines (critical for line alignment)', () => {
    const code = 'a\n\n\nb'
    const result = instrumentCode(code)
    const lines = result.split('\n')
    // Line 2 and 3 should be empty (preserved)
    expect(lines).toContain('')
  })

  it('does not wrap declarations', () => {
    const result = instrumentCode('const x = 1')
    expect(result).not.toContain('__expr__')
    expect(result).toContain('const x = 1')
  })

  it('does not wrap console.* calls', () => {
    const result = instrumentCode('console.log("hi")')
    expect(result).not.toContain('__expr__')
    expect(result).toContain('console.log("hi")')
  })

  it('handles the user sample code with correct line numbers', () => {
    const code = `new Date()
new Date()
22
33
44
55
66
77

88
99
100
101
102




new Date()`
    const result = instrumentCode(code)
    expect(result).toContain('__expr__(1, new Date())')
    expect(result).toContain('__expr__(2, new Date())')
    expect(result).toContain('__expr__(3, 22)')
    expect(result).toContain('__expr__(10, 88)')
    expect(result).toContain('__expr__(19, new Date())')
    // Empty lines from original are preserved in output
    expect(result).toContain('\n\n') // blank lines not stripped
  })

  it('strips trailing semicolons from expressions', () => {
    const result = instrumentCode('42;')
    expect(result).toContain('__expr__(1, 42)')
    expect(result).not.toContain('42;)')
  })

  it('skips multi-statement lines', () => {
    const result = instrumentCode('a(); b()')
    expect(result).not.toContain('__expr__')
  })
})
