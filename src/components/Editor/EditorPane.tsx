import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { useEditorStore } from '../../store/editor'
import { useCodeExecution } from '../../hooks/useCodeExecution'
import { useAutoRun } from '../../hooks/useAutoRun'

export function EditorPane() {
  const { code, setCode, language, setLanguage } = useEditorStore()
  const { run, isRunning } = useCodeExecution()
  const [autoRun, setAutoRun] = useState(false)

  useAutoRun(run, autoRun, 300)

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
        <button
          onClick={() => setAutoRun(!autoRun)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            autoRun
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
          }`}
          title="Auto-run on keystroke (300ms debounce)"
        >
          Auto {autoRun ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setLanguage(language === 'javascript' ? 'typescript' : 'javascript')}
          className="px-2 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors ml-auto"
          title="Toggle language"
        >
          {language === 'typescript' ? '.ts' : '.js'}
        </button>
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
