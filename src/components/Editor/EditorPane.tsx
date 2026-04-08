import { useRef, useCallback, useEffect } from 'react'
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

  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const ignoreScrollRef = useRef(false)

  useAutoRun(run, autoRunEnabled, autoRunDelay)
  useErrorHighlighting(editorRef)

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
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
