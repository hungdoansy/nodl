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

// --- Timer tracking for async drain ---
const origSetTimeout = globalThis.setTimeout
const origClearTimeout = globalThis.clearTimeout
const origSetInterval = globalThis.setInterval
const origClearInterval = globalThis.clearInterval

let pendingTimers = 0
const trackedTimers = new Set<ReturnType<typeof setTimeout>>()

// Intercept setTimeout so we can track pending async work
// @ts-expect-error — override global
globalThis.setTimeout = (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
  pendingTimers++
  const id = origSetTimeout((...a: unknown[]) => {
    pendingTimers--
    trackedTimers.delete(id)
    fn(...a)
  }, ms, ...args)
  trackedTimers.add(id)
  return id
}

// @ts-expect-error — override global
globalThis.clearTimeout = (id: ReturnType<typeof setTimeout>) => {
  if (trackedTimers.has(id)) {
    pendingTimers--
    trackedTimers.delete(id)
  }
  origClearTimeout(id)
}

// @ts-expect-error — override global
globalThis.setInterval = (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
  pendingTimers++
  const id = origSetInterval(fn, ms, ...args)
  trackedTimers.add(id)
  return id
}

// @ts-expect-error — override global
globalThis.clearInterval = (id: ReturnType<typeof setInterval>) => {
  if (trackedTimers.has(id)) {
    pendingTimers--
    trackedTimers.delete(id)
  }
  origClearInterval(id)
}

/**
 * Wait for all pending timers and microtasks to drain.
 * Polls until nothing is pending (or max wait reached).
 */
function waitForAsyncDrain(maxWaitMs = 5000): Promise<void> {
  return new Promise<void>((resolve) => {
    const startTime = Date.now()

    function check(): void {
      if (pendingTimers <= 0 || Date.now() - startTime > maxWaitMs) {
        // One final microtask flush
        origSetTimeout(resolve, 0)
      } else {
        origSetTimeout(check, 50)
      }
    }

    // Start checking after a tick to let initial microtasks schedule timers
    origSetTimeout(check, 10)
  })
}

process.on('message', async (msg: { code: string; language: string }) => {
  const lineTracker = { value: 0 }

  const capturedConsole = createConsoleCapturer((entry) => {
    sendConsoleEntry({ ...entry, line: lineTracker.value || undefined })
  })

  const pendingPromises: Promise<void>[] = []

  function exprReporter(line: number, value: unknown): unknown {
    if (value !== undefined) {
      // If it's a Promise, wait for it and report the resolved value
      if (value instanceof Promise) {
        const p = (value as Promise<unknown>).then(
          (resolved) => {
            if (resolved !== undefined) {
              sendConsoleEntry({
                id: `expr-${Date.now()}-${idCounter++}`,
                method: 'log',
                args: [{ __type: 'LastExpression', value: serializeArg(resolved) }],
                timestamp: Date.now(),
                line
              })
            }
          },
          () => { /* errors are caught by the user's own catch blocks */ }
        )
        pendingPromises.push(p)
      } else {
        sendConsoleEntry({
          id: `expr-${Date.now()}-${idCounter++}`,
          method: 'log',
          args: [{ __type: 'LastExpression', value: serializeArg(value) }],
          timestamp: Date.now(),
          line
        })
      }
    }
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

    // Wait for pending Promises from expression results (e.g., async function calls)
    if (pendingPromises.length > 0) {
      await Promise.allSettled(pendingPromises)
    }

    // Wait for pending setTimeout/setInterval chains to complete
    await waitForAsyncDrain()

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
