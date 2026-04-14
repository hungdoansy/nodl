import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Square, Trash2, AlignLeft, Terminal, Copy, Check } from 'lucide-react'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'
import { useScrollSync } from '../../store/scroll-sync'
import { ConsoleEntryComponent } from './ConsoleEntry'
import { useSettingsStore } from '../../store/settings'
import { entriesToText } from '../../utils/outputToText'
import { withShortcut } from '../../utils/shortcut'
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

/** Estimate the visual pixel height of entries on a line by counting newlines. Exported for testing. */
export function estimateContentHeight(entries: OutputEntry[], lh: number): number {
  let total = 0
  for (const entry of entries) {
    if (entry.method === 'table') { total += 1; continue }
    const first = entry.args[0]
    if (typeof first === 'object' && first !== null && (first as { __type?: string }).__type === 'LastExpression') {
      total += 1; continue
    }
    let newlines = 0
    for (const arg of entry.args) {
      if (typeof arg === 'object' && arg !== null && (arg as { __type?: string }).__type === 'Error') {
        const e = arg as { message: string; stack?: string }
        const text = e.message + (e.stack ? '\n' + e.stack : '')
        newlines += (text.match(/\n/g) ?? []).length
      } else if (typeof arg === 'string') {
        newlines += (arg.match(/\n/g) ?? []).length
      }
    }
    total += newlines + 1
  }
  return total * lh
}

/**
 * Compute overflow-adjusted line heights so multi-line output consumes subsequent blank lines.
 * Exported for testing.
 */
export function computeAdjustedHeights(
  totalLines: number,
  lineHeights: Map<number, number> | null,
  lineHeight: number,
  lined: Map<number, OutputEntry[]>,
  measuredContentHeights?: Map<number, number> | null,
): Map<number, number> {
  const heights = new Map<number, number>()
  let overflow = 0
  for (let i = 1; i <= totalLines; i++) {
    const actualHeight = lineHeights?.get(i) ?? lineHeight
    const lineEntries = lined.get(i)
    if (lineEntries) {
      overflow = 0
      heights.set(i, actualHeight)
      const contentHeight = measuredContentHeights?.get(i) ?? estimateContentHeight(lineEntries, lineHeight)
      overflow = Math.max(0, contentHeight - actualHeight)
    } else {
      const absorbed = Math.min(overflow, actualHeight)
      heights.set(i, actualHeight - absorbed)
      overflow -= absorbed
    }
  }
  return heights
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
  const [copied, setCopied] = useState(false)
  const [containerHeight, setContainerHeight] = useState(0)
  const [measuredContentHeights, setMeasuredContentHeights] = useState<Map<number, number>>(new Map())
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreScrollRef = useRef(false)
  const contentObserverRef = useRef<ResizeObserver | null>(null)

  const handleCopy = useCallback(() => {
    if (entries.length === 0) return
    const text = entriesToText(entries)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* clipboard write failed silently */ })
  }, [entries])

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

  // Measure actual rendered heights of output content (e.g., expanded ObjectTrees)
  // so computeAdjustedHeights can absorb overflow into subsequent blank lines.
  useEffect(() => {
    if (outputMode !== 'aligned') {
      contentObserverRef.current?.disconnect()
      contentObserverRef.current = null
      return
    }
    const observer = new ResizeObserver((observations) => {
      // flushSync ensures the height adjustment renders in the same frame as the
      // content resize (e.g., ObjectTree expand/collapse), preventing a layout shift.
      flushSync(() => {
        setMeasuredContentHeights(prev => {
          const next = new Map(prev)
          let changed = false
          for (const ob of observations) {
            const lineNum = Number((ob.target as HTMLElement).dataset.line)
            if (isNaN(lineNum)) continue
            const h = Math.round(ob.contentRect.height)
            if (next.get(lineNum) !== h) {
              next.set(lineNum, h)
              changed = true
            }
          }
          return changed ? next : prev
        })
      })
    })
    contentObserverRef.current = observer
    return () => {
      observer.disconnect()
      contentObserverRef.current = null
    }
  }, [outputMode])
  const toggleOutputMode = useUIStore((s) => s.toggleOutputMode)
  const lineHeight = Math.round(fontSize * 1.5)
  const lineHeights = useScrollSync((s) => s.lineHeights)
  const { lined, unlined } = useMemo(() => groupByLine(entries), [entries])
  const errorEntries = useMemo(() => unlined.filter((e) => e.method === 'error'), [unlined])
  const nonErrorUnlined = useMemo(() => unlined.filter((e) => e.method !== 'error'), [unlined])
  const adjustedHeights = useMemo(
    () => computeAdjustedHeights(totalLines, lineHeights, lineHeight, lined, measuredContentHeights),
    [totalLines, lineHeights, lineHeight, lined, measuredContentHeights]
  )

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

  // Track scroll container height for scroll-beyond-last-line spacer
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight))
    ro.observe(el)
    setContainerHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (!scrollRef.current) return
    if (outputMode === 'console') {
      // Console mode: always scroll to bottom
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } else {
      // Aligned mode: re-sync to editor's current scroll position
      // (new output may have changed the content height)
      const { scrollTop } = useScrollSync.getState()
      scrollRef.current.scrollTop = scrollTop
    }
  }, [entries, outputMode])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-1 px-1.5" style={{ height: 36, minHeight: 36 }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500, paddingLeft: 6, paddingRight: 4, userSelect: 'none' }}>
          Output
        </span>

        {/* Duration badge */}
        {lastResult && (
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: lastResult.success ? 'var(--text-tertiary)' : 'var(--danger)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            userSelect: 'none',
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
          title={withShortcut(
            outputMode === 'aligned' ? 'Switch to console mode' : 'Switch to line-aligned mode',
            'M', { mod: true, shift: true }
          )}
        >
          {outputMode === 'aligned' ? <Terminal size={14} /> : <AlignLeft size={14} />}
        </button>

        <button
          onClick={handleCopy}
          className="toolbar-btn"
          title={copied ? 'Copied!' : withShortcut('Copy output', 'C', { mod: true, shift: true })}
          disabled={entries.length === 0}
        >
          {copied ? <Check size={14} style={{ color: 'var(--ok)' }} /> : <Copy size={14} />}
        </button>

        <button onClick={clear} className="toolbar-btn" title={withShortcut('Clear output', 'L')}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleOutputScroll} style={{ paddingBottom: 4 }}>
        {/* Empty state */}
        {!hasOutput && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ userSelect: 'none', padding: '0 24px' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              No output yet
            </span>
            <div className="flex flex-col gap-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 11, opacity: 0.6, textAlign: 'center', lineHeight: 1.5 }}>
              <span>Write code in the editor, then</span>
              <kbd style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)'
              }}>
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
              </kbd>
              <span>to run</span>
            </div>
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
                const adjustedHeight = adjustedHeights.get(lineNum) ?? lineHeight
                const lineEntries = lined.get(lineNum)
                if (!lineEntries) {
                  return <div key={`line-${lineNum}`} style={{ height: adjustedHeight }} />
                }
                return (
                  <div key={`line-${lineNum}`} style={{ minHeight: adjustedHeight }} className="flex items-start">
                    <div
                      className="flex-1 min-w-0"
                      data-line={lineNum}
                      ref={(el) => { if (el) contentObserverRef.current?.observe(el) }}
                    >
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
              {/* Spacer to match Monaco's scrollBeyondLastLine */}
              <div style={{ height: containerHeight - lineHeight }} />
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
