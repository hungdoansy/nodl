import { useEffect, useRef } from 'react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { ConsoleEntryComponent } from './ConsoleEntry'
import { PackageList } from '../Packages/PackageList'

export function OutputPane() {
  const { entries, isRunning, lastResult, stop, clear } = useCodeExecution()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs font-medium text-zinc-400">Output</span>
        {isRunning && (
          <button
            onClick={stop}
            className="px-2 py-0.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            ■ Stop
          </button>
        )}
        <button
          onClick={clear}
          className="px-2 py-0.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors ml-auto"
        >
          Clear
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {entries.length === 0 && !isRunning && (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Run your code to see output here
          </div>
        )}
        {entries.map((entry) => (
          <ConsoleEntryComponent key={entry.id} entry={entry} />
        ))}
      </div>
      {lastResult && (
        <div className="px-3 py-1 bg-zinc-800/50 border-t border-zinc-700 text-xs text-zinc-500">
          {lastResult.success ? '✓' : '✗'} Ran in {lastResult.duration}ms
        </div>
      )}
      <PackageList />
    </div>
  )
}
