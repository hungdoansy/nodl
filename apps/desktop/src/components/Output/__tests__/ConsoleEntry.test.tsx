import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConsoleEntryComponent } from '../ConsoleEntry'
import type { OutputEntry } from '../../../../shared/types'

function entry(method: string, args: unknown[]): OutputEntry {
  return { id: '1', method: method as OutputEntry['method'], args, timestamp: Date.now() }
}

describe('ConsoleEntryComponent', () => {
  // --- Error entries: strings should be plain (no quotes, inherits red) ---

  it('renders error string args without quotes', () => {
    render(<ConsoleEntryComponent entry={entry('error', ['something went wrong'])} />)
    const el = screen.getByText('something went wrong')
    expect(el.textContent).toBe('something went wrong')
    // No wrapping quotes
    expect(el.closest('div')!.textContent).not.toContain('"something went wrong"')
  })

  it('renders error string args inheriting parent color (no type-string override)', () => {
    render(<ConsoleEntryComponent entry={entry('error', ['bad input'])} />)
    const el = screen.getByText('bad input')
    // The span itself should NOT have an inline color (inherits var(--danger) from parent div)
    expect(el.style.color).toBe('')
  })

  it('renders multiple error string args without quotes', () => {
    render(<ConsoleEntryComponent entry={entry('error', ['error:', 'file not found'])} />)
    expect(screen.getByText('error:')).toBeTruthy()
    expect(screen.getByText('file not found')).toBeTruthy()
    const container = screen.getByText('error:').closest('div')!
    expect(container.textContent).not.toContain('"error:"')
    expect(container.textContent).not.toContain('"file not found"')
  })

  it('renders serialized Error objects with message', () => {
    const err = { __type: 'Error', message: 'ReferenceError: x is not defined', stack: 'at line 5' }
    render(<ConsoleEntryComponent entry={entry('error', [err])} />)
    expect(screen.getByText(/ReferenceError: x is not defined/)).toBeTruthy()
  })

  // --- Log entries: strings should have quotes and type color ---

  it('renders log string args with quotes', () => {
    render(<ConsoleEntryComponent entry={entry('log', ['hello'])} />)
    const el = screen.getByText(/"hello"/)
    expect(el).toBeTruthy()
    expect(el.style.color).toBe('var(--type-string)')
  })

  it('renders log number args with number color', () => {
    render(<ConsoleEntryComponent entry={entry('log', [42])} />)
    const el = screen.getByText('42')
    expect(el.style.color).toBe('var(--type-number)')
  })

  it('renders log boolean args with boolean color', () => {
    render(<ConsoleEntryComponent entry={entry('log', [true])} />)
    const el = screen.getByText('true')
    expect(el.style.color).toBe('var(--type-boolean)')
  })

  it('renders log null with tertiary color', () => {
    render(<ConsoleEntryComponent entry={entry('log', [null])} />)
    const el = screen.getByText('null')
    expect(el.style.color).toBe('var(--text-tertiary)')
  })

  it('renders undefined sentinel as "undefined"', () => {
    render(<ConsoleEntryComponent entry={entry('log', [{ __type: 'Undefined' }])} />)
    expect(screen.getByText('undefined')).toBeTruthy()
  })

  // --- Warn/info entries: strings still get typed rendering ---

  it('renders warn string args with quotes', () => {
    render(<ConsoleEntryComponent entry={entry('warn', ['caution'])} />)
    expect(screen.getByText(/"caution"/)).toBeTruthy()
  })

  // --- Bigint, function, symbol rendering ---

  it('renders bigint string without quotes', () => {
    render(<ConsoleEntryComponent entry={entry('log', ['42n'])} />)
    const el = screen.getByText('42n')
    expect(el.style.color).toBe('var(--type-number)')
    expect(el.closest('div')!.textContent).not.toContain('"42n"')
  })

  it('renders function string without quotes', () => {
    render(<ConsoleEntryComponent entry={entry('log', ['[Function: foo]'])} />)
    const el = screen.getByText('[Function: foo]')
    expect(el.style.color).toBe('var(--type-function)')
  })

  // --- Expression results (LastExpression) ---

  it('renders primitive expression result with typed color', () => {
    render(<ConsoleEntryComponent entry={entry('log', [{ __type: 'LastExpression', value: 42 }])} />)
    const el = screen.getByText('42')
    expect(el.style.color).toBe('var(--type-number)')
  })

  it('renders string expression result with quotes', () => {
    render(<ConsoleEntryComponent entry={entry('log', [{ __type: 'LastExpression', value: 'hello' }])} />)
    expect(screen.getByText(/"hello"/)).toBeTruthy()
  })
})
