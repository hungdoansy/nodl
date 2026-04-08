import type { OutputEntry } from '../../../shared/types'
import { ObjectTree } from './ObjectTree'
import { ConsoleTable } from './ConsoleTable'

const METHOD_STYLES: Record<string, string> = {
  log: 'text-zinc-200',
  info: 'text-blue-400',
  warn: 'text-yellow-400 bg-yellow-400/5',
  error: 'text-red-400 bg-red-400/5',
  debug: 'text-zinc-400',
  table: 'text-zinc-200'
}

function isLastExpression(arg: unknown): arg is { __type: 'LastExpression'; value: unknown } {
  return typeof arg === 'object' && arg !== null && (arg as { __type?: string }).__type === 'LastExpression'
}

function isPrimitive(arg: unknown): boolean {
  return arg === null || arg === undefined || typeof arg !== 'object'
}

function formatPrimitive(arg: unknown): string {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'string') return arg
  return String(arg)
}

function isErrorType(arg: unknown): arg is { __type: 'Error'; message: string; stack?: string } {
  return typeof arg === 'object' && arg !== null && (arg as { __type?: string }).__type === 'Error'
}

interface Props {
  entry: OutputEntry
  compact?: boolean
}

export function ConsoleEntryComponent({ entry, compact }: Props) {
  const padding = compact ? 'px-2 py-0' : 'px-3 py-1'
  const border = compact ? '' : 'border-b border-zinc-800/50'

  // Handle console.table
  if (entry.method === 'table' && entry.args.length > 0) {
    return (
      <div className={`${padding} ${border} font-mono text-xs leading-relaxed`}>
        <ConsoleTable data={entry.args[0]} />
      </div>
    )
  }

  // Handle last expression result
  const firstArg = entry.args[0]
  if (isLastExpression(firstArg)) {
    return (
      <div className={`${padding} ${border} font-mono text-xs leading-relaxed text-zinc-500`}>
        <span className="mr-1 text-zinc-600">←</span>
        {isPrimitive(firstArg.value) ? (
          <span className="text-emerald-400/80">{formatPrimitive(firstArg.value)}</span>
        ) : (
          <ObjectTree data={firstArg.value} />
        )}
      </div>
    )
  }

  const style = METHOD_STYLES[entry.method] ?? 'text-zinc-200'

  return (
    <div className={`${padding} ${border} font-mono text-xs leading-relaxed ${style}`}>
      {entry.args.map((arg, i) => (
        <span key={i} className={i > 0 ? 'ml-2' : ''}>
          {isErrorType(arg) ? (
            <span>{arg.message}{arg.stack ? `\n${arg.stack}` : ''}</span>
          ) : isPrimitive(arg) ? (
            <span>{formatPrimitive(arg)}</span>
          ) : (
            <ObjectTree data={arg} />
          )}
        </span>
      ))}
    </div>
  )
}
