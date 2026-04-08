import { useState } from 'react'

interface ObjectTreeProps {
  data: unknown
  depth?: number
  maxDepth?: number
}

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  string: { color: '#a5d6a7' },
  number: { color: '#90caf9' },
  boolean: { color: '#ce93d8' },
  null: { color: 'var(--text-tertiary)' },
  undefined: { color: 'var(--text-tertiary)' },
  function: { color: '#ffe082' },
  symbol: { color: '#ffe082' },
  bigint: { color: '#90caf9' },
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
  if (typeof data === 'string') return <span style={TYPE_STYLES.string}>"{data}"</span>
  if (typeof data === 'number') return <span style={TYPE_STYLES.number}>{String(data)}</span>
  if (typeof data === 'boolean') return <span style={TYPE_STYLES.boolean}>{String(data)}</span>
  if (typeof data === 'string' && data.startsWith('[Function:'))
    return <span style={TYPE_STYLES.function}>{data}</span>
  if (typeof data === 'string' && data.startsWith('Symbol('))
    return <span style={TYPE_STYLES.symbol}>{data}</span>
  if (typeof data === 'string' && data.endsWith('n'))
    return <span style={TYPE_STYLES.bigint}>{data}</span>
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

export function ObjectTree({ data, depth = 0, maxDepth = 10 }: ObjectTreeProps) {
  const [expanded, setExpanded] = useState(false)

  if (data === '[Circular]') {
    return <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>[Circular]</span>
  }

  // Special serialized types with direct display
  if (typeof data === 'object' && data !== null) {
    const typed = data as { __type?: string; value?: string; message?: string; stack?: string }
    if (typed.__type === 'Date') return <span style={TYPE_STYLES.number}>{typed.value}</span>
    if (typed.__type === 'RegExp') return <span style={{ color: '#ef9a9a' }}>{typed.value}</span>
  }

  if (!isExpandable(data)) {
    return renderPrimitive(data)
  }

  const tag = getTypeTag(data)
  const entries = getEntries(data)

  if (depth >= maxDepth) {
    return <span style={{ color: 'var(--text-tertiary)' }}>{tag}</span>
  }

  if (!expanded) {
    return (
      <span
        style={{ cursor: 'pointer', borderRadius: 3, padding: '0 2px' }}
        onClick={() => setExpanded(true)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ color: 'var(--text-tertiary)', marginRight: 4, fontSize: '0.8em' }}>&#9654;</span>
        <span style={{ color: 'var(--text-secondary)' }}>{tag}</span>
      </span>
    )
  }

  return (
    <div>
      <span
        style={{ cursor: 'pointer', borderRadius: 3, padding: '0 2px' }}
        onClick={() => setExpanded(false)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ color: 'var(--text-tertiary)', marginRight: 4, fontSize: '0.8em' }}>&#9660;</span>
        <span style={{ color: 'var(--text-secondary)' }}>{tag}</span>
      </span>
      <div style={{ marginLeft: 16, borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{key}:</span>
            <ObjectTree data={value} depth={depth + 1} maxDepth={maxDepth} />
          </div>
        ))}
      </div>
    </div>
  )
}
