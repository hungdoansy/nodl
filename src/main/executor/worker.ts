/**
 * Worker script — runs in a forked child process.
 * Receives code via IPC, executes it with a sandboxed console,
 * and sends output entries + result back to the parent.
 */
import { createConsoleCapturer } from './console-capture'
import { serializeArg } from './console-capture'
import type { OutputEntry, WorkerMessage } from '../../../shared/types'

let idCounter = 0

function send(msg: WorkerMessage): void {
  process.send?.(msg)
}

function sendConsoleEntry(entry: OutputEntry): void {
  send({ type: 'console', entry })
}

/** Prefixes that indicate a line is a statement, not an expression */
const STATEMENT_PREFIXES = [
  'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
  'switch ', 'try ', 'import ', 'export ', 'return ', 'throw ', 'do ', 'break',
  'continue', 'debugger'
]

/**
 * Check if a line is a standalone expression that should have its value captured.
 */
function isExpression(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return false
  }
  if (STATEMENT_PREFIXES.some((p) => trimmed.startsWith(p))) return false
  if (trimmed.endsWith('{') || trimmed.endsWith('}')) return false
  // Multi-statement lines (semicolons in the middle) — skip
  const stripped = trimmed.replace(/;$/, '')
  if (stripped.includes(';')) return false
  // console.* calls are side-effects, not value expressions — don't wrap
  if (/^console\.\w+\(/.test(trimmed)) return false
  return true
}

/**
 * Instrument code so that:
 * - Every standalone expression line reports its value via __expr__(line, value)
 * - console.log/warn/error/etc calls get a line number via __line__ tracking
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
    result.push(`__currentLine__ = ${lineNum};`)

    if (isExpression(trimmed)) {
      // Wrap expression to capture its value
      const expr = trimmed.replace(/;$/, '')
      result.push(`__expr__(${lineNum}, ${expr});`)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

process.on('message', async (msg: { code: string; language: string }) => {
  const lineTracker = { value: 0 }

  // Console capturer that includes line number
  const capturedConsole = createConsoleCapturer((entry) => {
    sendConsoleEntry({ ...entry, line: lineTracker.value || undefined })
  })

  // Expression result reporter
  function exprReporter(line: number, value: unknown): unknown {
    sendConsoleEntry({
      id: `expr-${Date.now()}-${idCounter++}`,
      method: 'log',
      args: [{ __type: 'LastExpression', value: serializeArg(value) }],
      timestamp: Date.now(),
      line
    })
    return value
  }

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    const instrumented = instrumentCode(msg.code)

    const wrappedCode = `
      const console = __console__;
      ${instrumented.replace(/__currentLine__ = (\d+);/g, '__line__.value = $1;')}
    `

    const fn = new AsyncFunction(
      '__console__', 'require', '__expr__', '__line__',
      wrappedCode
    )
    await fn(
      capturedConsole,
      require,
      exprReporter,
      lineTracker
    )

    send({
      type: 'result',
      result: { success: true, duration: 0 }
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    sendConsoleEntry({
      id: `error-${Date.now()}-${idCounter++}`,
      method: 'error',
      args: [error.message, error.stack || ''],
      timestamp: Date.now(),
      line: lineTracker.value || undefined
    })

    send({
      type: 'error',
      result: {
        success: false,
        duration: 0,
        error: error.message
      }
    })
  }

  process.exit(0)
})
