import { useRef, useCallback, useEffect, useState } from 'react'
import { Play, Zap } from 'lucide-react'
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useTabsStore } from '../../store/tabs'
import { useSettingsStore } from '../../store/settings'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useAutoRun } from '../../hooks/useAutoRun'
import { useTheme } from '../../hooks/useTheme'
import { useErrorHighlighting } from '../../hooks/useErrorHighlighting'
import { useScrollSync } from '../../store/scroll-sync'
import { useUIStore } from '../../store/ui'
import { usePackagesStore } from '../../store/packages'
import * as bridge from '../../ipc/bridge'
import type { Monaco } from '@monaco-editor/react'

export function EditorPane() {
  const activeTab = useTabsStore((s) => s.activeTab)
  const updateCode = useTabsStore((s) => s.updateCode)
  const tab = activeTab()
  const { run, isRunning } = useCodeExecution()

  const fontSize = useSettingsStore((s) => s.fontSize)
  const tabSize = useSettingsStore((s) => s.tabSize)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const minimap = useSettingsStore((s) => s.minimap)
  const autoRunEnabled = useSettingsStore((s) => s.autoRunEnabled)
  const autoRunDelay = useSettingsStore((s) => s.autoRunDelay)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const resolvedTheme = useTheme()
  const outputMode = useUIStore((s) => s.outputMode)

  const packages = usePackagesStore((s) => s.packages)
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const ignoreScrollRef = useRef(false)
  const typeLibsRef = useRef<Map<string, { dispose: () => void }>>(new Map())
  const [editorVersion, setEditorVersion] = useState(0)

  useAutoRun(run, autoRunEnabled, autoRunDelay)
  useErrorHighlighting(editorRef)

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monacoRef.current = monaco
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowJs: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    })
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      // Suppress module-not-found errors — packages are resolved at runtime via require()
      diagnosticCodesToIgnore: [2792, 2307, 1259, 1471, 7016],
    })
  }, [])

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    setEditorVersion((v) => v + 1)
    editor.addCommand(2048 | 3, () => run()) // eslint-disable-line no-bitwise

    // Broadcast scroll position to output pane
    editor.onDidScrollChange((e) => {
      if (ignoreScrollRef.current) return
      useScrollSync.getState().setScrollTop(e.scrollTop, 'editor')
    })
  }, [run])

  // Listen for output-initiated scroll and sync to editor
  useEffect(() => {
    if (outputMode !== 'aligned') return
    const unsub = useScrollSync.subscribe((state) => {
      if (state.source === 'output' && editorRef.current) {
        ignoreScrollRef.current = true
        editorRef.current.setScrollTop(state.scrollTop)
        requestAnimationFrame(() => { ignoreScrollRef.current = false })
      }
    })
    return unsub
  }, [outputMode])

  // Compute per-line visual heights for output alignment (accounts for word wrap)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || outputMode !== 'aligned' || !wordWrap) {
      useScrollSync.getState().setLineHeights(null)
      return
    }

    function compute() {
      const ed = editorRef.current
      if (!ed) return
      const model = ed.getModel()
      if (!model) return
      const totalLines = model.getLineCount()
      const baseLineHeight = Math.round(fontSize * 1.5)
      const heights = new Map<number, number>()
      for (let i = 1; i <= totalLines; i++) {
        const top = ed.getTopForLineNumber(i)
        const nextTop = i < totalLines
          ? ed.getTopForLineNumber(i + 1)
          : top + baseLineHeight
        heights.set(i, nextTop - top)
      }
      useScrollSync.getState().setLineHeights(heights)
    }

    requestAnimationFrame(compute)

    const d1 = editor.onDidLayoutChange(() => requestAnimationFrame(compute))
    const d2 = editor.onDidChangeModelContent(() => requestAnimationFrame(compute))

    return () => {
      d1.dispose()
      d2.dispose()
      useScrollSync.getState().setLineHeights(null)
    }
  }, [editorVersion, outputMode, fontSize, wordWrap])

  // Load type definitions from installed packages into Monaco
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return

    bridge.getTypeDefs().then((defs) => {
      const currentLibs = typeLibsRef.current
      const newNames = new Set(defs.map((d) => d.packageName))

      // Dispose libs for removed packages
      for (const [name, lib] of currentLibs) {
        if (!newNames.has(name)) {
          lib.dispose()
          currentLibs.delete(name)
        }
      }

      // Add or update libs for current packages
      for (const def of defs) {
        const existing = currentLibs.get(def.packageName)
        if (existing) {
          existing.dispose()
        }
        const lib = monaco.languages.typescript.typescriptDefaults.addExtraLib(
          def.content,
          `file:///node_modules/${def.packageName}/index.d.ts`
        )
        currentLibs.set(def.packageName, lib)
      }
    })
  }, [packages, editorVersion])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="toolbar flex items-center gap-1 px-1.5" style={{ height: 36, minHeight: 36 }}>
        <button onClick={run} disabled={isRunning} className="toolbar-btn primary" title="Run (Cmd+Enter)">
          <Play size={14} />
        </button>
        <button
          onClick={() => setSetting('autoRunEnabled', !autoRunEnabled)}
          className={`toolbar-btn ${autoRunEnabled ? 'active' : ''}`}
          title={autoRunEnabled ? `Auto-run on (${autoRunDelay}ms)` : 'Auto-run off'}
        >
          {autoRunEnabled
            ? <Zap size={14} fill="currentColor" />
            : <Zap size={14} />
          }
        </button>
      </div>
      <div className="flex-1">
        <Editor
          key={tab.id}
          height="100%"
          language="typescript"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
          value={tab.code}
          onChange={(value) => updateCode(value ?? '')}
          options={{
            fontSize,
            fontFamily: "var(--font-mono)",
            lineHeight: Math.round(fontSize * 1.5),
            minimap: { enabled: minimap },
            padding: { top: 12, bottom: 4 },
            scrollBeyondLastLine: false,
            stickyScroll: { enabled: false },
            wordWrap: wordWrap ? 'on' : 'off',
            tabSize,
            automaticLayout: true,
            glyphMargin: true,
            lineNumbersMinChars: 3,
            folding: false,
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            cursorBlinking: 'smooth',
          }}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
        />
      </div>
    </div>
  )
}
