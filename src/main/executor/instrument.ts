/** Prefixes that indicate a line is a statement, not an expression */
const STATEMENT_PREFIXES = [
  'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
  'switch ', 'try ', 'import ', 'export ', 'return ', 'throw ', 'do ', 'break',
  'continue', 'debugger'
]

/**
 * Check if a line is a standalone expression that should have its value captured.
 */
export function isExpression(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return false
  }
  if (STATEMENT_PREFIXES.some((p) => trimmed.startsWith(p))) return false
  if (trimmed.endsWith('{') || trimmed.endsWith('}')) return false
  const stripped = trimmed.replace(/;$/, '')
  if (stripped.includes(';')) return false
  if (/^console\.\w+\(/.test(trimmed)) return false
  return true
}

/**
 * Instrument code so that:
 * - Every standalone expression line reports its value via __expr__(line, value)
 * - Each non-empty line sets __line__.value for console call tracking
 *
 * MUST run on the ORIGINAL source code (before transpilation) so line
 * numbers match the editor.
 */
export function instrumentCode(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineNum = i + 1 // 1-based

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line)
      continue
    }

    // Track current line for console calls
    result.push(`__line__.value = ${lineNum};`)

    if (isExpression(trimmed)) {
      const expr = trimmed.replace(/;$/, '')
      result.push(`__expr__(${lineNum}, ${expr});`)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}
