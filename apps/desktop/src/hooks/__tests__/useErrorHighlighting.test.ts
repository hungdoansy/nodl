import { describe, it, expect } from 'vitest'
import { extractErrorLines } from '../useErrorHighlighting'
import type { OutputEntry } from '../../../shared/types'

function makeEntry(method: string, ...args: unknown[]): OutputEntry {
  return { id: '1', method: method as OutputEntry['method'], args, timestamp: Date.now() }
}

describe('extractErrorLines', () => {
  it('returns empty for non-error entries', () => {
    const entries = [makeEntry('log', 'hello')]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  it('extracts line from "TypeScript error (line N)" pattern', () => {
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

  it('ignores lines beyond maxLine', () => {
    const entries = [makeEntry('error', 'error at line 999')]
    expect(extractErrorLines(entries, 10)).toEqual([])
  })

  it('ignores line 0', () => {
    const entries = [makeEntry('error', 'error at :0:')]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  it('deduplicates line numbers', () => {
    const entries = [
      makeEntry('error', 'error at line 3'),
      makeEntry('error', 'also at line 3')
    ]
    const result = extractErrorLines(entries, 100)
    expect(result.filter((l) => l === 3)).toHaveLength(1)
  })

  it('extracts multiple lines from one entry', () => {
    const entries = [makeEntry('error', 'error at line 2\n  at line 5')]
    const result = extractErrorLines(entries, 100)
    expect(result).toContain(2)
    expect(result).toContain(5)
  })

  it('skips non-string args', () => {
    const entries = [makeEntry('error', 42, { line: 3 }, null)]
    expect(extractErrorLines(entries, 100)).toEqual([])
  })

  it('handles entries with no errors', () => {
    expect(extractErrorLines([], 100)).toEqual([])
  })
})
