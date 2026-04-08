import { useEffect, useRef, useMemo } from 'react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useTabsStore } from '../../store/tabs'
import { ConsoleEntryComponent } from './ConsoleEntry'
import { PackageList } from '../Packages/PackageList'
import { useSettingsStore } from '../../store/settings'
import type { OutputEntry } from '../../../shared/types'

function getEditorLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.35)
}

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
  const editorPaddingTop = 12

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-2 px-3 py-1.5">
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Output
        </span>

        {isRunning && (
          <>
            <div
              className="w-3 h-3 rounded-full border-[1.5px] border-t-transparent animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            <button onClick={stop} className="btn btn-danger" style={{ padding: '3px 8px' }}>
              Stop
            </button>
          </>
        )}

        <div className="flex-1" />

        <button onClick={clear} className="btn btn-secondary" style={{ padding: '3px 8px' }}>
          Clear
        </button>
      </div>

      {/* Output content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {entries.length === 0 && !isRunning && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px]">Run your code to see output</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              Cmd+Enter
            </span>
          </div>
        )}
        {entries.length === 0 && isRunning && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            <span className="text-[12px]">Running...</span>
          </div>
        )}
        {entries.length > 0 && (
          <div className="relative" style={{ paddingTop: editorPaddingTop }}>
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
                      <ConsoleEntryComponent key={entry.id} entry={entry} compact fontSize={fontSize} />
                    ))}
                  </div>
                </div>
              )
            })}
            {unlined.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
                {unlined.map((entry) => (
                  <ConsoleEntryComponent key={entry.id} entry={entry} fontSize={fontSize} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      {lastResult && (
        <div
          className="px-3 py-1 text-[11px]"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: lastResult.success ? 'var(--text-muted)' : '#f87171',
          }}
        >
          <span style={{ color: lastResult.success ? 'var(--accent)' : '#f87171' }}>
            {lastResult.success ? '✓' : '✗'}
          </span>
          {' '}Ran in {lastResult.duration}ms
        </div>
      )}
      <PackageList />
    </div>
  )
}
