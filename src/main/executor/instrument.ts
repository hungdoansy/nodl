/** Prefixes that indicate a line is a statement, not an expression */
const STATEMENT_PREFIXES = [
  'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
  'switch ', 'try ', 'import ', 'export ', 'return ', 'throw ', 'do ', 'break',
  'continue', 'debugger'
]

/**
 * Check if a line is a standalone expression that should have its value captured.
 * Must reject continuation lines (part of multi-line constructs) to avoid syntax errors.
 */
export function isExpression(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return false
  }
  if (STATEMENT_PREFIXES.some((p) => trimmed.startsWith(p))) return false
  // Reject lines starting with closing/continuation chars (multi-line expression parts)
  if (/^[}\])]/.test(trimmed)) return false
  if (/^[.,?:+\-*/%|&^~!]/.test(trimmed)) return false
  if (/^(&&|\|\||\?\?)/.test(trimmed)) return false
  // Reject lines ending with opening/closing braces (block boundaries)
  if (trimmed.endsWith('{') || trimmed.endsWith('}')) return false
  // Reject lines ending with comma (multi-line args/arrays/objects)
  if (trimmed.endsWith(',')) return false
  const stripped = trimmed.replace(/;$/, '')
  if (stripped.includes(';')) return false
  if (/^console\.\w+\(/.test(trimmed)) return false
  // Reject lines with unbalanced brackets (part of a larger expression)
  let depth = 0
  for (const ch of stripped) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (depth < 0) return false // more closers than openers → continuation
  }
  return true
}

type Delimiter = '{' | '(' | '['

/**
 * Scan a line and update the delimiter stack.
 * Ignores delimiters inside string literals.
 * Returns the stack so we know our context.
 */
function updateDelimiterStack(line: string, stack: Delimiter[]): void {
  let inString: string | null = null
  let escaped = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (inString) {
      if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue }
    if (ch === '{') stack.push('{')
    else if (ch === '(') stack.push('(')
    else if (ch === '[') stack.push('[')
    else if (ch === '}' || ch === ')' || ch === ']') stack.pop()
  }
}

/**
 * Check if we're in a statement-safe context: either top-level
 * or the innermost open delimiter is `{` (a block body).
 * If innermost is `(` or `[`, we're inside an expression — can't insert statements.
 */
function isStatementContext(stack: Delimiter[]): boolean {
  if (stack.length === 0) return true
  return stack[stack.length - 1] === '{'
}

/**
 * Check if the next non-empty line is a chain continuation (starts with . or ?)
 */
function nextNonEmptyIsContinuation(lines: string[], fromIndex: number): boolean {
  for (let j = fromIndex + 1; j < lines.length; j++) {
    const t = lines[j].trim()
    if (!t) continue
    return /^[.?]/.test(t)
  }
  return false
}

/**
 * Check if a line is a chain continuation (starts with . or ?)
 */
function isChainContinuation(trimmed: string): boolean {
  return /^[.?]/.test(trimmed)
}

/**
 * Instrument code so that:
 * - Every standalone expression line reports its value via __expr__(line, value)
 * - Lines in statement context set __line__.value for console call tracking
 *
 * MUST run on the ORIGINAL source code (before transpilation) so line
 * numbers match the editor.
 */
export function instrumentCode(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []
  const stack: Delimiter[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineNum = i + 1 // 1-based

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line)
      continue
    }

    const stmtCtx = isStatementContext(stack)
    const isContinuation = isChainContinuation(trimmed)

    if (stmtCtx && !isContinuation) {
      // Safe to insert __line__ tracking
      result.push(`__line__.value = ${lineNum};`)

      // Only wrap with __expr__ at top level (stack empty) and not starting a chain
      if (stack.length === 0 && isExpression(trimmed) && !nextNonEmptyIsContinuation(lines, i)) {
        const expr = trimmed.replace(/;$/, '')
        result.push(`__expr__(${lineNum}, ${expr});`)
      } else {
        result.push(line)
      }
    } else {
      // Inside expression context or chain continuation — pass through
      result.push(line)
    }

    updateDelimiterStack(trimmed, stack)
  }

  return result.join('\n')
}
