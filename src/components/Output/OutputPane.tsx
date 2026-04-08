import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Square, Trash2, AlignLeft, Terminal } from 'lucide-react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'
import { useScrollSync } from '../../store/scroll-sync'
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

const STOP_BUTTON_DELAY = 3000

export function OutputPane() {
  const { entries, isRunning, lastResult, stop, clear } = useCodeExecution()
  const scrollRef = useRef<HTMLDivElement>(null)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const activeTab = useTabsStore((s) => s.activeTab)
  const tab = activeTab()
  const totalLines = useMemo(() => tab.code.split('\n').length, [tab.code])

  const [showStop, setShowStop] = useState(false)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreScrollRef = useRef(false)

  useEffect(() => {
    if (isRunning) {
      stopTimerRef.current = setTimeout(() => setShowStop(true), STOP_BUTTON_DELAY)
    } else {
      setShowStop(false)
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
    }
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
    }
  }, [isRunning])

  const outputMode = useUIStore((s) => s.outputMode)
  const toggleOutputMode = useUIStore((s) => s.toggleOutputMode)
  const lineHeight = Math.round(fontSize * 1.5)
  const { lined, unlined } = useMemo(() => groupByLine(entries), [entries])
  const errorEntries = useMemo(() => unlined.filter((e) => e.method === 'error'), [unlined])
  const nonErrorUnlined = useMemo(() => unlined.filter((e) => e.method !== 'error'), [unlined])
  const editorPaddingTop = 12
  const hasOutput = entries.length > 0

  // Scroll sync: output follows editor in aligned mode
  const handleOutputScroll = useCallback(() => {
    if (outputMode !== 'aligned' || !scrollRef.current || ignoreScrollRef.current) return
    useScrollSync.getState().setScrollTop(scrollRef.current.scrollTop, 'output')
  }, [outputMode])

  useEffect(() => {
    if (outputMode !== 'aligned') return
    const unsub = useScrollSync.subscribe((state) => {
      if (state.source === 'editor' && scrollRef.current) {
        ignoreScrollRef.current = true
        scrollRef.current.scrollTop = state.scrollTop
        requestAnimationFrame(() => { ignoreScrollRef.current = false })
      }
    })
    return unsub
  }, [outputMode])

  // Auto-scroll to bottom in console mode when new entries arrive
  useEffect(() => {
    if (outputMode === 'console' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, outputMode])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-1 px-1.5" style={{ height: 36 }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500, paddingLeft: 6, paddingRight: 4 }}>
          Output
        </span>

        {/* Duration badge */}
        {lastResult && (
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: lastResult.success ? 'var(--text-tertiary)' : 'var(--danger)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: lastResult.success ? 'var(--ok)' : 'var(--danger)',
            }} />
            {lastResult.duration}ms
          </span>
        )}

        {showStop && isRunning && (
          <button onClick={stop} className="toolbar-btn danger animate-fade-in" title="Stop execution">
            <Square size={14} />
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={toggleOutputMode}
          className="toolbar-btn"
          title={outputMode === 'aligned' ? 'Switch to console mode' : 'Switch to line-aligned mode'}
        >
          {outputMode === 'aligned' ? <Terminal size={14} /> : <AlignLeft size={14} />}
        </button>

        <button onClick={clear} className="toolbar-btn" title="Clear output">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleOutputScroll} style={{ paddingBottom: 4 }}>
        {/* Empty state */}
        {!hasOutput && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              No output yet
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11, opacity: 0.5 }}>
              Cmd+Enter to run
            </span>
          </div>
        )}

        {/* Running cursor */}
        {!hasOutput && isRunning && (
          <div className="flex items-center px-4" style={{ paddingTop: editorPaddingTop, height: lineHeight }}>
            <span style={{ color: 'var(--accent)', fontSize, fontFamily: 'var(--font-mono)' }}>
              <span className="animate-cursor">_</span>
            </span>
          </div>
        )}

        {/* Aligned mode */}
        {hasOutput && outputMode === 'aligned' && (
          <>
            {/* Errors pinned to top */}
            {errorEntries.length > 0 && (
              <div style={{
                borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
                background: 'rgba(239, 68, 68, 0.06)',
              }}>
                {errorEntries.map((entry) => (
                  <ConsoleEntryComponent key={entry.id} entry={entry} fontSize={fontSize} lineHeight={lineHeight} />
                ))}
              </div>
            )}
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
              {nonErrorUnlined.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
                  {nonErrorUnlined.map((entry) => (
                    <ConsoleEntryComponent key={entry.id} entry={entry} fontSize={fontSize} lineHeight={lineHeight} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Console mode */}
        {hasOutput && outputMode === 'console' && (
          <div className="px-3 py-2">
            {entries.map((entry) => (
              <ConsoleEntryComponent key={entry.id} entry={entry} fontSize={fontSize} lineHeight={lineHeight} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
