import { describe, it, expect } from 'vitest'
import { estimateContentHeight, computeAdjustedHeights } from '../OutputPane'
import type { OutputEntry } from '../../../../shared/types'

function entry(method: string, args: unknown[], line?: number): OutputEntry {
  return { id: '1', method: method as OutputEntry['method'], args, timestamp: Date.now(), line }
}

const LH = 20 // lineHeight used throughout tests

// --- estimateContentHeight ---

describe('estimateContentHeight', () => {
  it('returns 1 line for a single-line string', () => {
    expect(estimateContentHeight([entry('log', ['hello'])], LH)).toBe(LH)
  })

  it('counts newlines in string args', () => {
    expect(estimateContentHeight([entry('log', ['1\n2\n3\n4'])], LH)).toBe(4 * LH)
  })

  it('counts newlines across multiple string args', () => {
    // 'a\nb' = 1 newline, 'c\nd' = 1 newline, total = 2 newlines + 1 = 3 lines
    expect(estimateContentHeight([entry('log', ['a\nb', 'c\nd'])], LH)).toBe(3 * LH)
  })

  it('returns 1 line for a number arg', () => {
    expect(estimateContentHeight([entry('log', [42])], LH)).toBe(LH)
  })

  it('returns 1 line for an object arg (collapsed)', () => {
    expect(estimateContentHeight([entry('log', [{ foo: 'bar' }])], LH)).toBe(LH)
  })

  it('returns 1 line for LastExpression', () => {
    expect(estimateContentHeight([entry('log', [{ __type: 'LastExpression', value: 42 }])], LH)).toBe(LH)
  })

  it('returns 1 line for table method', () => {
    expect(estimateContentHeight([entry('table', [[1, 2, 3]])], LH)).toBe(LH)
  })

  it('counts newlines in Error message and stack', () => {
    const err = { __type: 'Error', message: 'ReferenceError', stack: 'at foo\nat bar' }
    // "ReferenceError" + "\n" + "at foo\nat bar" = 3 lines
    expect(estimateContentHeight([entry('error', [err])], LH)).toBe(3 * LH)
  })

  it('counts Error message without stack as 1 line', () => {
    const err = { __type: 'Error', message: 'TypeError' }
    expect(estimateContentHeight([entry('error', [err])], LH)).toBe(LH)
  })

  it('sums heights for multiple entries on the same line', () => {
    const entries = [
      entry('log', ['hello']),
      entry('log', ['a\nb\nc']),
    ]
    // 1 line + 3 lines = 4 lines
    expect(estimateContentHeight(entries, LH)).toBe(4 * LH)
  })

  it('returns 1 line for empty args', () => {
    expect(estimateContentHeight([entry('log', [])], LH)).toBe(LH)
  })

  it('handles trailing newline', () => {
    expect(estimateContentHeight([entry('log', ['hello\n'])], LH)).toBe(2 * LH)
  })
})

// --- computeAdjustedHeights ---

describe('computeAdjustedHeights', () => {
  it('returns original heights when no entries overflow', () => {
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['hello'], 1)])
    const heights = computeAdjustedHeights(3, null, LH, lined)
    expect(heights.get(1)).toBe(LH)
    expect(heights.get(2)).toBe(LH)
    expect(heights.get(3)).toBe(LH)
  })

  it('returns original heights when no entries at all', () => {
    const lined = new Map<number, OutputEntry[]>()
    const heights = computeAdjustedHeights(3, null, LH, lined)
    expect(heights.get(1)).toBe(LH)
    expect(heights.get(2)).toBe(LH)
    expect(heights.get(3)).toBe(LH)
  })

  it('absorbs overflow into subsequent blank lines', () => {
    // Line 1: 4-line output, lines 2-6 empty, line 7: output
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['1\n2\n3\n4'], 1)])
    lined.set(7, [entry('log', ['5'], 7)])

    const heights = computeAdjustedHeights(7, null, LH, lined)

    // Line 1: keeps its height (content expands via minHeight)
    expect(heights.get(1)).toBe(LH)
    // Lines 2-4: fully absorbed (height 0)
    expect(heights.get(2)).toBe(0)
    expect(heights.get(3)).toBe(0)
    expect(heights.get(4)).toBe(0)
    // Lines 5-6: no overflow left, full height
    expect(heights.get(5)).toBe(LH)
    expect(heights.get(6)).toBe(LH)
    // Line 7: keeps its height
    expect(heights.get(7)).toBe(LH)
  })

  it('partially absorbs overflow when fewer blank lines than overflow', () => {
    // Line 1: 4-line output, only 1 blank line, then line 3 has output
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['1\n2\n3\n4'], 1)])
    lined.set(3, [entry('log', ['5'], 3)])

    const heights = computeAdjustedHeights(3, null, LH, lined)

    expect(heights.get(1)).toBe(LH)
    expect(heights.get(2)).toBe(0) // absorbed 1 line of overflow
    expect(heights.get(3)).toBe(LH) // content line resets overflow
  })

  it('resets overflow at content lines', () => {
    // Two separate multi-line outputs with blank lines between
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['a\nb'], 1)])   // 2 lines, overflow = 1
    lined.set(3, [entry('log', ['c\nd\ne'], 3)]) // 3 lines, overflow = 2
    // Lines 4-5 should absorb overflow from line 3, not from line 1

    const heights = computeAdjustedHeights(5, null, LH, lined)

    expect(heights.get(1)).toBe(LH)
    expect(heights.get(2)).toBe(0)  // absorbed overflow from line 1
    expect(heights.get(3)).toBe(LH)
    expect(heights.get(4)).toBe(0)  // absorbed overflow from line 3
    expect(heights.get(5)).toBe(0)  // absorbed overflow from line 3
  })

  it('uses lineHeights map when provided', () => {
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['a\nb\nc'], 1)]) // 3 lines overflow

    const lineHeightsMap = new Map<number, number>()
    lineHeightsMap.set(1, 25) // word-wrapped line
    lineHeightsMap.set(2, 25)
    lineHeightsMap.set(3, LH)

    const heights = computeAdjustedHeights(3, lineHeightsMap, LH, lined)

    // overflow = 3*20 - 25 = 35
    expect(heights.get(1)).toBe(25)
    // line 2: absorb min(35, 25) = 25, height = 0, overflow = 10
    expect(heights.get(2)).toBe(0)
    // line 3: absorb min(10, 20) = 10, height = 10, overflow = 0
    expect(heights.get(3)).toBe(10)
  })

  it('never produces negative heights', () => {
    const lined = new Map<number, OutputEntry[]>()
    lined.set(1, [entry('log', ['1\n2\n3\n4\n5\n6\n7\n8\n9\n10'], 1)]) // 10 lines

    const heights = computeAdjustedHeights(3, null, LH, lined)

    // Only 2 blank lines to absorb 9 lines of overflow — all should be >= 0
    expect(heights.get(1)).toBe(LH)
    expect(heights.get(2)).toBe(0)
    expect(heights.get(3)).toBe(0)
  })
})
