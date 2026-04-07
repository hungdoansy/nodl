interface ConsoleTableProps {
  data: unknown
}

export function ConsoleTable({ data }: ConsoleTableProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return <span className="text-zinc-500">Empty table</span>
  }

  const allKeys = new Set<string>()
  for (const row of data) {
    if (row && typeof row === 'object') {
      for (const key of Object.keys(row as object)) {
        allKeys.add(key)
      }
    }
  }
  const columns = Array.from(allKeys)

  if (columns.length === 0) {
    return <span className="text-zinc-500">Empty table</span>
  }

  return (
    <table className="text-xs border-collapse my-1">
      <thead>
        <tr>
          <th className="px-2 py-0.5 text-left text-zinc-500 border border-zinc-700 bg-zinc-800">
            (index)
          </th>
          {columns.map((col) => (
            <th
              key={col}
              className="px-2 py-0.5 text-left text-zinc-400 border border-zinc-700 bg-zinc-800"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td className="px-2 py-0.5 text-zinc-500 border border-zinc-700">{i}</td>
            {columns.map((col) => {
              const val = row && typeof row === 'object' ? (row as Record<string, unknown>)[col] : undefined
              return (
                <td key={col} className="px-2 py-0.5 border border-zinc-700">
                  {val === undefined ? '' : String(val)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
