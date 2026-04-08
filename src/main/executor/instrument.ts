/** Prefixes that indicate a line is a statement, not an expression */
const STATEMENT_PREFIXES = [
  'const ', 'let ', 'var ', 'function ', 'function*', 'class ', 'abstract ',
  'if ', 'for ', 'while ', 'switch ', 'try ', 'import ', 'export ',
  'return ', 'throw ', 'do ', 'break', 'continue', 'debugger',
  'type ', 'interface ', 'enum ', 'declare ', 'namespace ',
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
    if (depth < 0) return false
  }
  return true
}

/**
 * Brace context: determines if __line__ can be inserted inside { }
 * - 'block': function body, if/for/while/try body, arrow body → safe
 * - 'class': class/interface body → NOT safe (only members allowed)
 * - 'object': object literal → NOT safe
 * - 'switch': switch body → NOT safe (only case/default labels)
 */
type BraceContext = 'block' | 'class' | 'object' | 'switch'
type StackEntry = '{' | '(' | '['  // parens/brackets are always unsafe

/**
 * Determine the brace context based on the line that opens the {
 */
function classifyBrace(trimmed: string, stack: (StackEntry | BraceContext)[]): BraceContext {
  // class/interface body
  if (/^(abstract\s+)?(class|interface|enum)\s/.test(trimmed)) return 'class'
  if (/^export\s+(default\s+)?(abstract\s+)?(class|interface|enum)\s/.test(trimmed)) return 'class'
  if (/^(const\s+)?enum\s/.test(trimmed)) return 'class'
  // switch body
  if (/^switch\s*\(/.test(trimmed)) return 'switch'
  // Object literal patterns:
  if (/=\s*\{$/.test(trimmed)) return 'object'
  if (/^return\s*\{$/.test(trimmed)) return 'object'
  if (/\(\{$/.test(trimmed)) return 'object'
  // Property value: `key: {` — if we're inside an object or class, nested { is also object
  if (/:\s*\{$/.test(trimmed)) return 'object'
  // If parent context is object/class, nested { is likely object property
  const parentCtx = stack.length > 0 ? stack[stack.length - 1] : null
  if (parentCtx === 'object') return 'object'
  // Everything else (function body, if/for/while/try, arrow body)
  return 'block'
}

/**
 * Scan a line and update the delimiter stack.
 * Ignores delimiters inside string literals.
 */
/**
 * Tracks whether we're inside a multiline template literal.
 * Single/double quoted strings can't span lines, but backticks can.
 */
function updateStack(line: string, stack: (StackEntry | BraceContext)[], trimmed: string, inTemplate: { value: boolean }): void {
  let inString: string | null = inTemplate.value ? '`' : null
  let escaped = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (inString) {
      if (ch === inString) { inString = null; if (ch === '`') inTemplate.value = false }
      continue
    }
    if (ch === '"' || ch === "'") { inString = ch; continue }
    if (ch === '`') { inString = '`'; inTemplate.value = true; continue }
    if (ch === '(') stack.push('(')
    else if (ch === '[') stack.push('[')
    else if (ch === '{') stack.push(classifyBrace(trimmed, stack))
    else if (ch === '}' || ch === ')' || ch === ']') stack.pop()
  }
  // If we end the line still inside a single/double quote, that's a syntax error
  // in the source — but for backticks, persist across lines
  if (inString === '`') inTemplate.value = true
  else if (inString === null && inTemplate.value) inTemplate.value = false
}

/**
 * Check if we're in a statement-safe context.
 * Safe: top-level, or inside a 'block' brace (function body, if/for/while/try).
 * Unsafe: inside '(', '[', 'class', 'object', 'switch'.
 */
function isStatementContext(stack: (StackEntry | BraceContext)[]): boolean {
  if (stack.length === 0) return true
  const top = stack[stack.length - 1]
  return top === 'block'
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
 * Check if a line is a continuation of a previous expression:
 * chain (.then), ternary (? :), optional chaining (?.)
 */
function isChainContinuation(trimmed: string): boolean {
  // Dot chain or optional chain
  if (/^[.?]/.test(trimmed)) return true
  // Ternary continuation: line starts with `: ` (but not `case X:` or `default:`)
  if (/^:\s/.test(trimmed) && !trimmed.startsWith('case ') && !trimmed.startsWith('default')) return true
  return false
}

/**
 * Convert ESM import statements to require() calls.
 * Needed because user code runs inside AsyncFunction (not a module).
 */
export function transformImports(line: string): string {
  const trimmed = line.trim()
  if (!trimmed.startsWith('import ')) return line

  // import "foo" or import 'foo' → require("foo")
  const sideEffectMatch = trimmed.match(/^import\s+(['"])(.*?)\1;?\s*$/)
  if (sideEffectMatch) return `require(${sideEffectMatch[1]}${sideEffectMatch[2]}${sideEffectMatch[1]});`

  // import type ... → strip entirely (TS only, no runtime effect)
  if (/^import\s+type\s/.test(trimmed)) return ''

  // Extract the module specifier: from "..." or from '...'
  const fromMatch = trimmed.match(/from\s+(['"])(.*?)\1;?\s*$/)
  if (!fromMatch) return line
  const quote = fromMatch[1]
  const mod = fromMatch[2]

  // import * as name from "mod" → const name = require("mod")
  const starMatch = trimmed.match(/^import\s+\*\s+as\s+(\w+)\s+from/)
  if (starMatch) return `const ${starMatch[1]} = require(${quote}${mod}${quote});`

  // import { a, b } from "mod" → const { a, b } = require("mod")
  const namedMatch = trimmed.match(/^import\s+(\{[^}]+\})\s+from/)
  if (namedMatch) return `const ${namedMatch[1]} = require(${quote}${mod}${quote});`

  // import name from "mod" → const name = require("mod").default ?? require("mod")
  // (handles both CJS and ESM default exports)
  const defaultMatch = trimmed.match(/^import\s+(\w+)\s+from/)
  if (defaultMatch) {
    const name = defaultMatch[1]
    return `const ${name} = (() => { const _m = require(${quote}${mod}${quote}); return _m.default ?? _m; })();`
  }

  // import name, { a, b } from "mod"
  const mixedMatch = trimmed.match(/^import\s+(\w+)\s*,\s*(\{[^}]+\})\s+from/)
  if (mixedMatch) {
    const defName = mixedMatch[1]
    const named = mixedMatch[2]
    return `const ${defName} = (() => { const _m = require(${quote}${mod}${quote}); return _m.default ?? _m; })(); const ${named} = require(${quote}${mod}${quote});`
  }

  return line
}

/**
 * Instrument code so that:
 * - Every standalone expression line reports its value via __expr__(line, value)
 * - Lines in statement context set __line__.value for console call tracking
 * - ESM import statements are converted to require() calls
 *
 * MUST run on the ORIGINAL source code (before transpilation) so line
 * numbers match the editor.
 */
export function instrumentCode(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []
  const stack: (StackEntry | BraceContext)[] = []
  const inTemplate = { value: false }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineNum = i + 1 // 1-based

    // Inside a multiline template literal — pass through entirely
    if (inTemplate.value) {
      result.push(line)
      updateStack(line, stack, trimmed, inTemplate)
      continue
    }

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      result.push(line)
      continue
    }

    const stmtCtx = isStatementContext(stack)
    const isContinuation = isChainContinuation(trimmed)

    if (stmtCtx && !isContinuation) {
      // Safe to insert __line__ tracking
      result.push(`__line__.value = ${lineNum};`)

      // Transform import statements to require() calls
      if (trimmed.startsWith('import ')) {
        const transformed = transformImports(trimmed)
        result.push(transformed)
      } else if (stack.length === 0 && isExpression(trimmed) && !nextNonEmptyIsContinuation(lines, i)) {
        // Only wrap with __expr__ at top level (stack empty) and not starting a chain
        const expr = trimmed.replace(/;$/, '')
        result.push(`__expr__(${lineNum}, ${expr});`)
      } else {
        result.push(line)
      }
    } else {
      // Inside expression/class/object/switch context or chain continuation — pass through
      result.push(line)
    }

    updateStack(line, stack, trimmed, inTemplate)
  }

  return result.join('\n')
}
