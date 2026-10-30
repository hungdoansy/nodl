/**
 * The `__loopGuard__` the instrumenter injects into every loop body.
 *
 * Extracted from worker.ts (which has module-level side effects) so it can be
 * unit-tested in isolation.
 *
 * Time-based, not an iteration cap: it throws only when a loop is still running
 * just before the runner's execution timeout would kill the worker, so an
 * infinite loop reports an error at its line instead of a bare timeout. Long but
 * finite loops (benchmarks, nested loops) run like they do in node — a fixed
 * iteration cap (the old 1M limit, counted across ALL loops) rejected them.
 */

/** How long before the runner's timeout the guard fires, leaving time to report the error */
export const LOOP_GUARD_MARGIN_MS = 300

export function createLoopGuard(timeoutMs: number, now: () => number = Date.now): () => void {
  const deadline = now() + Math.max(timeoutMs - LOOP_GUARD_MARGIN_MS, 0)
  let count = 0
  return function loopGuard(): void {
    // Read the clock only every 1024 iterations — the guard runs on every iteration
    if ((++count & 0x3ff) === 0 && now() > deadline) {
      throw new Error(
        `Infinite loop detected: loop still running at the ${timeoutMs / 1000}s execution timeout (raise it in Settings if the loop is intended)`
      )
    }
  }
}
