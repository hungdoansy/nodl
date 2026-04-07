import type { ConsoleMethod, OutputEntry } from '../../../shared/types'

let counter = 0

function generateId(): string {
  return `entry-${Date.now()}-${counter++}`
}

function serializeArg(arg: unknown, seen = new WeakSet()): unknown {
  if (arg === null || arg === undefined) return arg
  if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`
  if (typeof arg === 'symbol') return arg.toString()
  if (typeof arg === 'bigint') return `${arg}n`
  if (arg instanceof Error) {
    return { __type: 'Error', message: arg.message, stack: arg.stack }
  }
  if (arg instanceof Date) return { __type: 'Date', value: arg.toISOString() }
  if (arg instanceof RegExp) return { __type: 'RegExp', value: arg.toString() }
  if (arg instanceof Map) return { __type: 'Map', entries: Array.from(arg.entries()) }
  if (arg instanceof Set) return { __type: 'Set', values: Array.from(arg.values()) }

  if (typeof arg === 'object') {
    if (seen.has(arg as object)) return '[Circular]'
    seen.add(arg as object)

    if (Array.isArray(arg)) {
      return arg.map((item) => serializeArg(item, seen))
    }

    const result: Record<string, unknown> = {}
    for (const key of Object.keys(arg as object)) {
      result[key] = serializeArg((arg as Record<string, unknown>)[key], seen)
    }
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
