// @vitest-environment node
/**
 * Unit tests for createExprReporter — the runtime that captures top-level
 * expression values (__expr__).
 *
 * These exercise the contract the instrumenter tests only assert about in
 * string form: the AST instrumenter wraps EVERY top-level expression, and this
 * reporter is what makes that safe by suppressing `undefined` results. Without
 * this coverage a broken undefined-check would print a stray "undefined" after
 * nearly every statement in the shipped app, and no other test would catch it.
 */
import { describe, it, expect } from 'vitest'
import { createExprReporter } from '../expr-reporter'
import type { OutputEntry } from '../../../../shared/types'

/** Build a reporter with a captured emit sink and pendingPromises array. */
function setup() {
  const emitted: OutputEntry[] = []
  const pendingPromises: Promise<void>[] = []
  const reporter = createExprReporter((e) => emitted.push(e), pendingPromises)
  return { emitted, pendingPromises, reporter }
}

/** The LastExpression payload from an emitted entry, for assertions. */
function lastExpr(entry: OutputEntry) {
  const arg = entry.args[0] as { __type: string; value: unknown }
  return arg
}

describe('createExprReporter — synchronous values', () => {
  it('suppresses undefined (nothing emitted)', () => {
    const { emitted, reporter } = setup()
    const ret = reporter(1, undefined)
    expect(emitted).toHaveLength(0)
    expect(ret).toBeUndefined()
  })

  it('emits a non-undefined primitive as a LastExpression on the right line', () => {
    const { emitted, reporter } = setup()
    const ret = reporter(7, 42)
    expect(ret).toBe(42) // passthrough
    expect(emitted).toHaveLength(1)
    expect(emitted[0].method).toBe('log')
    expect(emitted[0].line).toBe(7)
    expect(lastExpr(emitted[0])).toEqual({ __type: 'LastExpression', value: 42 })
  })

  it('emits null — null is not undefined', () => {
    const { emitted, reporter } = setup()
    const ret = reporter(1, null)
    expect(ret).toBeNull()
    expect(emitted).toHaveLength(1)
    expect(lastExpr(emitted[0])).toEqual({ __type: 'LastExpression', value: null })
  })

  it('emits falsy-but-defined values (0, "", false, NaN)', () => {
    const { emitted, reporter } = setup()
    reporter(1, 0)
    reporter(2, '')
    reporter(3, false)
    reporter(4, NaN)
    expect(emitted).toHaveLength(4)
    expect(emitted.map((e) => lastExpr(e).value)).toEqual([0, '', false, NaN])
  })

  it('returns the exact same reference (transparent passthrough)', () => {
    const { reporter } = setup()
    const obj = { a: 1 }
    expect(reporter(1, obj)).toBe(obj)
  })

  it('does not register a pending promise for synchronous values', () => {
    const { pendingPromises, reporter } = setup()
    reporter(1, 42)
    reporter(2, undefined)
    expect(pendingPromises).toHaveLength(0)
  })
})

describe('createExprReporter — promises', () => {
  it('awaits a promise and emits its resolved value', async () => {
    const { emitted, pendingPromises, reporter } = setup()
    const ret = reporter(3, Promise.resolve('done'))
    expect(ret).toBeInstanceOf(Promise) // passthrough of the promise itself
    expect(pendingPromises).toHaveLength(1) // registered for drain
    expect(emitted).toHaveLength(0) // nothing emitted synchronously

    await Promise.allSettled(pendingPromises)

    expect(emitted).toHaveLength(1)
    expect(emitted[0].method).toBe('log')
    expect(emitted[0].line).toBe(3)
    expect(lastExpr(emitted[0])).toEqual({ __type: 'LastExpression', value: 'done' })
  })

  it('suppresses a promise that resolves to undefined', async () => {
    const { emitted, pendingPromises, reporter } = setup()
    reporter(1, Promise.resolve(undefined))
    await Promise.allSettled(pendingPromises)
    expect(emitted).toHaveLength(0)
  })

  it('emits an error entry when a promise rejects (and does not throw)', async () => {
    const { emitted, pendingPromises, reporter } = setup()
    reporter(5, Promise.reject(new Error('boom')))
    await Promise.allSettled(pendingPromises)
    expect(emitted).toHaveLength(1)
    expect(emitted[0].method).toBe('error')
    expect(emitted[0].line).toBe(5)
    expect(emitted[0].args[0]).toBe('boom')
  })

  it('stringifies a non-Error rejection reason', async () => {
    const { emitted, pendingPromises, reporter } = setup()
    reporter(1, Promise.reject('plain string'))
    await Promise.allSettled(pendingPromises)
    expect(emitted[0].method).toBe('error')
    expect(emitted[0].args[0]).toBe('plain string')
  })
})
