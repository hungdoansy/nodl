/**
 * The `__expr__` reporter: captures and reports the value of every top-level
 * expression the instrumenter wraps.
 *
 * Extracted from worker.ts (which has module-level side effects — it overrides
 * global timers and registers an IPC handler on import) so this logic can be
 * unit-tested in isolation.
 *
 * Contract (relied on by the AST instrumenter, which wraps EVERY top-level
 * expression uniformly):
 *   - `undefined` values are suppressed — never emitted. This is what makes
 *     wrapping `console.log(...)`, `void 0`, `setTimeout(...)` etc. harmless.
 *   - Promises are awaited; the resolved value is emitted (unless `undefined`),
 *     and the pending promise is pushed onto `pendingPromises` so the caller can
 *     drain it before exiting. Rejections are emitted as errors.
 *   - The original value is always returned (passthrough) so wrapping an
 *     expression never changes program behavior.
 */
import { serializeArg } from './console-capture'
import type { OutputEntry } from '../../../shared/types'

let idCounter = 0

export type ExprReporter = (line: number, value: unknown) => unknown

/**
 * Build an `__expr__` reporter that emits captured expression values via `emit`.
 * Pending promises from async expression results are pushed onto
 * `pendingPromises` so the worker can await them during async drain.
 */
export function createExprReporter(
  emit: (entry: OutputEntry) => void,
  pendingPromises: Promise<void>[]
): ExprReporter {
  return function exprReporter(line: number, value: unknown): unknown {
    if (value !== undefined) {
      // If it's a Promise, wait for it and report the resolved value
      if (value instanceof Promise) {
        const p = (value as Promise<unknown>).then(
          (resolved) => {
            if (resolved !== undefined) {
              emit({
                id: `expr-${Date.now()}-${idCounter++}`,
                method: 'log',
                args: [{ __type: 'LastExpression', value: serializeArg(resolved) }],
                timestamp: Date.now(),
                line
              })
            }
          },
          (err) => {
            const message = err instanceof Error ? err.message : String(err)
            emit({
              id: `expr-err-${Date.now()}-${idCounter++}`,
              method: 'error',
              args: [message],
              timestamp: Date.now(),
              line
            })
          }
        )
        pendingPromises.push(p)
      } else {
        emit({
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
}
