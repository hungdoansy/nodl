// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { createConsoleCapturer, serializeArg } from '../console-capture'
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

  it('shares circular detection across multiple args', () => {
    const { entries, console } = setup()
    const shared: Record<string, unknown> = { x: 1 }
    shared.self = shared
    // Same circular object as two separate args
    console.log(shared, shared)
    expect(entries[0].args[0]).toEqual({ x: 1, self: '[Circular]' })
    // Second arg sees the same object already in WeakSet → [Circular]
    expect(entries[0].args[1]).toBe('[Circular]')
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

  it('truncates deeply nested objects at max depth', () => {
    const { entries, console } = setup()
    // Build a 15-level deep object (exceeds MAX_DEPTH of 8)
    let obj: Record<string, unknown> = { value: 'leaf' }
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj }
    }
    console.log(obj)
    // Walk to depth 8 — should hit truncation
    let current = entries[0].args[0] as Record<string, unknown>
    for (let i = 0; i < 7; i++) {
      expect(current.nested).toBeDefined()
      current = current.nested as Record<string, unknown>
    }
    // At depth 8, it should be truncated
    expect(current.nested).toBe('[Object (truncated)]')
  })

  it('truncates large arrays', () => {
    const { entries, console } = setup()
    const bigArray = new Array(2000).fill(0).map((_, i) => i)
    console.log(bigArray)
    const serialized = entries[0].args[0] as unknown[]
    // Should have 1000 items + 1 truncation message
    expect(serialized.length).toBe(1001)
    expect(serialized[1000]).toBe('... 1000 more items')
  })

  it('truncates objects with many keys', () => {
    const { entries, console } = setup()
    const bigObj: Record<string, number> = {}
    for (let i = 0; i < 500; i++) {
      bigObj[`key${i}`] = i
    }
    console.log(bigObj)
    const serialized = entries[0].args[0] as Record<string, unknown>
    const keys = Object.keys(serialized)
    // Should have 200 keys + 1 truncation key
    expect(keys.length).toBe(201)
    expect(serialized['...']).toBe('300 more keys')
  })

  it('captures console.assert — only on falsy', () => {
    const { entries, console } = setup()
    console.assert(true, 'should not appear')
    expect(entries).toHaveLength(0)
    console.assert(false, 'assertion failed')
    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('error')
    expect(entries[0].args).toEqual(['assertion failed'])
  })

  it('captures console.assert with no args on falsy', () => {
    const { entries, console } = setup()
    console.assert(false)
    expect(entries[0].args).toEqual(['Assertion failed'])
  })

  it('captures console.time and timeEnd', () => {
    const { entries, console } = setup()
    console.time('test')
    console.timeEnd('test')
    expect(entries).toHaveLength(1)
    expect(entries[0].args[0]).toMatch(/test: \d+ms/)
  })

  it('captures console.count and countReset', () => {
    const { entries, console } = setup()
    console.count('x')
    console.count('x')
    console.count('x')
    expect(entries).toHaveLength(3)
    expect(entries[0].args).toEqual(['x: 1'])
    expect(entries[1].args).toEqual(['x: 2'])
    expect(entries[2].args).toEqual(['x: 3'])
    console.countReset('x')
    console.count('x')
    expect(entries[3].args).toEqual(['x: 1'])
  })

  it('captures console.trace with stack', () => {
    const { entries, console } = setup()
    console.trace('trace msg')
    expect(entries).toHaveLength(1)
    expect(entries[0].args[0]).toBe('trace msg')
    expect(entries[0].args[1]).toContain('\n')
  })

  it('captures console.dir like log', () => {
    const { entries, console } = setup()
    console.dir({ a: 1 })
    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('dir')
    expect(entries[0].args[0]).toEqual({ a: 1 })
  })

  it('captures console.group with args', () => {
    const { entries, console } = setup()
    console.group('group label')
    expect(entries).toHaveLength(1)
    expect(entries[0].args).toEqual(['group label'])
  })

  it('console.groupEnd is a no-op', () => {
    const { entries, console } = setup()
    console.groupEnd()
    expect(entries).toHaveLength(0)
  })

  it('truncates deeply nested arrays at max depth', () => {
    const { entries, console } = setup()
    let arr: unknown = ['leaf']
    for (let i = 0; i < 15; i++) {
      arr = [arr]
    }
    console.log(arr)
    let current = entries[0].args[0] as unknown[]
    for (let i = 0; i < 7; i++) {
      expect(Array.isArray(current[0])).toBe(true)
      current = current[0] as unknown[]
    }
    expect(current[0]).toBe('[Array (1)]')
  })
})

/** Simulate what process.send() does with default JSON serialization */
function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

describe('serializeArg — undefined handling', () => {
  it('serializes top-level undefined as sentinel', () => {
    expect(serializeArg(undefined)).toEqual({ __type: 'Undefined' })
  })

  it('undefined sentinel survives JSON round-trip', () => {
    const serialized = serializeArg(undefined)
    const afterIPC = jsonRoundTrip(serialized)
    expect(afterIPC).toEqual({ __type: 'Undefined' })
  })

  it('null stays null (not converted to sentinel)', () => {
    expect(serializeArg(null)).toBeNull()
  })

  it('serializes undefined inside arrays', () => {
    const result = serializeArg([1, undefined, 'a'])
    expect(result).toEqual([1, { __type: 'Undefined' }, 'a'])
  })

  it('undefined in array survives JSON round-trip', () => {
    const result = jsonRoundTrip(serializeArg([1, undefined, 'a']))
    expect(result).toEqual([1, { __type: 'Undefined' }, 'a'])
  })

  it('serializes undefined inside objects', () => {
    const result = serializeArg({ a: 1, b: undefined, c: 'x' })
    expect(result).toEqual({ a: 1, b: { __type: 'Undefined' }, c: 'x' })
  })

  it('undefined in object survives JSON round-trip', () => {
    const result = jsonRoundTrip(serializeArg({ a: 1, b: undefined }))
    expect(result).toEqual({ a: 1, b: { __type: 'Undefined' } })
  })

  it('serializes undefined inside Set values', () => {
    const result = serializeArg(new Set([1, null, undefined])) as { __type: string; values: unknown[] }
    expect(result.__type).toBe('Set')
    expect(result.values).toEqual([1, null, { __type: 'Undefined' }])
  })

  it('undefined in Set survives JSON round-trip', () => {
    const result = jsonRoundTrip(serializeArg(new Set([1, null, undefined]))) as { __type: string; values: unknown[] }
    expect(result.values).toEqual([1, null, { __type: 'Undefined' }])
  })

  it('serializes undefined as Map value', () => {
    const result = serializeArg(new Map([['key', undefined]])) as { __type: string; entries: unknown[][] }
    expect(result.__type).toBe('Map')
    expect(result.entries).toEqual([['key', { __type: 'Undefined' }]])
  })

  it('console.log with mixed args including undefined survives JSON round-trip', () => {
    const entries: OutputEntry[] = []
    const send = vi.fn((entry: OutputEntry) => entries.push(entry))
    const capturedConsole = createConsoleCapturer(send)

    capturedConsole.log('string', 42, true, null, undefined)

    // Simulate what IPC does
    const afterIPC = jsonRoundTrip(entries[0])
    expect(afterIPC.args).toEqual([
      'string',
      42,
      true,
      null,
      { __type: 'Undefined' },
    ])
  })

  it('bigint serializes as string with n suffix', () => {
    expect(serializeArg(BigInt(0))).toBe('0n')
    expect(serializeArg(BigInt(9007199254740991))).toBe('9007199254740991n')
    expect(serializeArg(BigInt(-42))).toBe('-42n')
  })
})
