// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { createConsoleCapturer } from '../console-capture'
import type { OutputEntry } from '../../../../shared/types'

describe('createConsoleCapturer', () => {
  function setup() {
    const entries: OutputEntry[] = []
    const send = vi.fn((entry: OutputEntry) => entries.push(entry))
    const console = createConsoleCapturer(send)
    return { entries, send, console }
  }

  it('captures console.log with string arg', () => {
    const { entries, console } = setup()
    console.log('hello')
    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('log')
    expect(entries[0].args).toEqual(['hello'])
  })

  it('captures console.warn', () => {
    const { entries, console } = setup()
    console.warn('warning!')
    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('warn')
    expect(entries[0].args).toEqual(['warning!'])
  })

  it('captures console.error', () => {
    const { entries, console } = setup()
    console.error('bad')
    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('error')
  })

  it('captures console.info', () => {
    const { entries, console } = setup()
    console.info('info')
    expect(entries[0].method).toBe('info')
  })

  it('captures console.debug', () => {
    const { entries, console } = setup()
    console.debug('debug msg')
    expect(entries[0].method).toBe('debug')
  })

  it('captures multiple console calls', () => {
    const { entries, console } = setup()
    console.log(1)
    console.warn(2)
    console.error(3)
    expect(entries).toHaveLength(3)
    expect(entries.map((e) => e.method)).toEqual(['log', 'warn', 'error'])
  })

  it('captures console.table', () => {
    const { entries, console } = setup()
    console.table([{ a: 1 }])
    expect(entries[0].method).toBe('table')
    expect(entries[0].args[0]).toEqual([{ a: 1 }])
  })

  it('captures console.clear with empty args', () => {
    const { entries, console } = setup()
    console.clear()
    expect(entries[0].method).toBe('clear')
    expect(entries[0].args).toEqual([])
  })

  it('serializes multiple arguments', () => {
    const { entries, console } = setup()
    console.log('a', 42, true, null)
    expect(entries[0].args).toEqual(['a', 42, true, null])
  })

  it('serializes nested objects', () => {
    const { entries, console } = setup()
    console.log({ name: 'test', nested: { value: 42 } })
    expect(entries[0].args[0]).toEqual({ name: 'test', nested: { value: 42 } })
  })

  it('handles circular references', () => {
    const { entries, console } = setup()
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    console.log(obj)
    expect(entries[0].args[0]).toEqual({ a: 1, self: '[Circular]' })
  })

  it('serializes functions', () => {
    const { entries, console } = setup()
    console.log(function myFunc() {})
    expect(entries[0].args[0]).toBe('[Function: myFunc]')
  })

  it('serializes symbols', () => {
    const { entries, console } = setup()
    console.log(Symbol('test'))
    expect(entries[0].args[0]).toBe('Symbol(test)')
  })

  it('serializes Error objects', () => {
    const { entries, console } = setup()
    console.log(new Error('oops'))
    const arg = entries[0].args[0] as { __type: string; message: string }
    expect(arg.__type).toBe('Error')
    expect(arg.message).toBe('oops')
  })

  it('serializes Date objects', () => {
    const { entries, console } = setup()
    const d = new Date('2024-01-01T00:00:00.000Z')
    console.log(d)
    const arg = entries[0].args[0] as { __type: string; value: string }
    expect(arg.__type).toBe('Date')
    expect(arg.value).toBe('2024-01-01T00:00:00.000Z')
  })

  it('serializes RegExp objects', () => {
    const { entries, console } = setup()
    console.log(/test/gi)
    const arg = entries[0].args[0] as { __type: string; value: string }
    expect(arg.__type).toBe('RegExp')
    expect(arg.value).toBe('/test/gi')
  })

  it('serializes Map objects', () => {
    const { entries, console } = setup()
    console.log(new Map([['a', 1]]))
    const arg = entries[0].args[0] as { __type: string; entries: unknown[] }
    expect(arg.__type).toBe('Map')
    expect(arg.entries).toEqual([['a', 1]])
  })

  it('serializes Set objects', () => {
    const { entries, console } = setup()
    console.log(new Set([1, 2, 3]))
    const arg = entries[0].args[0] as { __type: string; values: unknown[] }
    expect(arg.__type).toBe('Set')
    expect(arg.values).toEqual([1, 2, 3])
  })

  it('generates unique entry IDs', () => {
    const { entries, console } = setup()
    console.log('a')
    console.log('b')
    expect(entries[0].id).not.toBe(entries[1].id)
  })

  it('includes timestamps', () => {
    const { entries, console } = setup()
    const before = Date.now()
    console.log('timed')
    expect(entries[0].timestamp).toBeGreaterThanOrEqual(before)
    expect(entries[0].timestamp).toBeLessThanOrEqual(Date.now())
  })
})
