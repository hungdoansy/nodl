import { useEffect, useRef, type RefObject } from 'react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useOutputStore } from '../store/output'
import type { OutputEntry } from '../../shared/types'

const EMPTY_ENTRIES: OutputEntry[] = []

/**
 * Extract error line numbers from output entries.
 * Uses entry.line (set from __line__ tracking during execution) when available,
 * which maps to the original source. Only falls back to stack trace parsing
 * when entry.line is not set.
 * Exported for testing.
 */
export function extractErrorLines(entries: OutputEntry[], maxLine: number): number[] {
  const errorLines = new Set<number>()

  for (const entry of entries) {
    if (entry.method !== 'error') continue

    // Prefer entry.line — set from __line__.value during execution,
    // maps to original source lines (not transpiled code)
    if (entry.line && entry.line > 0 && entry.line <= maxLine) {
      errorLines.add(entry.line)
      continue
    }

    // Fallback: parse line numbers from error text (stack traces etc.)
    // These line numbers are from transpiled code so may be inaccurate
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
  const decorationsRef = useRef<monacoEditor.IEditorDecorationsCollection | null>(null)

  // Apply or clear error decorations when execution results change
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel()
    if (!model) return

    // Clear previous decorations
    decorationsRef.current?.clear()
    decorationsRef.current = null

    // If no error, we're done
    if (!lastResult || lastResult.success) return

    const errorLines = extractErrorLines(entries, model.getLineCount())
    if (errorLines.length === 0) return

    decorationsRef.current = editor.createDecorationsCollection(
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

  // Clear error decorations when the user edits code
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    const disposable = model.onDidChangeContent(() => {
      decorationsRef.current?.clear()
      decorationsRef.current = null
    })

    return () => disposable.dispose()
  }, [editorRef, activeTabId])
}
