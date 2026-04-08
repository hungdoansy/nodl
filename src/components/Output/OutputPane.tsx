import { useEffect, useRef, useMemo } from 'react'
import { Square, Trash2 } from 'lucide-react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useTabsStore } from '../../store/tabs'
import { ConsoleEntryComponent } from './ConsoleEntry'
import { useSettingsStore } from '../../store/settings'
import type { OutputEntry } from '../../../shared/types'

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

  const lineHeight = Math.round(fontSize * 1.5)
  const { lined, unlined } = useMemo(() => groupByLine(entries), [entries])
  const editorPaddingTop = 12
  const hasOutput = entries.length > 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar — same 33px height as editor */}
      <div className="toolbar flex items-center gap-2 px-3" style={{ height: 33 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}>
          Output
        </span>

        {isRunning && (
          <button onClick={stop} className="btn btn-danger" style={{ padding: '2px 8px' }}>
            <Square size={9} />
            Stop
          </button>
        )}

        <div className="flex-1" />

        <button onClick={clear} className="btn" style={{ padding: '2px 8px' }}>
          <Trash2 size={10} />
          Clear
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Empty + not running */}
        {!hasOutput && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
              awaiting execution_
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 10, opacity: 0.5 }}>
              Cmd+Enter to run
            </span>
          </div>
        )}

        {/* Empty + running — terminal cursor loader */}
        {!hasOutput && isRunning && (
          <div className="flex items-center h-full px-4" style={{ paddingTop: editorPaddingTop }}>
            <span style={{ color: 'var(--accent)', fontSize, fontFamily: 'var(--font-mono)' }}>
              <span className="animate-cursor">_</span>
            </span>
          </div>
        )}

        {/* Line-aligned output */}
        {hasOutput && (
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
                      <ConsoleEntryComponent key={entry.id} entry={entry} compact fontSize={fontSize} lineHeight={lineHeight} />
                    ))}
                  </div>
                </div>
              )
            })}
            {unlined.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
                {unlined.map((entry) => (
                  <ConsoleEntryComponent key={entry.id} entry={entry} fontSize={fontSize} lineHeight={lineHeight} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      {lastResult && (
        <div style={{
          padding: '3px 12px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: lastResult.success ? 'var(--text-tertiary)' : 'var(--danger)',
        }}>
          <span style={{ color: lastResult.success ? 'var(--ok)' : 'var(--danger)' }}>
            {lastResult.success ? '[ok]' : '[err]'}
          </span>
          {' '}{lastResult.duration}ms
        </div>
      )}
    </div>
  )
}
