import { useState } from 'react'

interface ObjectTreeProps {
  data: unknown
  depth?: number
  maxDepth?: number
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-green-400',
  number: 'text-blue-400',
  boolean: 'text-purple-400',
  null: 'text-zinc-500',
  undefined: 'text-zinc-500',
  function: 'text-yellow-400',
  symbol: 'text-yellow-400',
  bigint: 'text-blue-400'
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
  if (data === null) return <span className={TYPE_COLORS.null}>null</span>
  if (data === undefined) return <span className={TYPE_COLORS.undefined}>undefined</span>
  if (typeof data === 'string') return <span className={TYPE_COLORS.string}>"{data}"</span>
  if (typeof data === 'number') return <span className={TYPE_COLORS.number}>{String(data)}</span>
  if (typeof data === 'boolean') return <span className={TYPE_COLORS.boolean}>{String(data)}</span>
  if (typeof data === 'string' && data.startsWith('[Function:'))
    return <span className={TYPE_COLORS.function}>{data}</span>
  if (typeof data === 'string' && data.startsWith('Symbol('))
    return <span className={TYPE_COLORS.symbol}>{data}</span>
  if (typeof data === 'string' && data.endsWith('n'))
    return <span className={TYPE_COLORS.bigint}>{data}</span>
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
    return <span className="text-zinc-500 italic">[Circular]</span>
  }

  // Special serialized types with direct display
  if (typeof data === 'object' && data !== null) {
    const typed = data as { __type?: string; value?: string; message?: string; stack?: string }
    if (typed.__type === 'Date') return <span className="text-blue-300">{typed.value}</span>
    if (typed.__type === 'RegExp') return <span className="text-red-300">{typed.value}</span>
  }

  if (!isExpandable(data)) {
    return renderPrimitive(data)
  }

  const tag = getTypeTag(data)
  const entries = getEntries(data)

  if (depth >= maxDepth) {
    return <span className="text-zinc-500">{tag}</span>
  }

  if (!expanded) {
    return (
      <span
        className="cursor-pointer hover:bg-zinc-800 rounded px-0.5"
        onClick={() => setExpanded(true)}
      >
        <span className="text-zinc-500 mr-1">▶</span>
        <span className="text-zinc-400">{tag}</span>
      </span>
    )
  }

  return (
    <div>
      <span
        className="cursor-pointer hover:bg-zinc-800 rounded px-0.5"
        onClick={() => setExpanded(false)}
      >
        <span className="text-zinc-500 mr-1">▼</span>
        <span className="text-zinc-400">{tag}</span>
      </span>
      <div className="ml-4 border-l border-zinc-700 pl-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-1">
            <span className="text-purple-300 shrink-0">{key}:</span>
            <ObjectTree data={value} depth={depth + 1} maxDepth={maxDepth} />
          </div>
        ))}
      </div>
    </div>
  )
}
