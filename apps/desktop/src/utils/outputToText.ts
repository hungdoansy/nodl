import type { OutputEntry } from '../../shared/types'

/** Stringify a single arg from an OutputEntry — matches the console-ish
 * rendering used by the output pane so Cmd+Shift+C returns what users see. */
function stringifyArg(arg: unknown): string {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'string') return arg
  if (typeof arg !== 'object') return String(arg)

  const typed = arg as {
    __type?: string
    value?: unknown
    message?: string
    stack?: string
    entries?: unknown[]
    values?: unknown[]
  }
  if (typed.__type === 'Undefined') return 'undefined'
  if (typed.__type === 'LastExpression') return stringifyArg(typed.value)
  if (typed.__type === 'Error') return typed.stack ? `${typed.message}\n${typed.stack}` : typed.message ?? 'Error'
  if (typed.__type === 'Date' || typed.__type === 'RegExp') return String(typed.value)
  if (typed.__type === 'Map') return `Map(${(typed.entries ?? []).length})`
  if (typed.__type === 'Set') return `Set(${(typed.values ?? []).length})`
  try { return JSON.stringify(arg, null, 2) } catch { return String(arg) }
}

/** Render all entries as a newline-joined text block, annotating error/
 * warn/info methods with a prefix. Used by the Copy output action. */
export function entriesToText(entries: OutputEntry[]): string {
  return entries.map((entry) => {
    const prefix = entry.method === 'error' ? '[error] '
      : entry.method === 'warn' ? '[warn] '
      : entry.method === 'info' ? '[info] '
      : ''
    return prefix + entry.args.map(stringifyArg).join(' ')
  }).join('\n')
}
