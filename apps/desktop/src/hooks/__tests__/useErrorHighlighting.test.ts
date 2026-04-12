import { describe, it, expect } from 'vitest'
import { extractErrorLines } from '../useErrorHighlighting'
import type { OutputEntry } from '../../../shared/types'

function makeEntry(method: string, ...args: unknown[]): OutputEntry {
  return { id: '1', method: method as OutputEntry['method'], args, timestamp: Date.now() }
}

function makeEntryWithLine(method: string, line: number, ...args: unknown[]): OutputEntry {
  return { id: '1', method: method as OutputEntry['method'], args, timestamp: Date.now(), line }
}

describe('extractErrorLines', () => {
  it('returns empty for non-error entries', () => {
    const entries = [makeEntry('log', 'hello')]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  it('handles entries with no errors', () => {
    expect(extractErrorLines([], 100)).toEqual([])
  })

  // --- entry.line (preferred — from __line__ tracking) ---

  it('uses entry.line when available', () => {
    const entries = [makeEntryWithLine('error', 14, 'lodash.join is not a function')]
    expect(extractErrorLines(entries, 100)).toEqual([14])
  })

  it('uses entry.line and skips stack trace parsing when line is set', () => {
    // Stack trace says :30 (transpiled line), but entry.line says 14 (original source)
    const entries = [makeEntryWithLine('error', 14, 'TypeError: lodash.join is not a function\n    at file:///src/abc.ts:30:5')]
    const result = extractErrorLines(entries, 100)
    expect(result).toEqual([14])
    expect(result).not.toContain(30)
  })

  it('uses entry.line for multiple error entries', () => {
    const entries = [
      makeEntryWithLine('error', 14, 'error on line 14'),
      makeEntryWithLine('error', 25, 'error on line 25'),
    ]
    expect(extractErrorLines(entries, 100)).toEqual([14, 25])
  })

  it('deduplicates entry.line values', () => {
    const entries = [
      makeEntryWithLine('error', 14, 'first error'),
      makeEntryWithLine('error', 14, 'second error same line'),
    ]
    expect(extractErrorLines(entries, 100)).toEqual([14])
  })

  it('ignores entry.line beyond maxLine', () => {
    const entries = [makeEntryWithLine('error', 999, 'error')]
    expect(extractErrorLines(entries, 10)).toEqual([])
  })

  it('ignores entry.line of 0', () => {
    const entries = [makeEntryWithLine('error', 0, 'error')]
    // line 0 fails the > 0 check, falls through to regex parsing
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  // --- Fallback: stack trace regex parsing (when entry.line is not set) ---

  it('falls back to regex when entry.line is not set', () => {
    const entries = [makeEntry('error', 'TypeScript error (line 5): unexpected token')]
    expect(extractErrorLines(entries, 100)).toContain(5)
  })

  it('extracts line from stack trace ":N:" pattern', () => {
    const entries = [makeEntry('error', 'Error at script:3:12')]
    expect(extractErrorLines(entries, 100)).toContain(3)
  })

  it('extracts line from "at ... :N" pattern', () => {
    const entries = [makeEntry('error', 'at Object.<anonymous> (script.js:7:1)')]
    expect(extractErrorLines(entries, 100)).toContain(7)
  })

  it('ignores lines beyond maxLine in fallback', () => {
    const entries = [makeEntry('error', 'error at line 999')]
    expect(extractErrorLines(entries, 10)).toEqual([])
  })

  it('ignores line 0 in fallback', () => {
    const entries = [makeEntry('error', 'error at :0:')]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  it('deduplicates fallback line numbers', () => {
    const entries = [
      makeEntry('error', 'error at line 3'),
      makeEntry('error', 'also at line 3')
    ]
    const result = extractErrorLines(entries, 100)
    expect(result.filter((l) => l === 3)).toHaveLength(1)
  })

  it('extracts multiple lines from one entry in fallback', () => {
    const entries = [makeEntry('error', 'error at line 2\n  at line 5')]
    const result = extractErrorLines(entries, 100)
    expect(result).toContain(2)
    expect(result).toContain(5)
  })

  it('skips non-string args in fallback', () => {
    const entries = [makeEntry('error', 42, { line: 3 }, null)]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  // --- Mixed: some entries have line, some don't ---

  it('mixes entry.line and fallback parsing', () => {
    const entries = [
      makeEntryWithLine('error', 14, 'known error'),
      makeEntry('error', 'unknown error at line 8'),
    ]
    const result = extractErrorLines(entries, 100)
    expect(result).toContain(14)
    expect(result).toContain(8)
  })

  it('entry.line takes priority — does not parse stack trace when line is set', () => {
    // Real scenario: error at original line 14, but transpiled stack trace says line 30
    const entries = [makeEntryWithLine('error', 14,
      'TypeError: lodash.join is not a function',
      '    at Object.<anonymous> (file:///src/main.ts:30:1)\n    at file:///src/main.ts:42:5'
    )]
    const result = extractErrorLines(entries, 100)
    expect(result).toEqual([14])
    expect(result).not.toContain(30)
    expect(result).not.toContain(42)
  })

  // --- Non-error methods with line are ignored ---

  it('ignores entry.line on non-error methods', () => {
    const entries = [makeEntryWithLine('log', 5, 'hello')]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })
})

/**
 * useErrorHighlighting hook behavior (tested via E2E, not unit-testable without full Monaco):
 *
 * - Stores decorations in a ref, calls .clear() before adding new ones (no duplicates)
 * - Listens to model.onDidChangeContent — clears error decorations immediately
 *   when the user edits code, so stale marks don't persist after commenting/uncommenting
 * - Decorations are cleared when lastResult.success becomes true or lastResult is null
 */
