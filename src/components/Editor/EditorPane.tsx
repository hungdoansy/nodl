import { useRef, useCallback } from 'react'
import { Play, Zap } from 'lucide-react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useTabsStore } from '../../store/tabs'
import { useSettingsStore } from '../../store/settings'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useAutoRun } from '../../hooks/useAutoRun'
import { useTheme } from '../../hooks/useTheme'
import { useErrorHighlighting } from '../../hooks/useErrorHighlighting'

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

  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)

  useAutoRun(run, autoRunEnabled, autoRunDelay)
  useErrorHighlighting(editorRef)

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    editor.addCommand(2048 | 3, () => run()) // eslint-disable-line no-bitwise
  }, [run])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="toolbar flex items-center gap-1.5 px-3" style={{ height: 33 }}>
        <button onClick={run} disabled={isRunning} className="btn btn-primary" title="Run (Cmd+Enter)">
          <Play size={10} />
          Run
        </button>
        <button
          onClick={() => setSetting('autoRunEnabled', !autoRunEnabled)}
          className="btn"
          style={autoRunEnabled ? {
            borderColor: 'rgba(167, 139, 250, 0.3)',
            color: 'var(--accent)',
            background: 'var(--accent-dim)',
          } : undefined}
          title={`Auto-run (${autoRunDelay}ms)`}
        >
          <Zap size={10} />
          Auto
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
            padding: { top: 12 },
            scrollBeyondLastLine: false,
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
          onMount={handleMount}
        />
      </div>
    </div>
  )
}
