'use client'

import {
  AlignLeft,
  ArrowLeft,
  Check,
  Copy,
  FileCode,
  Monitor,
  Moon,
  Package,
  PanelLeft,
  PanelLeftClose,
  Play,
  Plus,
  Settings,
  Sun,
  Terminal,
  Trash2,
  Zap
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { APP_VERSION } from '@/lib/constants'
import { useTheme } from '@/lib/theme'
import { Kbd } from '../Kbd'
import { Logomark } from '../Logomark'
import { RevealOnScroll } from '../RevealOnScroll'
import { ObjectTree } from './ObjectTree'
import { CONSOLE_TEXT, SAMPLE_LINES } from './sampleProgram'

type OutputMode = 'aligned' | 'console'
type RunState = 'idle' | 'running' | 'complete'

const LINE_HEIGHT = 24
const RUN_DURATION_MS = 420

/**
 * A read-only replica of the desktop app rendered inline on the landing
 * page. Buttons that have a meaningful effect (Run, Auto, Mode, Copy,
 * Clear, theme toggle, sidebar collapse) are wired up; decorative
 * buttons (Packages, Settings, file actions) are styled but no-op.
 */
export function InteractivePreview() {
  const { resolved: theme, cycle: cycleTheme, mode: themeMode } = useTheme()

  const [mode, setMode] = useState<OutputMode>('aligned')
  const [autoRun, setAutoRun] = useState(false)
  const [runState, setRunState] = useState<RunState>('complete')
  const [duration, setDuration] = useState(11)
  const [outputVisible, setOutputVisible] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current)
    }
  }, [])

  const handleRun = () => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current)
    setRunState('running')
    setOutputVisible(false)
    runTimerRef.current = setTimeout(() => {
      setRunState('complete')
      setOutputVisible(true)
      setDuration(Math.floor(7 + Math.random() * 12))
    }, RUN_DURATION_MS)
  }

  const handleClear = () => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current)
    setOutputVisible(false)
    setRunState('idle')
  }

  const handleCopy = () => {
    if (!outputVisible) return
    navigator.clipboard.writeText(CONSOLE_TEXT).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <section className="relative px-4 sm:px-6">
      <RevealOnScroll className="relative mx-auto -mt-6 max-w-6xl md:-mt-12">
        <div className="relative overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]">
          {/* macOS title bar */}
          <TitleBar />

          {/* App header */}
          <AppHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            theme={theme}
            themeMode={themeMode}
            onCycleTheme={cycleTheme}
          />

          {/* Main split: sidebar | editor | output */}
          <div className="flex h-[420px] sm:h-[480px] md:h-[520px]">
            <Sidebar collapsed={sidebarCollapsed} />
            <EditorPane
              autoRun={autoRun}
              onToggleAutoRun={() => setAutoRun((v) => !v)}
              onRun={handleRun}
              isRunning={runState === 'running'}
            />
            <OutputPane
              mode={mode}
              onToggleMode={() =>
                setMode((m) => (m === 'aligned' ? 'console' : 'aligned'))
              }
              onCopy={handleCopy}
              onClear={handleClear}
              copied={copied}
              outputVisible={outputVisible}
              isRunning={runState === 'running'}
              runState={runState}
              duration={duration}
            />
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}

/* ─── Title bar (macOS chrome) ─────────────────────────────────── */

function TitleBar() {
  return (
    <div className="relative flex h-9 items-center border-b border-border-subtle bg-bg-elevated px-3.5">
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
    </div>
  )
}

/* ─── App header ──────────────────────────────────────────────── */

type AppHeaderProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  theme: 'light' | 'dark'
  themeMode: 'light' | 'dark' | 'system'
  onCycleTheme: () => void
}

function AppHeader({
  sidebarCollapsed,
  onToggleSidebar,
  theme,
  themeMode,
  onCycleTheme
}: AppHeaderProps) {
  const ThemeIcon =
    themeMode === 'system' ? Monitor : theme === 'light' ? Sun : Moon
  const themeTitle = `Theme: ${themeMode} — click to switch`

  return (
    <div className="relative flex h-[38px] items-center border-b border-border-subtle bg-bg-surface select-none">
      <div className="flex items-center pl-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          {sidebarCollapsed ? (
            <PanelLeft size={15} />
          ) : (
            <PanelLeftClose size={15} />
          )}
        </button>
      </div>
      <div className="flex-1" />
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1">
        <Logomark size={14} />
        <span className="font-mono text-[13px] font-semibold text-text-primary">
          nodl
        </span>
        <span className="text-[11px] text-text-tertiary">v{APP_VERSION}</span>
      </div>
      <div className="flex items-center pr-2 ml-auto">
        <button
          type="button"
          onClick={onCycleTheme}
          aria-label={themeTitle}
          title={themeTitle}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <ThemeIcon size={14} />
        </button>
      </div>
    </div>
  )
}

/* ─── Sidebar ──────────────────────────────────────────────────── */

function Sidebar({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <aside
        className="hidden w-[44px] flex-col items-center border-r border-border-subtle bg-bg-surface py-2 select-none sm:flex"
        aria-label="Sidebar (collapsed)"
      >
        <button
          type="button"
          aria-label="New file"
          title="New file"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Plus size={14} />
        </button>
        <div className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded bg-bg-hover text-text-primary">
          <FileCode size={14} />
        </div>
        <div className="mt-auto w-full border-t border-border-subtle pt-2 flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Packages"
            title="Packages"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <Package size={14} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <Settings size={14} />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="hidden w-[180px] flex-col border-r border-border-subtle bg-bg-surface select-none sm:flex"
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <span className="text-[11px] font-medium text-text-tertiary">
          Files
        </span>
        <button
          type="button"
          aria-label="New file"
          title="New file"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5">
        <button
          type="button"
          className="group flex w-full items-center gap-2 rounded bg-bg-hover px-2 py-[5px] text-left text-[12px] text-text-primary"
        >
          <FileCode size={13} className="text-text-primary" />
          <span className="truncate">demo.ts</span>
        </button>
      </div>

      <div className="border-t border-border-subtle p-1.5">
        <button
          type="button"
          aria-label="Packages — install, update, or remove npm packages"
          title="Packages"
          className="flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Package size={13} className="text-text-tertiary" />
          <span className="flex-1 truncate">Packages</span>
          <span className="text-[11px] text-text-tertiary">3</span>
        </button>
        <button
          type="button"
          aria-label="Settings — editor, execution, appearance"
          title="Settings"
          className="mt-px flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Settings size={13} className="text-text-tertiary" />
          <span className="truncate">Settings</span>
        </button>
      </div>
    </aside>
  )
}

/* ─── Editor pane ──────────────────────────────────────────────── */

type EditorPaneProps = {
  autoRun: boolean
  onToggleAutoRun: () => void
  onRun: () => void
  isRunning: boolean
}

function EditorPane({
  autoRun,
  onToggleAutoRun,
  onRun,
  isRunning
}: EditorPaneProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-bg-primary">
      {/* Editor toolbar */}
      <div className="flex h-9 items-center gap-1 border-b border-border-subtle bg-bg-surface px-1.5 select-none">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          aria-label="Run code"
          title="Run code"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-accent-bright transition-colors hover:bg-accent/15 disabled:opacity-50"
        >
          <Play
            size={14}
            fill="currentColor"
            className={isRunning ? 'animate-soft-pulse' : ''}
          />
        </button>
        <button
          type="button"
          onClick={onToggleAutoRun}
          aria-label={autoRun ? 'Auto-run on' : 'Auto-run off'}
          title={
            autoRun
              ? 'Auto-run on — click to disable'
              : 'Auto-run off — click to run automatically as you type'
          }
          className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
            autoRun
              ? 'bg-accent-dim text-accent'
              : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
          }`}
        >
          <Zap size={14} fill={autoRun ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Editor body — read-only */}
      <div
        className="flex-1 overflow-auto py-3 font-mono text-[13px] leading-[1.7] tabular-nums whitespace-nowrap"
        aria-label="Read-only code preview"
      >
        {SAMPLE_LINES.map((line, i) => (
          <div
            key={i}
            className="group flex items-start pl-1 pr-3 transition-colors duration-150 hover:bg-bg-hover"
            style={{ height: LINE_HEIGHT }}
          >
            <LineNumber n={i + 1} />
            <span className="text-text-primary">{line.code}</span>
          </div>
        ))}
        {/* Subtle blinking caret to suggest live editor */}
        <div
          className="group flex items-start pl-1 pr-3 transition-colors duration-150 hover:bg-bg-hover"
          style={{ height: LINE_HEIGHT }}
        >
          <LineNumber n={SAMPLE_LINES.length + 1} />
          <span
            className="inline-block h-[16px] w-[2px] translate-y-[2px] bg-accent-bright animate-cursor-blink"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Output pane ──────────────────────────────────────────────── */

type OutputPaneProps = {
  mode: OutputMode
  onToggleMode: () => void
  onCopy: () => void
  onClear: () => void
  copied: boolean
  outputVisible: boolean
  isRunning: boolean
  runState: RunState
  duration: number
}

function OutputPane({
  mode,
  onToggleMode,
  onCopy,
  onClear,
  copied,
  outputVisible,
  isRunning,
  runState,
  duration
}: OutputPaneProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col border-l border-border-subtle bg-bg-primary">
      {/* Output toolbar */}
      <div className="flex h-9 items-center gap-1 border-b border-border-subtle bg-bg-surface px-1.5 select-none">
        <span className="ml-1.5 mr-1 text-[12px] font-medium text-text-tertiary">
          Output
        </span>

        {/* Status / duration badge */}
        {runState !== 'idle' && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-tertiary">
            <span
              className={`inline-block h-[5px] w-[5px] rounded-full ${
                isRunning ? 'bg-warn animate-soft-pulse' : 'bg-ok'
              }`}
            />
            {isRunning ? 'running…' : `${duration}ms`}
          </span>
        )}

        <span className="flex-1" />

        <button
          type="button"
          onClick={onToggleMode}
          aria-label={
            mode === 'aligned'
              ? 'Switch to console mode'
              : 'Switch to line-aligned mode'
          }
          title={
            mode === 'aligned'
              ? 'Switch to console mode'
              : 'Switch to line-aligned mode'
          }
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          {mode === 'aligned' ? (
            <Terminal size={14} />
          ) : (
            <AlignLeft size={14} />
          )}
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={!outputVisible}
          aria-label={copied ? 'Copied' : 'Copy output'}
          title={copied ? 'Copied!' : 'Copy output'}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
        >
          {copied ? (
            <Check size={14} className="text-ok" />
          ) : (
            <Copy size={14} />
          )}
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear output"
          title="Clear output"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-auto bg-bg-primary">
        {!outputVisible && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            {isRunning ? (
              <span className="font-mono text-[14px] text-accent-bright">
                <span className="animate-cursor-blink">_</span>
              </span>
            ) : (
              <>
                <span className="text-[12px] text-text-tertiary">
                  No output
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary/70">
                  <span>Hit</span>
                  <Kbd k="mod" />
                  <Kbd k="enter" />
                  <span>to run</span>
                </span>
              </>
            )}
          </div>
        )}

        {outputVisible && mode === 'aligned' && <AlignedOutput />}
        {outputVisible && mode === 'console' && <ConsoleOutput />}
      </div>
    </div>
  )
}

function OutputValueNode({
  value
}: {
  value: NonNullable<(typeof SAMPLE_LINES)[number]['output']>
}) {
  if (value.kind === 'primitive') return <>{value.node}</>
  return <ObjectTree value={value.tree} />
}

/** Monaco-style right-aligned line number in a fixed-width gutter. */
function LineNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="select-none pt-px text-[11.5px] text-text-tertiary/60 group-hover:text-text-tertiary transition-colors"
      style={{
        width: 28,
        paddingRight: 10,
        textAlign: 'right',
        flexShrink: 0,
        display: 'inline-block',
      }}
    >
      {n}
    </span>
  )
}

function AlignedOutput() {
  return (
    <div className="py-3 font-mono text-[13px] leading-[1.7] tabular-nums whitespace-nowrap">
      {SAMPLE_LINES.map((line, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3"
          style={{ minHeight: LINE_HEIGHT }}
        >
          {line.output !== null ? (
            <>
              {/* Match the desktop app: accent colour at 40% opacity */}
              <ArrowLeft
                size={12}
                strokeWidth={2}
                className="flex-shrink-0"
                style={{ color: 'var(--accent)', opacity: 0.4 }}
                aria-hidden="true"
              />
              <span className="text-text-primary animate-fade-in">
                <OutputValueNode value={line.output} />
              </span>
            </>
          ) : (
            <span className="select-none">&nbsp;</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ConsoleOutput() {
  const consoleLines = SAMPLE_LINES.filter((l) => l.output !== null)
  return (
    <div className="py-3 font-mono text-[13px] leading-[1.7] tabular-nums whitespace-nowrap">
      {consoleLines.map((line, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 animate-fade-in"
          style={{ minHeight: LINE_HEIGHT }}
        >
          <span className="select-none text-[11px] text-text-tertiary/50">
            {'›'}
          </span>
          <span className="text-text-primary">
            <OutputValueNode value={line.output!} />
          </span>
        </div>
      ))}
    </div>
  )
}
