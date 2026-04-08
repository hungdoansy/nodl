// @vitest-environment node
import { describe, it, expect } from 'vitest'

// Inline the logic from worker.ts for testing (worker can't be imported directly)
const STATEMENT_PREFIXES = [
  'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
  'switch ', 'try ', 'import ', 'export ', 'return ', 'throw ', 'do ', 'break',
  'continue', 'debugger'
]

function isExpression(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return false
  }
  if (STATEMENT_PREFIXES.some((p) => trimmed.startsWith(p))) return false
  if (trimmed.endsWith('{') || trimmed.endsWith('}')) return false
  const stripped = trimmed.replace(/;$/, '')
  if (stripped.includes(';')) return false
  // console.* calls are side-effects, not value expressions — don't wrap
  if (/^console\.\w+\(/.test(trimmed)) return false
  return true
}

function instrumentCode(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineNum = i + 1

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line)
      continue
    }

    result.push(`__currentLine__ = ${lineNum};`)

    if (isExpression(trimmed)) {
      const expr = trimmed.replace(/;$/, '')
      result.push(`__expr__(${lineNum}, ${expr});`)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

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
    expect(isExpression('console.table([1])')).toBe(false)
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

  it('does not wrap declarations', () => {
    const result = instrumentCode('const x = 1')
    expect(result).not.toContain('__expr__')
    expect(result).toContain('const x = 1')
  })

  it('adds __currentLine__ tracking for each non-empty line', () => {
    const result = instrumentCode('const x = 1\nconsole.log(x)')
    expect(result).toContain('__currentLine__ = 1;')
    expect(result).toContain('__currentLine__ = 2;')
  })

  it('preserves empty lines and comments', () => {
    const result = instrumentCode('// comment\n\n42')
    expect(result).toContain('// comment')
    expect(result).toContain('__expr__(3, 42)')
  })

  it('handles the user sample code correctly', () => {
    const code = `console.log("Hello, nodl!");

const sum = (a, b) => a + b;
console.log("2 + 3 =", sum(2, 3));

65

const b = 1 + 2

b`
    const result = instrumentCode(code)
    // Line 1: console.log is a side-effect call, NOT wrapped in __expr__
    expect(result).not.toContain('__expr__(1,')
    expect(result).toContain('console.log("Hello, nodl!")')
    // Line 4: console.log is a side-effect call, NOT wrapped
    expect(result).not.toContain('__expr__(4,')
    expect(result).toContain('console.log("2 + 3 =", sum(2, 3))')
    // Line 6: 65 is an expression
    expect(result).toContain('__expr__(6, 65)')
    // Line 8: const declaration — NOT wrapped
    expect(result).not.toContain('__expr__(8,')
    // Line 10: b is an expression
    expect(result).toContain('__expr__(10, b)')
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
