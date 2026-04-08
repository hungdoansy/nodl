import type { OutputEntry } from '../../../shared/types'
import { ObjectTree } from './ObjectTree'
import { ConsoleTable } from './ConsoleTable'

const METHOD_COLORS: Record<string, string> = {
  log: 'var(--text-primary)',
  info: '#60a5fa',
  warn: '#fbbf24',
  error: '#f87171',
  debug: 'var(--text-muted)',
  table: 'var(--text-primary)'
}

const METHOD_BG: Record<string, string | undefined> = {
  warn: 'rgba(251, 191, 36, 0.04)',
  error: 'rgba(248, 113, 113, 0.04)',
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
  fontSize?: number
}

export function ConsoleEntryComponent({ entry, compact, fontSize }: Props) {
  const pad = compact ? '0 8px' : '2px 12px'
  const border = compact ? 'none' : '1px solid var(--border-subtle)'
  const fontStyle = {
    fontSize: fontSize ? `${fontSize}px` : '13px',
    fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
    lineHeight: 1.5,
    padding: pad,
    borderBottom: border,
  }

  // Handle console.table
  if (entry.method === 'table' && entry.args.length > 0) {
    return (
      <div style={fontStyle}>
        <ConsoleTable data={entry.args[0]} />
      </div>
    )
  }

  // Handle expression results
  const firstArg = entry.args[0]
  if (isLastExpression(firstArg)) {
    return (
      <div style={{ ...fontStyle, color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--text-muted)', marginRight: 6, opacity: 0.5 }}>←</span>
        {isPrimitive(firstArg.value) ? (
          <span style={{ color: 'var(--accent)' }}>{formatPrimitive(firstArg.value)}</span>
        ) : (
          <ObjectTree data={firstArg.value} />
        )}
      </div>
    )
  }

  const color = METHOD_COLORS[entry.method] ?? 'var(--text-primary)'
  const bg = METHOD_BG[entry.method]

  return (
    <div style={{ ...fontStyle, color, background: bg }}>
      {entry.args.map((arg, i) => (
        <span key={i} style={i > 0 ? { marginLeft: 8 } : undefined}>
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
