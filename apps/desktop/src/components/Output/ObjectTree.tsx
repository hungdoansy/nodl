import { useState, type JSX } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface ObjectTreeProps {
  data: unknown
  depth?: number
  maxDepth?: number
}

const meta: React.CSSProperties = { userSelect: 'none' }

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  string: { color: 'var(--type-string)' },
  number: { color: 'var(--type-number)' },
  boolean: { color: 'var(--type-boolean)' },
  null: { color: 'var(--text-tertiary)' },
  undefined: { color: 'var(--text-tertiary)' },
  function: { color: 'var(--type-function)' },
  symbol: { color: 'var(--type-function)' },
  bigint: { color: 'var(--type-number)' },
}

function getTypeTag(data: unknown): string | null {
  if (data === null || data === undefined) return null
  if (typeof data !== 'object') return null

  const typed = data as { __type?: string }
  if (typed.__type === 'Map') {
    const entries = (data as { entries?: unknown[] }).entries ?? []
    return `Map (${entries.length})`
  }
  if (typed.__type === 'Set') {
    const values = (data as { values?: unknown[] }).values ?? []
    return `Set (${values.length})`
  }
  if (typed.__type === 'Date') return `Date`
  if (typed.__type === 'RegExp') return `RegExp`
  if (typed.__type === 'Error') return `Error`

  if (Array.isArray(data)) return `Array (${data.length})`
  return `Object {${Object.keys(data).length}}`
}

function renderPrimitive(data: unknown): JSX.Element {
  if (data === null) return <span style={TYPE_STYLES.null}>null</span>
  if (data === undefined) return <span style={TYPE_STYLES.undefined}>undefined</span>
  if (typeof data === 'number') return <span style={TYPE_STYLES.number}>{String(data)}</span>
  if (typeof data === 'boolean') return <span style={TYPE_STYLES.boolean}>{String(data)}</span>
  if (typeof data === 'string') {
    if (/^-?\d+n$/.test(data)) return <span style={TYPE_STYLES.bigint}>{data}</span>
    if (data.startsWith('[Function:')) return <span style={TYPE_STYLES.function}>{data}</span>
    if (data.startsWith('Symbol(')) return <span style={TYPE_STYLES.symbol}>{data}</span>
    return <span style={TYPE_STYLES.string}>"{data}"</span>
  }
  return <span>{String(data)}</span>
}

function isExpandable(data: unknown): boolean {
  if (data === null || data === undefined) return false
  if (typeof data !== 'object') return false
  if (data === '[Circular]') return false
  const typed = data as { __type?: string; value?: string }
  if (typed.__type === 'Date' || typed.__type === 'RegExp') return false
  return true
}

function getEntries(data: unknown): [string, unknown][] {
  if (!data || typeof data !== 'object') return []
  const typed = data as { __type?: string }

  if (typed.__type === 'Map') {
    const entries = (data as { entries?: [unknown, unknown][] }).entries ?? []
    return entries.map(([k, v], i) => [`${i}: ${String(k)}`, v])
  }
  if (typed.__type === 'Set') {
    const values = (data as { values?: unknown[] }).values ?? []
    return values.map((v, i) => [String(i), v])
  }
  if (typed.__type === 'Error') {
    const err = data as { message?: string; stack?: string }
    return [
      ['message', err.message],
      ['stack', err.stack]
    ]
  }
  if (Array.isArray(data)) {
    return data.map((v, i) => [String(i), v])
  }
  return Object.entries(data)
}

const PAGE_SIZE = 5
const PAGE_INCREMENT = 10

const chevronStyle: React.CSSProperties = {
  color: 'var(--text-tertiary)',
  flexShrink: 0,
  transition: 'transform 150ms ease',
}

const paginationBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '1px 4px',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85em',
  color: 'var(--text-tertiary)',
  borderRadius: 3,
}

export function ObjectTree({ data, depth = 0, maxDepth = 10 }: ObjectTreeProps) {
  const [expanded, setExpanded] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  if (data === '[Circular]') {
    return <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', ...meta }}>[Circular]</span>
  }

  // Special serialized types with direct display
  if (typeof data === 'object' && data !== null) {
    const typed = data as { __type?: string; value?: string; message?: string; stack?: string }
    if (typed.__type === 'Undefined') return <span style={TYPE_STYLES.undefined}>undefined</span>
    if (typed.__type === 'Date') return <span style={TYPE_STYLES.number}>{typed.value}</span>
    if (typed.__type === 'RegExp') return <span style={{ color: 'var(--type-regexp)' }}>{typed.value}</span>
  }

  if (!isExpandable(data)) {
    return renderPrimitive(data)
  }

  const tag = getTypeTag(data)
  const entries = getEntries(data)

  if (depth >= maxDepth) {
    return <span style={{ color: 'var(--text-tertiary)', ...meta }}>{tag}</span>
  }

  const toggleStyle: React.CSSProperties = {
    cursor: 'pointer', borderRadius: 3, padding: '0 2px',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    verticalAlign: 'top',
    ...meta,
  }

  const Root = expanded ? 'div' : 'span'

  return (
    <Root>
      <span
        style={toggleStyle}
        onClick={() => { setExpanded(!expanded); if (expanded) setVisibleCount(PAGE_SIZE) }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ ...chevronStyle, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight size={12} />
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>{tag}</span>
      </span>
      {expanded && (() => {
        const visibleEntries = entries.slice(0, visibleCount)
        const remaining = entries.length - visibleCount
        return (
          <div style={{ marginLeft: 16, borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8 }}>
            {visibleEntries.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0, ...meta }}>{key}:</span>
                <ObjectTree data={value} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
            {remaining > 0 && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 2, ...meta }}>
                <button
                  style={paginationBtnStyle}
                  onClick={() => setVisibleCount((c) => c + PAGE_INCREMENT)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                >
                  {remaining} more…
                </button>
                <button
                  style={paginationBtnStyle}
                  onClick={() => setVisibleCount(entries.length)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                >
                  Show all
                </button>
              </div>
            )}
          </div>
        )
      })()}
    </Root>
  )
}
