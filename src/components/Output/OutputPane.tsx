import { useEffect, useRef, useMemo } from 'react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useTabsStore } from '../../store/tabs'
import { ConsoleEntryComponent } from './ConsoleEntry'
import { PackageList } from '../Packages/PackageList'
import { useSettingsStore } from '../../store/settings'
import type { OutputEntry } from '../../../shared/types'

/** Line height in the Monaco editor (matches fontSize + line spacing) */
function getEditorLineHeight(fontSize: number): number {
  // Monaco default lineHeight is ~1.35x fontSize, rounded
  return Math.round(fontSize * 1.35)
}

/**
 * Group entries by their source line. Entries without a line go into a
 * "floating" group rendered after all line-aligned entries.
 */
function groupByLine(entries: OutputEntry[]): { lined: Map<number, OutputEntry[]>; unlined: OutputEntry[] } {
  const lined = new Map<number, OutputEntry[]>()
  const unlined: OutputEntry[] = []
  for (const entry of entries) {
    if (entry.line) {
      const group = lined.get(entry.line) ?? []
      group.push(entry)
      lined.set(entry.line, group)
    } else {
      unlined.push(entry)
    }
  }
  return { lined, unlined }
}

export function OutputPane() {
  const { entries, isRunning, lastResult, stop, clear } = useCodeExecution()
  const scrollRef = useRef<HTMLDivElement>(null)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const activeTab = useTabsStore((s) => s.activeTab)
  const tab = activeTab()
  const totalLines = useMemo(() => tab.code.split('\n').length, [tab.code])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const lineHeight = getEditorLineHeight(fontSize)
  const { lined, unlined } = useMemo(() => groupByLine(entries), [entries])

  // Editor has 12px top padding
  const editorPaddingTop = 12

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs font-medium text-zinc-400">Output</span>
        {isRunning && (
          <>
            <span className="inline-block w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <button
              onClick={stop}
              className="px-2 py-0.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              ■ Stop
            </button>
          </>
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
        {entries.length === 0 && isRunning && (
          <div className="flex items-center justify-center h-full gap-2 text-zinc-500 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            Running...
          </div>
        )}
        {entries.length > 0 && (
          <div className="relative" style={{ paddingTop: editorPaddingTop }}>
            {/* Line-aligned entries */}
            {Array.from({ length: totalLines }, (_, i) => {
              const lineNum = i + 1
              const lineEntries = lined.get(lineNum)
              if (!lineEntries) {
                return <div key={`line-${lineNum}`} style={{ height: lineHeight }} />
              }
              return (
                <div key={`line-${lineNum}`} style={{ minHeight: lineHeight }} className="flex items-start">
                  <div className="flex-1 min-w-0">
                    {lineEntries.map((entry) => (
                      <ConsoleEntryComponent key={entry.id} entry={entry} compact />
                    ))}
                  </div>
                </div>
              )
            })}
            {/* Unlined entries (e.g. errors without line info) */}
            {unlined.length > 0 && (
              <div className="border-t border-zinc-800/50 mt-1">
                {unlined.map((entry) => (
                  <ConsoleEntryComponent key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {lastResult && (
        <div className={`px-3 py-1 bg-zinc-800/50 border-t border-zinc-700 text-xs ${
          lastResult.success ? 'text-zinc-500' : 'text-red-400'
        }`}>
          {lastResult.success ? '✓' : '✗'} Ran in {lastResult.duration}ms
        </div>
      )}
      <PackageList />
    </div>
  )
}
