import Editor from '@monaco-editor/react'
import { useEditorStore } from '../../store/editor'
import { useCodeExecution } from '../../hooks/useCodeExecution'

export function EditorPane() {
  const { code, setCode, language } = useEditorStore()
  const { run, isRunning } = useCodeExecution()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <button
          onClick={run}
          disabled={isRunning}
          className="px-3 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
          title="Run (Cmd+Enter)"
        >
          ▶ Run
        </button>
        <span className="text-xs text-zinc-500 ml-auto">
          {language === 'typescript' ? 'TypeScript' : 'JavaScript'}
        </span>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          options={{
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, Consolas, monospace',
            minimap: { enabled: false },
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true
          }}
          onMount={(editor) => {
            // Cmd/Ctrl+Enter to run
            editor.addCommand(
              // eslint-disable-next-line no-bitwise
              2048 | 3, // KeyMod.CtrlCmd | KeyCode.Enter
              () => run()
            )
          }}
        />
      </div>
    </div>
  )
}
