'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TreeValue } from './sampleProgram'

/**
 * Read-only collapsed view of an array / object value, mirroring the
 * desktop app's OutputPane in its "collapsed" state.
 *
 * Rendering:
 *   [chevron] Array (3) [{ id: 1, name: "alice" }, { id: 2, name: "bob" }, …]
 *
 * Interaction:
 *   - The pill (chevron + type tag) keeps its hover background so the
 *     visual rhythm matches the real app, but clicking is a no-op —
 *     this is a marketing preview, not a live debugger.
 *   - No expand/collapse logic, no React state, no recursive depth
 *     handling. One render path.
 *
 * The preview after the pill is informational — Chrome-DevTools-style
 * one-level-deep rendering so collapsed content is actually readable.
 */
export function ObjectTree({ value }: { value: TreeValue }) {
  switch (value.kind) {
    case 'string':
      return <span className="text-type-string">&quot;{value.text}&quot;</span>
    case 'number':
      return <span className="text-type-number">{value.value}</span>
    case 'boolean':
      return (
        <span className="text-type-boolean">{String(value.value)}</span>
      )
    case 'array': {
      const len = value.items.length
      return (
        <Header
          tag={
            <>
              <span className="text-text-secondary">Array</span>{' '}
              <span className="text-text-tertiary/70">({len})</span>
            </>
          }
          preview={
            <span className="text-text-secondary">
              [
              {value.items.slice(0, 3).map((item, i) => (
                <span key={i}>
                  {i > 0 ? ', ' : ''}
                  <InlinePreview value={item} />
                </span>
              ))}
              {value.items.length > 3 ? ', …' : ''}]
            </span>
          }
        />
      )
    }
    case 'object': {
      const len = value.entries.length
      return (
        <Header
          tag={
            <>
              <span className="text-text-secondary">Object</span>{' '}
              <span className="text-text-tertiary/70">{`{${len}}`}</span>
            </>
          }
          preview={<InlinePreview value={value} />}
        />
      )
    }
  }
}

/**
 * The pill (chevron + tag) plus the inline preview after it.
 * Pill keeps its hover state for visual fidelity with the real app, but
 * it's a static visual — no click handler, no cursor change.
 */
function Header({ tag, preview }: { tag: ReactNode; preview: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className="inline-flex items-center gap-1 rounded-sm px-[3px] py-px transition-colors hover:bg-bg-hover">
        <ChevronRight
          size={12}
          strokeWidth={2}
          className="flex-shrink-0 text-text-tertiary"
          aria-hidden="true"
        />
        {tag}
      </span>
      {preview}
    </span>
  )
}

/**
 * Inline preview rendered next to a collapsed Array/Object header.
 * Mimics Chrome DevTools: one level deep is rendered as real content
 * so you can read `{ id: 1, name: "alice" }` without expanding, but
 * deeper nesting is abbreviated to a placeholder so the line stays
 * single-line and readable.
 */
function InlinePreview({ value }: { value: TreeValue }) {
  switch (value.kind) {
    case 'string':
      return <span className="text-type-string">&quot;{value.text}&quot;</span>
    case 'number':
      return <span className="text-type-number">{value.value}</span>
    case 'boolean':
      return (
        <span className="text-type-boolean">{String(value.value)}</span>
      )
    case 'array': {
      const shown = value.items.slice(0, 3)
      const rest = value.items.length - shown.length
      return (
        <span className="text-text-secondary">
          [
          {shown.map((item, i) => (
            <span key={i}>
              {i > 0 ? ', ' : ''}
              <PrimitivePreview value={item} />
            </span>
          ))}
          {rest > 0 ? ', …' : ''}]
        </span>
      )
    }
    case 'object': {
      const shown = value.entries.slice(0, 2)
      const rest = value.entries.length - shown.length
      return (
        <span className="text-text-secondary">
          {'{ '}
          {shown.map((e, i) => (
            <span key={e.key}>
              {i > 0 ? ', ' : ''}
              <span className="text-text-primary">{e.key}</span>
              {': '}
              <PrimitivePreview value={e.value} />
            </span>
          ))}
          {rest > 0 ? ', …' : ''}
          {' }'}
        </span>
      )
    }
  }
}

/** Innermost preview — primitives only, structures are abbreviated. */
function PrimitivePreview({ value }: { value: TreeValue }) {
  switch (value.kind) {
    case 'string':
      return <span className="text-type-string">&quot;{value.text}&quot;</span>
    case 'number':
      return <span className="text-type-number">{value.value}</span>
    case 'boolean':
      return <span className="text-type-boolean">{String(value.value)}</span>
    case 'array':
      return <span className="text-text-tertiary">Array({value.items.length})</span>
    case 'object':
      return <span className="text-text-tertiary">{'{…}'}</span>
  }
}
