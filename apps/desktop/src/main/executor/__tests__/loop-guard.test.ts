// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createLoopGuard, LOOP_GUARD_MARGIN_MS } from '../loop-guard'

describe('createLoopGuard', () => {
  it('lets long finite loops run (no iteration cap)', () => {
    let t = 0
    const guard = createLoopGuard(5000, () => t)
    // 5M iterations across "several loops" — the old guard threw after 1M total
    expect(() => { for (let i = 0; i < 5_000_000; i++) guard() }).not.toThrow()
  })

  it('throws once the loop is still running near the execution timeout', () => {
    let t = 0
    const guard = createLoopGuard(5000, () => t)
    t = 5000 - LOOP_GUARD_MARGIN_MS + 1
    expect(() => { for (let i = 0; i < 1024; i++) guard() }).toThrow(/Infinite loop detected.*5s execution timeout/)
  })

  it('does not throw before the deadline', () => {
    let t = 0
    const guard = createLoopGuard(5000, () => t)
    t = 5000 - LOOP_GUARD_MARGIN_MS
    expect(() => { for (let i = 0; i < 10_000; i++) guard() }).not.toThrow()
  })

  it('follows the configured timeout', () => {
    let t = 0
    const guard = createLoopGuard(30_000, () => t)
    t = 20_000
    expect(() => { for (let i = 0; i < 2048; i++) guard() }).not.toThrow()
    t = 30_000
    expect(() => { for (let i = 0; i < 1024; i++) guard() }).toThrow(/30s/)
  })
})
