/**
 * Worker script — runs in a forked child process.
 * Receives already-instrumented code via IPC, executes it,
 * and sends output entries + result back to the parent.
 */
import { createConsoleCapturer } from './console-capture'
import { createExprReporter } from './expr-reporter'
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
const trackedIntervals = new Set<ReturnType<typeof setInterval>>()

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
  trackedIntervals.add(id)
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

  const exprReporter = createExprReporter(sendConsoleEntry, pendingPromises)

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    // Loop guard: throws after too many iterations to detect infinite loops
    const MAX_ITERATIONS = 1_000_000
    let loopCount = 0
    function loopGuard(): void {
      if (++loopCount > MAX_ITERATIONS) {
        throw new Error(`Infinite loop detected (exceeded ${MAX_ITERATIONS.toLocaleString()} iterations)`)
      }
    }

    const wrappedCode = `
      const console = __console__;
      ${msg.code}
    `

    const fn = new AsyncFunction(
      '__console__', 'require', '__expr__', '__line__', '__loopGuard__',
      wrappedCode
    )
    await fn(capturedConsole, require, exprReporter, lineTracker, loopGuard)

    // Wait for pending Promises from expression results (e.g., async function calls)
    if (pendingPromises.length > 0) {
      await Promise.allSettled(pendingPromises)
    }

    // Auto-clear all intervals — they'd run forever and block drain
    for (const id of trackedIntervals) {
      origClearInterval(id)
      if (trackedTimers.has(id)) {
        pendingTimers--
        trackedTimers.delete(id)
      }
    }
    trackedIntervals.clear()

    // Wait for remaining setTimeout chains to complete
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
