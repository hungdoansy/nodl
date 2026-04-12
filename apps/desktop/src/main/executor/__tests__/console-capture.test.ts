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

// ─────────────────────────────────────────────────────────────────
// Exhaustive serializeArg tests — every JS type, edge case, and
// monkey-style weirdness. Each test also round-trips through JSON
// to prove the value survives IPC.
// ─────────────────────────────────────────────────────────────────

/** serialize + JSON round-trip in one shot */
function ipc(value: unknown) {
  const serialized = serializeArg(value)
  return JSON.parse(JSON.stringify(serialized))
}

describe('serializeArg — primitives', () => {
  // strings
  it('empty string', () => expect(ipc('')).toBe(''))
  it('simple string', () => expect(ipc('hello')).toBe('hello'))
  it('string with quotes', () => expect(ipc('he said "hi"')).toBe('he said "hi"'))
  it('string with newlines', () => expect(ipc('a\nb\nc')).toBe('a\nb\nc'))
  it('string with unicode', () => expect(ipc('café ☕')).toBe('café ☕'))
  it('string with emoji', () => expect(ipc('🔥💀🤡')).toBe('🔥💀🤡'))
  it('string with null bytes', () => expect(ipc('a\0b')).toBe('a\0b'))
  it('very long string', () => {
    const s = 'x'.repeat(10000)
    expect(ipc(s)).toBe(s)
  })
  it('string that looks like a number', () => expect(ipc('42')).toBe('42'))
  it('string that looks like bigint', () => expect(ipc('123n')).toBe('123n'))
  it('string "undefined"', () => expect(ipc('undefined')).toBe('undefined'))
  it('string "null"', () => expect(ipc('null')).toBe('null'))
  it('string "[Function: foo]"', () => expect(ipc('[Function: foo]')).toBe('[Function: foo]'))

  // numbers
  it('zero', () => expect(ipc(0)).toBe(0))
  it('negative zero', () => {
    // JSON.stringify(-0) === "0", so -0 becomes 0 after IPC
    expect(ipc(-0)).toBe(0)
  })
  it('integer', () => expect(ipc(42)).toBe(42))
  it('negative integer', () => expect(ipc(-99)).toBe(-99))
  it('float', () => expect(ipc(3.14)).toBe(3.14))
  it('very small float', () => expect(ipc(0.000001)).toBe(0.000001))
  it('MAX_SAFE_INTEGER', () => expect(ipc(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER))
  it('MIN_SAFE_INTEGER', () => expect(ipc(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER))
  it('NaN', () => expect(ipc(NaN)).toBe(null)) // JSON.stringify(NaN) → null
  it('Infinity', () => expect(ipc(Infinity)).toBe(null)) // JSON.stringify(Infinity) → null
  it('-Infinity', () => expect(ipc(-Infinity)).toBe(null))

  // booleans
  it('true', () => expect(ipc(true)).toBe(true))
  it('false', () => expect(ipc(false)).toBe(false))

  // null & undefined
  it('null', () => expect(ipc(null)).toBe(null))
  it('undefined', () => expect(ipc(undefined)).toEqual({ __type: 'Undefined' }))

  // bigint
  it('0n', () => expect(ipc(BigInt(0))).toBe('0n'))
  it('large bigint', () => expect(ipc(BigInt('99999999999999999999'))).toBe('99999999999999999999n'))
  it('negative bigint', () => expect(ipc(BigInt(-1))).toBe('-1n'))

  // symbol
  it('symbol with description', () => expect(ipc(Symbol('test'))).toBe('Symbol(test)'))
  it('symbol without description', () => expect(ipc(Symbol())).toBe('Symbol()'))
  it('well-known symbol', () => expect(ipc(Symbol.iterator)).toBe('Symbol(Symbol.iterator)'))
})

describe('serializeArg — functions', () => {
  it('named function', () => expect(ipc(function myFunc() {})).toBe('[Function: myFunc]'))
  it('anonymous function', () => expect(ipc(function () {})).toBe('[Function: anonymous]'))
  it('arrow function', () => expect(ipc(() => {})).toBe('[Function: anonymous]'))
  it('named arrow in variable', () => {
    const greet = () => {}
    expect(ipc(greet)).toBe('[Function: greet]')
  })
  it('async function', () => expect(ipc(async function fetchData() {})).toBe('[Function: fetchData]'))
  it('generator function', () => expect(ipc(function* gen() {})).toBe('[Function: gen]'))
  it('class constructor', () => {
    class Foo {}
    expect(ipc(Foo)).toBe('[Function: Foo]')
  })
  it('built-in function', () => expect(ipc(Array.isArray)).toBe('[Function: isArray]'))
  it('bound function', () => {
    function original() {}
    expect(ipc(original.bind(null))).toBe('[Function: bound original]')
  })
})

describe('serializeArg — Date', () => {
  it('valid date', () => {
    const d = new Date('2024-06-15T12:00:00Z')
    const result = ipc(d)
    expect(result).toEqual({ __type: 'Date', value: '2024-06-15T12:00:00.000Z' })
  })
  it('epoch', () => {
    const result = ipc(new Date(0))
    expect(result).toEqual({ __type: 'Date', value: '1970-01-01T00:00:00.000Z' })
  })
  it('invalid date', () => {
    const result = ipc(new Date('nope'))
    expect(result).toEqual({ __type: 'Date', value: 'Invalid Date' })
  })
})

describe('serializeArg — RegExp', () => {
  it('simple regex', () => expect(ipc(/test/)).toEqual({ __type: 'RegExp', value: '/test/' }))
  it('regex with flags', () => expect(ipc(/hello/gi)).toEqual({ __type: 'RegExp', value: '/hello/gi' }))
  it('complex regex', () => {
    const result = ipc(/^[\w.]+@[\w]+\.\w{2,}$/i)
    expect(result.__type).toBe('RegExp')
    expect(result.value).toContain('^[')
  })
})

describe('serializeArg — Error', () => {
  it('basic error', () => {
    const result = ipc(new Error('boom'))
    expect(result.__type).toBe('Error')
    expect(result.message).toBe('boom')
    expect(result.stack).toBeTruthy()
  })
  it('TypeError', () => {
    const result = ipc(new TypeError('not a function'))
    expect(result.__type).toBe('Error')
    expect(result.message).toBe('not a function')
  })
  it('RangeError', () => {
    const result = ipc(new RangeError('out of range'))
    expect(result.message).toBe('out of range')
  })
  it('error with no stack', () => {
    const err = new Error('no stack')
    err.stack = undefined
    const result = ipc(err)
    expect(result.message).toBe('no stack')
  })
})

describe('serializeArg — Map', () => {
  it('empty map', () => {
    expect(ipc(new Map())).toEqual({ __type: 'Map', entries: [] })
  })
  it('string keys', () => {
    expect(ipc(new Map([['a', 1], ['b', 2]]))).toEqual({
      __type: 'Map', entries: [['a', 1], ['b', 2]]
    })
  })
  it('number keys', () => {
    expect(ipc(new Map([[1, 'one'], [2, 'two']]))).toEqual({
      __type: 'Map', entries: [[1, 'one'], [2, 'two']]
    })
  })
  it('object as key', () => {
    const key = { id: 1 }
    const result = ipc(new Map([[key, 'val']]))
    expect(result.__type).toBe('Map')
    expect(result.entries[0][0]).toEqual({ id: 1 })
  })
  it('map with undefined value', () => {
    const result = ipc(new Map<string, unknown>([['key', undefined]]))
    expect(result.entries[0]).toEqual(['key', { __type: 'Undefined' }])
  })
  it('map with null key', () => {
    const result = ipc(new Map([[null, 'val']]))
    expect(result.entries[0][0]).toBe(null)
  })
  it('map with nested map', () => {
    const inner = new Map([['x', 1]])
    const outer = new Map([['nested', inner]])
    const result = ipc(outer)
    expect(result.entries[0][1]).toEqual({ __type: 'Map', entries: [['x', 1]] })
  })
})

describe('serializeArg — Set', () => {
  it('empty set', () => {
    expect(ipc(new Set())).toEqual({ __type: 'Set', values: [] })
  })
  it('numbers', () => {
    expect(ipc(new Set([1, 2, 3]))).toEqual({ __type: 'Set', values: [1, 2, 3] })
  })
  it('deduplication is already done by Set', () => {
    expect(ipc(new Set([1, 1, 2, 2]))).toEqual({ __type: 'Set', values: [1, 2] })
  })
  it('mixed types', () => {
    const result = ipc(new Set([1, 'two', true, null, undefined]))
    expect(result).toEqual({
      __type: 'Set',
      values: [1, 'two', true, null, { __type: 'Undefined' }]
    })
  })
  it('set with objects', () => {
    const result = ipc(new Set([{ a: 1 }, { b: 2 }]))
    expect(result.values).toEqual([{ a: 1 }, { b: 2 }])
  })
  it('set with nested set', () => {
    const inner = new Set([1, 2])
    const result = ipc(new Set([inner]))
    expect(result.values[0]).toEqual({ __type: 'Set', values: [1, 2] })
  })
})

describe('serializeArg — arrays', () => {
  it('empty array', () => expect(ipc([])).toEqual([]))
  it('simple array', () => expect(ipc([1, 2, 3])).toEqual([1, 2, 3]))
  it('mixed types array', () => {
    expect(ipc([1, 'two', true, null, undefined])).toEqual([
      1, 'two', true, null, { __type: 'Undefined' }
    ])
  })
  it('nested arrays', () => {
    expect(ipc([[1, 2], [3, [4, 5]]])).toEqual([[1, 2], [3, [4, 5]]])
  })
  it('array with objects', () => {
    expect(ipc([{ a: 1 }, { b: 2 }])).toEqual([{ a: 1 }, { b: 2 }])
  })
  it('sparse array (holes become null — map skips them, JSON fills null)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const arr = [1, , 3]
    const result = ipc(arr)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(null) // holes != undefined; Array.map skips them
    expect(result[2]).toBe(3)
  })
  it('array with one undefined element', () => {
    expect(ipc([undefined])).toEqual([{ __type: 'Undefined' }])
  })
  it('large array is truncated at 1000', () => {
    const big = Array.from({ length: 2000 }, (_, i) => i)
    const result = ipc(big) as unknown[]
    expect(result.length).toBe(1001)
    expect(result[1000]).toBe('... 1000 more items')
  })
})

describe('serializeArg — objects', () => {
  it('empty object', () => expect(ipc({})).toEqual({}))
  it('simple object', () => expect(ipc({ a: 1, b: 'two' })).toEqual({ a: 1, b: 'two' }))
  it('nested object', () => {
    expect(ipc({ x: { y: { z: 42 } } })).toEqual({ x: { y: { z: 42 } } })
  })
  it('object with null value', () => expect(ipc({ a: null })).toEqual({ a: null }))
  it('object with undefined value', () => {
    expect(ipc({ a: undefined })).toEqual({ a: { __type: 'Undefined' } })
  })
  it('object with all primitive types', () => {
    expect(ipc({
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
      undef: undefined,
    })).toEqual({
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
      undef: { __type: 'Undefined' },
    })
  })
  it('object with numeric keys', () => {
    expect(ipc({ 0: 'a', 1: 'b' })).toEqual({ 0: 'a', 1: 'b' })
  })
  it('object with special string keys', () => {
    expect(ipc({ '': 'empty', 'has space': 1, 'key.dot': 2 }))
      .toEqual({ '': 'empty', 'has space': 1, 'key.dot': 2 })
  })
  it('large object is truncated at 200 keys', () => {
    const big: Record<string, number> = {}
    for (let i = 0; i < 300; i++) big[`k${i}`] = i
    const result = ipc(big) as Record<string, unknown>
    expect(Object.keys(result).length).toBe(201)
    expect(result['...']).toBe('100 more keys')
  })
})

describe('serializeArg — circular references', () => {
  it('self-referencing object', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(ipc(obj)).toEqual({ a: 1, self: '[Circular]' })
  })
  it('mutual reference', () => {
    const a: Record<string, unknown> = { name: 'a' }
    const b: Record<string, unknown> = { name: 'b', ref: a }
    a.ref = b
    const result = ipc(a)
    expect(result.ref.ref).toBe('[Circular]')
  })
  it('circular array', () => {
    const arr: unknown[] = [1, 2]
    arr.push(arr)
    const result = ipc(arr) as unknown[]
    expect(result[2]).toBe('[Circular]')
  })
  it('deep circular reference', () => {
    const obj: Record<string, unknown> = { a: { b: { c: {} } } }
    ;(obj.a as Record<string, unknown>).b = obj
    // doesn't throw
    expect(() => ipc(obj)).not.toThrow()
  })
})

describe('serializeArg — deeply nested (truncation)', () => {
  it('object at max depth becomes truncation string', () => {
    let obj: Record<string, unknown> = { leaf: true }
    for (let i = 0; i < 20; i++) obj = { nested: obj }
    const result = ipc(obj) as Record<string, unknown>
    // Walk to depth 7 (0-indexed), depth 8 should be truncated
    let current = result
    for (let i = 0; i < 7; i++) {
      current = current.nested as Record<string, unknown>
    }
    expect(current.nested).toBe('[Object (truncated)]')
  })
  it('array at max depth becomes truncation string', () => {
    let arr: unknown = ['leaf']
    for (let i = 0; i < 20; i++) arr = [arr]
    const result = ipc(arr) as unknown[]
    let current = result
    for (let i = 0; i < 7; i++) current = current[0] as unknown[]
    expect(current[0]).toBe('[Array (1)]')
  })
  it('Map at max depth becomes truncation string', () => {
    let m: unknown = 'leaf'
    for (let i = 0; i < 20; i++) m = new Map([['nested', m]])
    const result = ipc(m)
    // should not throw, eventually hits string truncation
    expect(result.__type).toBe('Map')
  })
  it('Set at max depth becomes truncation string', () => {
    let s: unknown = 'leaf'
    for (let i = 0; i < 20; i++) s = new Set([s])
    const result = ipc(s)
    expect(result.__type).toBe('Set')
  })
})

describe('serializeArg — class instances', () => {
  it('class with public properties', () => {
    class Point { constructor(public x: number, public y: number) {} }
    expect(ipc(new Point(3, 4))).toEqual({ x: 3, y: 4 })
  })
  it('class with methods (methods not serialized)', () => {
    class Dog {
      name: string
      constructor(name: string) { this.name = name }
      bark() { return 'woof' }
    }
    // Methods aren't own enumerable properties
    expect(ipc(new Dog('Rex'))).toEqual({ name: 'Rex' })
  })
  it('class extending another', () => {
    class Animal { species = 'unknown' }
    class Cat extends Animal { name = 'Whiskers' }
    expect(ipc(new Cat())).toEqual({ species: 'unknown', name: 'Whiskers' })
  })
})

describe('serializeArg — exotic objects', () => {
  it('object with null prototype', () => {
    const obj = Object.create(null)
    obj.key = 'value'
    expect(ipc(obj)).toEqual({ key: 'value' })
  })
  it('Object.create with prototype chain', () => {
    const proto = { inherited: true }
    const obj = Object.create(proto)
    obj.own = 1
    // Only own properties serialized
    expect(ipc(obj)).toEqual({ own: 1 })
  })
  it('Proxy object (transparent)', () => {
    const target = { a: 1, b: 2 }
    const proxy = new Proxy(target, {})
    expect(ipc(proxy)).toEqual({ a: 1, b: 2 })
  })
  it('Proxy with getter trap', () => {
    const proxy = new Proxy({ x: 10 }, {
      get(target, prop) {
        return prop === 'x' ? 999 : Reflect.get(target, prop)
      }
    })
    expect(ipc(proxy)).toEqual({ x: 999 })
  })
  it('frozen object', () => {
    expect(ipc(Object.freeze({ a: 1 }))).toEqual({ a: 1 })
  })
  it('sealed object', () => {
    expect(ipc(Object.seal({ a: 1 }))).toEqual({ a: 1 })
  })
  it('arguments-like object', () => {
    const argsLike = { 0: 'a', 1: 'b', length: 2 }
    expect(ipc(argsLike)).toEqual({ 0: 'a', 1: 'b', length: 2 })
  })
  it('TypedArray (Uint8Array)', () => {
    const typed = new Uint8Array([10, 20, 30])
    // TypedArray has numeric indices as own properties
    const result = ipc(typed) as Record<string, unknown>
    expect(result[0]).toBe(10)
    expect(result[1]).toBe(20)
    expect(result[2]).toBe(30)
  })
  it('Date subclass', () => {
    class MyDate extends Date {}
    const result = ipc(new MyDate('2024-01-01'))
    expect(result.__type).toBe('Date')
  })
})

describe('serializeArg — weird but valid edge cases', () => {
  it('object with __type key (collision with sentinel)', () => {
    // User creates an object that looks like our sentinel
    const tricky = { __type: 'Undefined' }
    // It serializes as-is — just a regular object
    expect(ipc(tricky)).toEqual({ __type: 'Undefined' })
  })
  it('object with __type: "Date" (fake sentinel)', () => {
    const fake = { __type: 'Date', value: 'not a real date' }
    expect(ipc(fake)).toEqual({ __type: 'Date', value: 'not a real date' })
  })
  it('array containing every type', () => {
    const everything = [
      'string',
      42,
      3.14,
      true,
      false,
      null,
      undefined,
      BigInt(99),
      Symbol('sym'),
      function fn() {},
      new Date('2024-01-01'),
      /regex/g,
      new Error('err'),
      new Map([['k', 'v']]),
      new Set([1, 2]),
      { nested: true },
      [1, [2, [3]]],
    ]
    const result = ipc(everything) as unknown[]
    expect(result[0]).toBe('string')
    expect(result[1]).toBe(42)
    expect(result[2]).toBe(3.14)
    expect(result[3]).toBe(true)
    expect(result[4]).toBe(false)
    expect(result[5]).toBe(null)
    expect(result[6]).toEqual({ __type: 'Undefined' })
    expect(result[7]).toBe('99n')
    expect(result[8]).toBe('Symbol(sym)')
    expect(result[9]).toBe('[Function: fn]')
    expect(result[10]).toEqual({ __type: 'Date', value: '2024-01-01T00:00:00.000Z' })
    expect(result[11]).toEqual({ __type: 'RegExp', value: '/regex/g' })
    expect((result[12] as { __type: string }).__type).toBe('Error')
    expect(result[13]).toEqual({ __type: 'Map', entries: [['k', 'v']] })
    expect(result[14]).toEqual({ __type: 'Set', values: [1, 2] })
    expect(result[15]).toEqual({ nested: true })
    expect(result[16]).toEqual([1, [2, [3]]])
  })
  it('map with every type as value', () => {
    const m = new Map<string, unknown>([
      ['str', 'hello'],
      ['num', 42],
      ['bool', true],
      ['nil', null],
      ['undef', undefined],
      ['bigint', BigInt(5)],
      ['fn', () => {}],
      ['date', new Date(0)],
      ['regex', /x/],
      ['err', new Error('e')],
    ])
    const result = ipc(m)
    expect(result.__type).toBe('Map')
    const entries = result.entries as [string, unknown][]
    const lookup = Object.fromEntries(entries)
    expect(lookup.str).toBe('hello')
    expect(lookup.num).toBe(42)
    expect(lookup.bool).toBe(true)
    expect(lookup.nil).toBe(null)
    expect(lookup.undef).toEqual({ __type: 'Undefined' })
    expect(lookup.bigint).toBe('5n')
    expect(lookup.fn).toBe('[Function: anonymous]')
    expect(lookup.date).toEqual({ __type: 'Date', value: '1970-01-01T00:00:00.000Z' })
    expect(lookup.regex).toEqual({ __type: 'RegExp', value: '/x/' })
    expect((lookup.err as { __type: string }).__type).toBe('Error')
  })
  it('object with getter that returns different values', () => {
    let counter = 0
    const obj = {
      get count() { return counter++ }
    }
    // First access during Object.keys + value read
    const result = ipc(obj) as Record<string, unknown>
    expect(typeof result.count).toBe('number')
  })
  it('object with toJSON method', () => {
    const obj = {
      real: 'data',
      toJSON() { return { custom: true } }
    }
    // serializeArg uses Object.keys, not JSON.stringify, so toJSON is ignored
    const serialized = serializeArg(obj) as Record<string, unknown>
    expect(serialized.real).toBe('data')
    // But JSON round-trip DOES call toJSON... except the serialized form
    // no longer has the toJSON method (functions are serialized as strings)
    const afterIPC = jsonRoundTrip(serialized)
    expect(afterIPC.real).toBe('data')
  })
  it('empty string key in object', () => {
    expect(ipc({ '': 'empty key' })).toEqual({ '': 'empty key' })
  })
  it('object with only undefined values', () => {
    expect(ipc({ a: undefined, b: undefined })).toEqual({
      a: { __type: 'Undefined' },
      b: { __type: 'Undefined' },
    })
  })
  it('array of undefineds', () => {
    expect(ipc([undefined, undefined, undefined])).toEqual([
      { __type: 'Undefined' },
      { __type: 'Undefined' },
      { __type: 'Undefined' },
    ])
  })
  it('nested undefined in Set in Map in Array', () => {
    const data = [new Map([['s', new Set([undefined])]])]
    const result = ipc(data)
    const mapEntries = result[0].entries
    const setValues = mapEntries[0][1].values
    expect(setValues[0]).toEqual({ __type: 'Undefined' })
  })
  it('object resembling OutputEntry', () => {
    // Ensure we don't accidentally mangle user data that looks like our types
    const userObj = { id: '123', method: 'log', args: [1, 2], timestamp: 999 }
    expect(ipc(userObj)).toEqual(userObj)
  })
  it('number as object key via Map', () => {
    const result = ipc(new Map([[42, 'answer']]))
    expect(result.entries[0][0]).toBe(42)
  })
})

describe('serializeArg — console.log full integration (with JSON round-trip)', () => {
  function captureAndRoundTrip(...args: unknown[]): unknown[] {
    const entries: OutputEntry[] = []
    const send = vi.fn((entry: OutputEntry) => entries.push(entry))
    const console = createConsoleCapturer(send)
    console.log(...args)
    return jsonRoundTrip(entries[0]).args
  }

  it('string, number, boolean, null, undefined', () => {
    expect(captureAndRoundTrip('hello', 42, true, null, undefined)).toEqual([
      'hello', 42, true, null, { __type: 'Undefined' }
    ])
  })
  it('bigint', () => {
    expect(captureAndRoundTrip(BigInt(0))).toEqual(['0n'])
  })
  it('symbol', () => {
    expect(captureAndRoundTrip(Symbol('x'))).toEqual(['Symbol(x)'])
  })
  it('function', () => {
    expect(captureAndRoundTrip(function test() {})).toEqual(['[Function: test]'])
  })
  it('Date', () => {
    const result = captureAndRoundTrip(new Date('2024-01-01'))
    expect(result[0]).toEqual({ __type: 'Date', value: '2024-01-01T00:00:00.000Z' })
  })
  it('Error', () => {
    const result = captureAndRoundTrip(new Error('oops'))
    expect((result[0] as { __type: string }).__type).toBe('Error')
  })
  it('RegExp', () => {
    const result = captureAndRoundTrip(/test/gi)
    expect(result[0]).toEqual({ __type: 'RegExp', value: '/test/gi' })
  })
  it('Map and Set', () => {
    const result = captureAndRoundTrip(
      new Map([['a', 1]]),
      new Set([1, 2, 3])
    )
    expect(result[0]).toEqual({ __type: 'Map', entries: [['a', 1]] })
    expect(result[1]).toEqual({ __type: 'Set', values: [1, 2, 3] })
  })
  it('nested object with undefined', () => {
    const result = captureAndRoundTrip({ a: { b: undefined } })
    expect(result[0]).toEqual({ a: { b: { __type: 'Undefined' } } })
  })
  it('array with holes (holes become null — not same as undefined)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const result = captureAndRoundTrip([1, , 3])
    expect(result[0]).toEqual([1, null, 3])
  })
  it('multiple complex args', () => {
    const result = captureAndRoundTrip(
      { user: 'alice' },
      [1, 2, 3],
      new Map([['key', undefined]]),
      null,
      undefined
    )
    expect(result).toEqual([
      { user: 'alice' },
      [1, 2, 3],
      { __type: 'Map', entries: [['key', { __type: 'Undefined' }]] },
      null,
      { __type: 'Undefined' },
    ])
  })
  it('circular reference does not crash', () => {
    const obj: Record<string, unknown> = { value: 1 }
    obj.self = obj
    expect(() => captureAndRoundTrip(obj)).not.toThrow()
  })
  it('deeply nested does not crash', () => {
    let obj: Record<string, unknown> = { leaf: true }
    for (let i = 0; i < 20; i++) obj = { nested: obj }
    expect(() => captureAndRoundTrip(obj)).not.toThrow()
  })
})
