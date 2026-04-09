import type { ConsoleMethod, OutputEntry } from '../../../shared/types'

let counter = 0

function generateId(): string {
  return `entry-${Date.now()}-${counter++}`
}

const MAX_DEPTH = 8
const MAX_ARRAY_ITEMS = 1000
const MAX_OBJECT_KEYS = 200

export function serializeArg(arg: unknown, seen = new WeakSet(), depth = 0): unknown {
  if (arg === null || arg === undefined) return arg
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
  const methods: ConsoleMethod[] = ['log', 'warn', 'error', 'info', 'debug', 'table', 'clear']

  const consoleObj: Record<string, (...args: unknown[]) => void> = {}

  for (const method of methods) {
    consoleObj[method] = (...args: unknown[]) => {
      const entry: OutputEntry = {
        id: generateId(),
        method,
        args: method === 'clear' ? [] : args.map((a) => serializeArg(a)),
        timestamp: Date.now()
      }
      send(entry)
    }
  }

  return consoleObj
}
