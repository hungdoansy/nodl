/**
 * Worker script — runs in a forked child process.
 * Receives code via IPC, executes it with a sandboxed console,
 * and sends output entries + result back to the parent.
 */
import { createConsoleCapturer } from './console-capture'
import type { OutputEntry, WorkerMessage } from '../../../shared/types'

function send(msg: WorkerMessage): void {
  process.send?.(msg)
}

function sendConsoleEntry(entry: OutputEntry): void {
  send({ type: 'console', entry })
}

process.on('message', async (msg: { code: string; language: string }) => {
  const capturedConsole = createConsoleCapturer(sendConsoleEntry)

  try {
    // Wrap code to capture last expression result
    // We use AsyncFunction to support top-level await
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    const wrappedCode = `
      const console = __console__;
      ${msg.code}
    `

    const fn = new AsyncFunction('__console__', 'require', wrappedCode)
    const result = await fn(capturedConsole, require)

    send({
      type: 'result',
      result: {
        success: true,
        duration: 0,
        lastExpressionResult: result
      }
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))

    sendConsoleEntry({
      id: `error-${Date.now()}`,
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
