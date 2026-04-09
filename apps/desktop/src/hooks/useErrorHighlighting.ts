import { useEffect, type RefObject } from 'react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useOutputStore } from '../store/output'
import type { OutputEntry } from '../../shared/types'

const EMPTY_ENTRIES: OutputEntry[] = []

/**
 * Extract error line numbers from output entries.
 * Exported for testing.
 */
export function extractErrorLines(entries: OutputEntry[], maxLine: number): number[] {
  const errorLines = new Set<number>()

  for (const entry of entries) {
    if (entry.method !== 'error') continue
    for (const arg of entry.args) {
      if (typeof arg !== 'string') continue
      const linePatterns = [
        /(?:line\s+)(\d+)/gi,
        /:(\d+)(?::\d+)?/g,
        /at\s+.*?:(\d+)/g
      ]
      for (const pattern of linePatterns) {
        let match: RegExpExecArray | null
        while ((match = pattern.exec(arg)) !== null) {
          const line = parseInt(match[1], 10)
          if (line > 0 && line <= maxLine) {
            errorLines.add(line)
          }
        }
      }
    }
  }

  return Array.from(errorLines)
}

/**
 * Highlights error lines in the Monaco editor based on execution errors.
 * Parses stack traces and error messages to extract line numbers.
 */
export function useErrorHighlighting(
  editorRef: RefObject<monacoEditor.IStandaloneCodeEditor | null>
) {
  const activeTabId = useOutputStore((s) => s.activeTabId)
  const lastResult = useOutputStore((s) => s.outputs[s.activeTabId]?.lastResult ?? null)
  const entries = useOutputStore((s) => s.outputs[s.activeTabId]?.entries ?? EMPTY_ENTRIES)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel()
    if (!model) return

    // If no error, clear decorations
    if (!lastResult || lastResult.success) {
      editor.removeDecorations(
        editor.getDecorationsInRange(model.getFullModelRange())
          ?.filter((d) => d.options.className === 'error-line-decoration')
          .map((d) => d.id) ?? []
      )
      return
    }

    const errorLines = extractErrorLines(entries, model.getLineCount())
    if (errorLines.length === 0) return

    editor.createDecorationsCollection(
      errorLines.map((line) => ({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line)
        },
        options: {
          isWholeLine: true,
          className: 'error-line-decoration',
          glyphMarginClassName: 'error-glyph-margin',
          overviewRuler: {
            color: '#ef4444',
            position: 4 // OverviewRulerLane.Full
          }
        }
      }))
    )
  }, [lastResult, entries, editorRef, activeTabId])
}
