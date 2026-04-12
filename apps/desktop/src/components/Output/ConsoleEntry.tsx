import type { JSX } from 'react'
import type { OutputEntry } from '../../../shared/types'
import { ObjectTree } from './ObjectTree'
import { ConsoleTable } from './ConsoleTable'
import { ArrowLeft } from 'lucide-react'

const METHOD_COLORS: Record<string, string> = {
  log: 'var(--text-primary)',
  info: 'var(--info)',
  warn: 'var(--warn)',
  error: 'var(--danger)',
  debug: 'var(--text-tertiary)',
  table: 'var(--text-primary)'
}

function isLastExpression(arg: unknown): arg is { __type: 'LastExpression'; value: unknown } {
  return typeof arg === 'object' && arg !== null && (arg as { __type?: string }).__type === 'LastExpression'
}

function isPrimitive(arg: unknown): boolean {
  return arg === null || arg === undefined || typeof arg !== 'object'
}

function renderTypedPrimitive(arg: unknown): JSX.Element {
  if (arg === null) return <span style={{ color: 'var(--text-tertiary)' }}>null</span>
  if (arg === undefined) return <span style={{ color: 'var(--text-tertiary)' }}>undefined</span>
  if (typeof arg === 'number') return <span style={{ color: 'var(--type-number)' }}>{String(arg)}</span>
  if (typeof arg === 'boolean') return <span style={{ color: 'var(--type-boolean)' }}>{String(arg)}</span>
  if (typeof arg === 'string') {
    if (/^-?\d+n$/.test(arg)) return <span style={{ color: 'var(--type-number)' }}>{arg}</span>
    if (arg.startsWith('[Function:')) return <span style={{ color: 'var(--type-function)' }}>{arg}</span>
    if (arg.startsWith('Symbol(')) return <span style={{ color: 'var(--type-function)' }}>{arg}</span>
    return <span style={{ color: 'var(--type-string)' }}>"{arg}"</span>
  }
  return <span>{String(arg)}</span>
}

function isErrorType(arg: unknown): arg is { __type: 'Error'; message: string; stack?: string } {
  return typeof arg === 'object' && arg !== null && (arg as { __type?: string }).__type === 'Error'
}

interface Props {
  entry: OutputEntry
  compact?: boolean
  fontSize?: number
  lineHeight?: number
}

export function ConsoleEntryComponent({ entry, compact, fontSize, lineHeight }: Props) {
  const fontStyle: React.CSSProperties = {
    fontSize: fontSize ? `${fontSize}px` : '13px',
    fontFamily: 'var(--font-mono)',
    lineHeight: lineHeight ? `${lineHeight}px` : '1.5',
    padding: compact ? '0 8px' : '2px 12px',
    borderBottom: compact ? 'none' : '1px solid var(--border-subtle)',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  }

  if (entry.method === 'table' && entry.args.length > 0) {
    return <div style={fontStyle}><ConsoleTable data={entry.args[0]} /></div>
  }

  const firstArg = entry.args[0]
  if (isLastExpression(firstArg)) {
    return (
      <div style={{ ...fontStyle, color: 'var(--text-tertiary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 2px' }}>
          <ArrowLeft size={12} style={{ color: 'var(--accent)', opacity: 0.4, flexShrink: 0 }} />
          {isPrimitive(firstArg.value) ? (
            renderTypedPrimitive(firstArg.value)
          ) : (
            <ObjectTree data={firstArg.value} />
          )}
        </span>
      </div>
    )
  }

  const color = METHOD_COLORS[entry.method] ?? 'var(--text-primary)'

  return (
    <div style={{ ...fontStyle, color }}>
      {entry.args.map((arg, i) => (
        <span key={i} style={i > 0 ? { marginLeft: 8 } : undefined}>
          {isErrorType(arg) ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{arg.message}{arg.stack ? `\n${arg.stack}` : ''}</span>
          ) : isPrimitive(arg) ? (
            renderTypedPrimitive(arg)
          ) : (
            <ObjectTree data={arg} />
          )}
        </span>
      ))}
    </div>
  )
}
