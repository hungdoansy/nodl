import type { ReactNode } from 'react'

/* ─── Token primitives (Monaco-aligned colours) ─── */
export const KW = ({ children }: { children: ReactNode }) => (
  <span className="text-type-boolean">{children}</span>
)
export const STR = ({ children }: { children: ReactNode }) => (
  <span className="text-type-string">{children}</span>
)
export const NUM = ({ children }: { children: ReactNode }) => (
  <span className="text-type-number">{children}</span>
)
export const FN = ({ children }: { children: ReactNode }) => (
  <span className="text-type-function">{children}</span>
)
export const COM = ({ children }: { children: ReactNode }) => (
  <span className="text-type-comment italic">{children}</span>
)
export const PUNC = ({ children }: { children: ReactNode }) => (
  <span className="text-text-secondary">{children}</span>
)
export const TYPE = ({ children }: { children: ReactNode }) => (
  <span className="text-type-tstype">{children}</span>
)

/* ─── Structured output values ─── */

/** A value that the output pane should render via ObjectTree. */
export type TreeValue =
  | { kind: 'array'; items: TreeValue[] }
  | { kind: 'object'; entries: Array<{ key: string; value: TreeValue }> }
  | { kind: 'string'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }

export type OutputValue =
  | { kind: 'primitive'; node: ReactNode; text: string }
  | { kind: 'tree'; tree: TreeValue; text: string }

export type CodeLine = {
  /** Tokenised code for the editor pane. */
  code: ReactNode
  /** Output value for this line (or null for non-result lines). */
  output: OutputValue | null
}

/* ─── Helpers for building small sample values ─── */
const prim = (node: ReactNode, text: string): OutputValue => ({
  kind: 'primitive',
  node,
  text
})

const makeUser = (id: number, name: string): TreeValue => ({
  kind: 'object',
  entries: [
    { key: 'id', value: { kind: 'number', value: id } },
    { key: 'name', value: { kind: 'string', text: name } }
  ]
})

const usersArray: TreeValue = {
  kind: 'array',
  items: [makeUser(1, 'alice'), makeUser(2, 'bob'), makeUser(3, 'carol')]
}

const namesArray: TreeValue = {
  kind: 'array',
  items: [
    { kind: 'string', text: 'alice' },
    { kind: 'string', text: 'bob' },
    { kind: 'string', text: 'carol' }
  ]
}

const blank: CodeLine = {
  code: <span className="select-none">&nbsp;</span>,
  output: null
}

/* ─── Sample program (short, readable, no top-level await) ─── */
export const SAMPLE_LINES: CodeLine[] = [
  {
    code: (
      <>
        <KW>type</KW> <TYPE>User</TYPE> <PUNC>=</PUNC> <PUNC>{'{'}</PUNC>{' '}
        id<PUNC>:</PUNC> <TYPE>number</TYPE>
        <PUNC>;</PUNC> name<PUNC>:</PUNC> <TYPE>string</TYPE>{' '}
        <PUNC>{'}'}</PUNC>
      </>
    ),
    output: null
  },
  blank,
  {
    code: (
      <>
        <KW>const</KW> users<PUNC>:</PUNC> <TYPE>User</TYPE>
        <PUNC>[]</PUNC> <PUNC>=</PUNC> <PUNC>[</PUNC>
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        {'  '}<PUNC>{'{'}</PUNC> id<PUNC>:</PUNC> <NUM>1</NUM>, name
        <PUNC>:</PUNC> <STR>&#39;alice&#39;</STR> <PUNC>{'},'}</PUNC>
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        {'  '}<PUNC>{'{'}</PUNC> id<PUNC>:</PUNC> <NUM>2</NUM>, name
        <PUNC>:</PUNC> <STR>&#39;bob&#39;</STR> <PUNC>{'},'}</PUNC>
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        {'  '}<PUNC>{'{'}</PUNC> id<PUNC>:</PUNC> <NUM>3</NUM>, name
        <PUNC>:</PUNC> <STR>&#39;carol&#39;</STR> <PUNC>{' }'}</PUNC>
      </>
    ),
    output: null
  },
  {
    code: <PUNC>]</PUNC>,
    output: null
  },
  blank,
  {
    code: (
      <>
        users<PUNC>.</PUNC>length
      </>
    ),
    output: prim(<NUM>3</NUM>, '3')
  },
  {
    code: (
      <>
        users<PUNC>[</PUNC>
        <NUM>0</NUM>
        <PUNC>]</PUNC>
      </>
    ),
    output: {
      kind: 'tree',
      tree: makeUser(1, 'alice'),
      text: '{ id: 1, name: "alice" }'
    }
  },
  {
    code: (
      <>
        users<PUNC>.</PUNC>
        <FN>map</FN>
        <PUNC>(</PUNC>u <PUNC>{'=>'}</PUNC> u<PUNC>.</PUNC>name
        <PUNC>)</PUNC>
      </>
    ),
    output: {
      kind: 'tree',
      tree: namesArray,
      text: '["alice", "bob", "carol"]'
    }
  },
  blank,
  {
    code: (
      <>
        users<PUNC>.</PUNC>
        <FN>filter</FN>
        <PUNC>(</PUNC>u <PUNC>{'=>'}</PUNC> u<PUNC>.</PUNC>id <PUNC>%</PUNC>{' '}
        <NUM>2</NUM>
        <PUNC>)</PUNC>
      </>
    ),
    output: {
      kind: 'tree',
      tree: { kind: 'array', items: [makeUser(1, 'alice'), makeUser(3, 'carol')] },
      text: '[{ id: 1, name: "alice" }, { id: 3, name: "carol" }]'
    }
  },
  blank,
  {
    code: <COM>// Toggle Auto to re-run as you type.</COM>,
    output: null
  }
]

/** Plain-text version used by the Copy button. */
export const CONSOLE_TEXT = SAMPLE_LINES
  .filter((l) => l.output !== null)
  .map((l) => l.output!.text)
  .join('\n')
