import { useRef, useCallback } from 'react'
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
  const setLanguage = useTabsStore((s) => s.setLanguage)
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
    editor.addCommand(
      // eslint-disable-next-line no-bitwise
      2048 | 3, // KeyMod.CtrlCmd | KeyCode.Enter
      () => run()
    )
  }, [run])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
        <button
          onClick={run}
          disabled={isRunning}
          className="px-2.5 py-1 text-[11px] font-medium rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
          title="Run (Cmd+Enter)"
        >
          ▶ Run
        </button>
        <button
          onClick={() => setSetting('autoRunEnabled', !autoRunEnabled)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            autoRunEnabled
              ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border border-zinc-700'
          }`}
          title={`Auto-run on keystroke (${autoRunDelay}ms debounce)`}
        >
          Auto {autoRunEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setLanguage(tab.language === 'javascript' ? 'typescript' : 'javascript')}
          className="px-2 py-1 text-[11px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border border-zinc-700 transition-colors ml-auto"
          title="Toggle language"
        >
          {tab.language === 'typescript' ? '.ts' : '.js'}
        </button>
      </div>
      <div className="flex-1">
        <Editor
          key={tab.id}
          height="100%"
          language={tab.language}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
          value={tab.code}
          onChange={(value) => updateCode(value ?? '')}
          options={{
            fontSize,
            fontFamily: 'Menlo, Monaco, Consolas, monospace',
            minimap: { enabled: minimap },
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: wordWrap ? 'on' : 'off',
            tabSize,
            automaticLayout: true,
            glyphMargin: true
          }}
          onMount={handleMount}
        />
      </div>
    </div>
  )
}
