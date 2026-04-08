/**
 * Worker script — runs in a forked child process.
 * Receives already-instrumented code via IPC, executes it,
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

process.on('message', async (msg: { code: string; language: string }) => {
  const lineTracker = { value: 0 }

  const capturedConsole = createConsoleCapturer((entry) => {
    sendConsoleEntry({ ...entry, line: lineTracker.value || undefined })
  })

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

    const wrappedCode = `
      const console = __console__;
      ${msg.code}
    `

    const fn = new AsyncFunction(
      '__console__', 'require', '__expr__', '__line__',
      wrappedCode
    )
    await fn(capturedConsole, require, exprReporter, lineTracker)

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
