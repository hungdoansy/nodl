import type { ConsoleMethod, OutputEntry } from '../../../shared/types'

let counter = 0

function generateId(): string {
  return `entry-${Date.now()}-${counter++}`
}

const MAX_DEPTH = 8
const MAX_ARRAY_ITEMS = 1000
const MAX_OBJECT_KEYS = 200

export function serializeArg(arg: unknown, seen = new WeakSet(), depth = 0): unknown {
  if (arg === null) return arg
  if (arg === undefined) return { __type: 'Undefined' }
  if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`
  if (typeof arg === 'symbol') return arg.toString()
  if (typeof arg === 'bigint') return `${arg}n`
  if (arg instanceof Error) {
    return { __type: 'Error', message: arg.message, stack: arg.stack }
  }
  if (arg instanceof Date) return { __type: 'Date', value: arg.toISOString() }
  if (arg instanceof RegExp) return { __type: 'RegExp', value: arg.toString() }
  if (arg instanceof Map) {
    if (depth >= MAX_DEPTH) return '[Map (truncated)]'
    return { __type: 'Map', entries: Array.from(arg.entries()).slice(0, MAX_ARRAY_ITEMS).map(([k, v]) => [serializeArg(k, seen, depth + 1), serializeArg(v, seen, depth + 1)]) }
  }
  if (arg instanceof Set) {
    if (depth >= MAX_DEPTH) return '[Set (truncated)]'
    return { __type: 'Set', values: Array.from(arg.values()).slice(0, MAX_ARRAY_ITEMS).map(v => serializeArg(v, seen, depth + 1)) }
  }

  if (typeof arg === 'object') {
    if (seen.has(arg as object)) return '[Circular]'
    seen.add(arg as object)

    if (depth >= MAX_DEPTH) return Array.isArray(arg) ? `[Array (${arg.length})]` : '[Object (truncated)]'

    if (Array.isArray(arg)) {
      const truncated = arg.length > MAX_ARRAY_ITEMS
      const items = arg.slice(0, MAX_ARRAY_ITEMS).map((item) => serializeArg(item, seen, depth + 1))
      if (truncated) items.push(`... ${arg.length - MAX_ARRAY_ITEMS} more items`)
      return items
    }

    const keys = Object.keys(arg as object)
    const truncated = keys.length > MAX_OBJECT_KEYS
    const result: Record<string, unknown> = {}
    for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
      result[key] = serializeArg((arg as Record<string, unknown>)[key], seen, depth + 1)
    }
    if (truncated) result['...'] = `${keys.length - MAX_OBJECT_KEYS} more keys`
    return result
  }

  return arg
}

export function createConsoleCapturer(send: (entry: OutputEntry) => void) {
  const passthrough: ConsoleMethod[] = ['log', 'warn', 'error', 'info', 'debug', 'table', 'dir']

  const consoleObj: Record<string, (...args: unknown[]) => void> = {}

  // Standard methods: serialize args and send
  for (const method of passthrough) {
    consoleObj[method] = (...args: unknown[]) => {
      const seen = new WeakSet()
      send({
        id: generateId(),
        method,
        args: args.map((a) => serializeArg(a, seen)),
        timestamp: Date.now()
      })
    }
  }

  // console.clear — no args
  consoleObj.clear = () => {
    send({ id: generateId(), method: 'clear', args: [], timestamp: Date.now() })
  }

  // console.assert(condition, ...args) — only outputs if condition is falsy
  consoleObj.assert = (condition: unknown, ...args: unknown[]) => {
    if (!condition) {
      const seen = new WeakSet()
      const msg = args.length > 0 ? args.map((a) => serializeArg(a, seen)) : ['Assertion failed']
      send({ id: generateId(), method: 'error', args: msg, timestamp: Date.now() })
    }
  }

  // console.time / console.timeEnd
  const timers = new Map<string, number>()
  consoleObj.time = (label = 'default') => {
    timers.set(String(label), Date.now())
  }
  consoleObj.timeEnd = (label = 'default') => {
    const key = String(label)
    const start = timers.get(key)
    if (start !== undefined) {
      const ms = Date.now() - start
      timers.delete(key)
      send({ id: generateId(), method: 'log', args: [`${key}: ${ms}ms`], timestamp: Date.now() })
    }
  }

  // console.count / console.countReset
  const counters = new Map<string, number>()
  consoleObj.count = (label = 'default') => {
    const key = String(label)
    const val = (counters.get(key) ?? 0) + 1
    counters.set(key, val)
    send({ id: generateId(), method: 'log', args: [`${key}: ${val}`], timestamp: Date.now() })
  }
  consoleObj.countReset = (label = 'default') => {
    counters.delete(String(label))
  }

  // console.trace — log with stack trace
  consoleObj.trace = (...args: unknown[]) => {
    const stack = new Error().stack?.split('\n').slice(2).join('\n') ?? ''
    const seen = new WeakSet()
    send({
      id: generateId(),
      method: 'log',
      args: [...args.map((a) => serializeArg(a, seen)), `\n${stack}`],
      timestamp: Date.now()
    })
  }

  // console.group / console.groupEnd — output as log (no visual nesting in our output panel)
  consoleObj.group = (...args: unknown[]) => {
    if (args.length > 0) {
      const seen = new WeakSet()
      send({ id: generateId(), method: 'log', args: args.map((a) => serializeArg(a, seen)), timestamp: Date.now() })
    }
  }
  consoleObj.groupEnd = () => { /* no-op — no visual nesting support yet */ }

  return consoleObj
}
