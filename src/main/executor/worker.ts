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

/**
 * Wraps code so the last expression's value is captured.
 * We split by lines and wrap the last non-empty line in a return.
 */
function wrapForLastExpression(code: string): string {
  const lines = code.split('\n')

  // Find last non-empty, non-comment line
  let lastIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (trimmed && !trimmed.startsWith('//')) {
      lastIdx = i
      break
    }
  }

  if (lastIdx === -1) return code

  // Check if last line is a statement that can't be returned
  const lastLine = lines[lastIdx].trim()
  const noReturnPrefixes = [
    'const ', 'let ', 'var ', 'function ', 'class ', 'if ', 'for ', 'while ',
    'switch ', 'try ', 'import ', 'export ', 'return ', 'throw '
  ]
  if (noReturnPrefixes.some((p) => lastLine.startsWith(p)) || lastLine.endsWith('{') || lastLine.endsWith('}')) {
    return code
  }

  // Wrap last line in return — strip trailing semicolon to avoid syntax error
  const lastExpr = lines[lastIdx].trimEnd().replace(/;$/, '')
  const before = lines.slice(0, lastIdx).join('\n')
  const after = lines.slice(lastIdx + 1).join('\n')
  return `${before}\nreturn (${lastExpr})\n${after}`
}

process.on('message', async (msg: { code: string; language: string }) => {
  const capturedConsole = createConsoleCapturer(sendConsoleEntry)

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    const wrappedCode = `
      const console = __console__;
      ${wrapForLastExpression(msg.code)}
    `

    const fn = new AsyncFunction('__console__', 'require', wrappedCode)
    const result = await fn(capturedConsole, require)

    // Send last expression result if it's not undefined
    if (result !== undefined) {
      sendConsoleEntry({
        id: `last-expr-${Date.now()}-${idCounter++}`,
        method: 'log',
        args: [{ __type: 'LastExpression', value: serializeArg(result) }],
        timestamp: Date.now()
      })
    }

    send({
      type: 'result',
      result: {
        success: true,
        duration: 0,
        lastExpressionResult: result !== undefined ? serializeArg(result) : undefined
      }
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    sendConsoleEntry({
      id: `error-${Date.now()}-${idCounter++}`,
      method: 'error',
      args: [error.message, error.stack || ''],
      timestamp: Date.now()
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
