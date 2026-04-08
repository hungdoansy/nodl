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
      <div className="toolbar flex items-center gap-2 px-3 py-1">
        <span style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span style={{ color: 'var(--accent)', opacity: 0.4 }}>&gt;</span> output
        </span>

        {isRunning && (
          <>
            <span className="animate-blink" style={{ color: 'var(--accent)', fontSize: 8 }}>●</span>
            <button onClick={stop} className="btn btn-danger" style={{ padding: '2px 8px' }}>
              HALT
            </button>
          </>
        )}

        <div className="flex-1" />

        <button onClick={clear} className="btn" style={{ padding: '2px 8px' }}>
          CLR
        </button>
      </div>

      {/* Output content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {entries.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div style={{ color: 'var(--text-tertiary)', opacity: 0.3, fontSize: 32, fontWeight: 300 }}>
              {'{ }'}
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
              awaiting input...
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10, opacity: 0.4 }}>
              <span style={{ color: 'var(--accent)', opacity: 0.6 }}>[</span>
              {' '}cmd+enter{' '}
              <span style={{ color: 'var(--accent)', opacity: 0.6 }}>]</span>
            </span>
          </div>
        )}
        {entries.length === 0 && isRunning && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <span className="animate-blink" style={{ color: 'var(--accent)' }}>●</span>
            <span style={{ fontSize: 11 }}>executing...</span>
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
              <div style={{ borderTop: '1px solid var(--border-default)', marginTop: 4 }}>
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
          className="px-3 py-1"
          style={{
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
            fontSize: 10,
            color: lastResult.success ? 'var(--text-tertiary)' : 'var(--danger)',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ color: lastResult.success ? 'var(--accent)' : 'var(--danger)' }}>
            {lastResult.success ? '[OK]' : '[ERR]'}
          </span>
          {' '}executed in {lastResult.duration}ms
        </div>
      )}
      <PackageList />
    </div>
  )
}
