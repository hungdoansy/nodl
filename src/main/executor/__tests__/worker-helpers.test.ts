// @vitest-environment node
import { describe, it, expect } from 'vitest'

// Test the last-expression wrapping logic inline (extracted from worker.ts)
function wrapForLastExpression(code: string): string {
  const lines = code.split('\n')

  let lastIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (trimmed && !trimmed.startsWith('//')) {
      lastIdx = i
      break
    }
  }

  if (lastIdx === -1) return code

  const lastLine = lines[lastIdx].trim()
  const noReturnPrefixes = [
    'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
    'switch ', 'try ', 'import ', 'export ', 'return ', 'throw '
  ]
  if (noReturnPrefixes.some((p) => lastLine.startsWith(p)) || lastLine.endsWith('{') || lastLine.endsWith('}')) {
    return code
  }

  const before = lines.slice(0, lastIdx).join('\n')
  const after = lines.slice(lastIdx + 1).join('\n')
  return `${before}\nreturn (${lines[lastIdx]})\n${after}`
}

describe('wrapForLastExpression', () => {
  it('wraps a simple expression', () => {
    expect(wrapForLastExpression('1 + 1')).toContain('return (1 + 1)')
  })

  it('wraps the last line of multi-line code', () => {
    const result = wrapForLastExpression('const x = 1;\nx + 2')
    expect(result).toContain('const x = 1;')
    expect(result).toContain('return (x + 2)')
  })

  it('does not wrap const declarations', () => {
    const code = 'const x = 1'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('does not wrap let declarations', () => {
    const code = 'let x = 1'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('does not wrap function declarations', () => {
    const code = 'function foo() {}'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('does not wrap class declarations', () => {
    const code = 'class Foo {}'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('does not wrap if statements', () => {
    const code = 'if (true) { console.log(1) }'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('does not wrap lines ending with {', () => {
    const code = 'for (let i = 0; i < 10; i++) {'
    expect(wrapForLastExpression(code)).toBe(code)
  })

  it('handles empty code', () => {
    expect(wrapForLastExpression('')).toBe('')
  })

  it('handles code with trailing comments', () => {
    const result = wrapForLastExpression('42\n// comment')
    expect(result).toContain('return (42)')
  })

  it('wraps function call expressions', () => {
    const result = wrapForLastExpression('Math.max(1, 2)')
    expect(result).toContain('return (Math.max(1, 2))')
  })

  it('wraps array literals', () => {
    const result = wrapForLastExpression('[1, 2, 3]')
    expect(result).toContain('return ([1, 2, 3])')
  })

  it('wraps object member access', () => {
    const result = wrapForLastExpression('const obj = {a: 1};\nobj.a')
    expect(result).toContain('return (obj.a)')
  })
})
