import type { OutputEntry } from '../../../shared/types'

const METHOD_STYLES: Record<string, string> = {
  log: 'text-zinc-200',
  info: 'text-blue-400',
  warn: 'text-yellow-400 bg-yellow-400/5',
  error: 'text-red-400 bg-red-400/5',
  debug: 'text-zinc-400',
  table: 'text-zinc-200'
}

function formatArg(arg: unknown): string {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'string') return arg
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
  if (typeof arg === 'object' && arg !== null) {
    const typed = arg as { __type?: string; message?: string; stack?: string; value?: string }
    if (typed.__type === 'Error') return `${typed.message}\n${typed.stack ?? ''}`
    if (typed.__type === 'Date') return typed.value ?? ''
    if (typed.__type === 'RegExp') return typed.value ?? ''
  }
  try {
    return JSON.stringify(arg, null, 2)
  } catch {
    return String(arg)
  }
}

interface Props {
  entry: OutputEntry
}

export function ConsoleEntryComponent({ entry }: Props) {
  const style = METHOD_STYLES[entry.method] ?? 'text-zinc-200'

  return (
    <div className={`px-3 py-1 border-b border-zinc-800/50 font-mono text-xs leading-relaxed ${style}`}>
      {entry.args.map((arg, i) => (
        <span key={i} className={i > 0 ? 'ml-2' : ''}>
          {formatArg(arg)}
        </span>
      ))}
    </div>
  )
}
