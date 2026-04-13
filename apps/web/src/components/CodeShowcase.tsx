import { ArrowLeft } from 'lucide-react'
import { WindowChrome } from './WindowChrome'
import { RevealOnScroll } from './RevealOnScroll'

/**
 * Two-pane fake-editor showcase. Mirrors the desktop app's editor + output
 * alignment exactly: code on the left, results inline on the right, joined
 * by a small `<-` arrow with a line-number gutter on the far left.
 *
 * No syntax highlighter dependency — tokens are hand-coloured spans.
 */
export function CodeShowcase() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
              See it in action
            </p>
            <h2 className="mt-3 text-balance text-[32px] font-semibold leading-tight tracking-tight text-text-bright sm:text-[40px]">
              The result lives next to the code.
            </h2>
            <p className="mt-4 text-balance text-[16px] leading-relaxed text-text-secondary">
              No console tab. No <code className="font-mono text-text-primary">console.log</code> ceremony.
              Every value lands on the line that produced it.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.05} className="mt-14">
          <WindowChrome
            title="users.ts — nodl"
            className="mx-auto max-w-4xl"
          >
            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] divide-x divide-border-subtle font-mono text-[13.5px] leading-[1.7]">
              {/* Editor pane */}
              <div className="overflow-hidden">
                <CodeBlock />
              </div>
              {/* Output pane */}
              <div className="overflow-hidden bg-bg-primary/60">
                <OutputBlock />
              </div>
            </div>
          </WindowChrome>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ─── Pre-tokenised lines ─────────────────────────────────────── */

type CodeLine = {
  /** rendered code tokens */
  code: React.ReactNode
  /** rendered output tokens (or null for blank/structural lines) */
  output: React.ReactNode | null
}

const KW = ({ children }: { children: React.ReactNode }) => (
  <span className="text-type-boolean">{children}</span>
)
const STR = ({ children }: { children: React.ReactNode }) => (
  <span className="text-type-string">{children}</span>
)
const NUM = ({ children }: { children: React.ReactNode }) => (
  <span className="text-type-number">{children}</span>
)
const FN = ({ children }: { children: React.ReactNode }) => (
  <span className="text-type-function">{children}</span>
)
const COM = ({ children }: { children: React.ReactNode }) => (
  <span className="text-type-comment italic">{children}</span>
)
const PUNC = ({ children }: { children: React.ReactNode }) => (
  <span className="text-text-secondary">{children}</span>
)

const LINES: CodeLine[] = [
  {
    code: (
      <>
        <KW>const</KW> users <PUNC>=</PUNC> <PUNC>[</PUNC>
        <NUM>1</NUM>, <NUM>2</NUM>, <NUM>3</NUM>
        <PUNC>]</PUNC>
        <PUNC>.</PUNC>
        <FN>map</FN>
        <PUNC>(</PUNC>n <PUNC>{'=>'}</PUNC> <PUNC>{'({'}</PUNC>
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        {'  '}id<PUNC>:</PUNC> n,
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        {'  '}name<PUNC>:</PUNC> <STR>{'`user-${n}`'}</STR>
      </>
    ),
    output: null
  },
  {
    code: (
      <>
        <PUNC>{'}))'}</PUNC>
      </>
    ),
    output: null
  },
  { code: <span className="select-none">&nbsp;</span>, output: null },
  {
    code: (
      <>
        users<PUNC>.</PUNC>length
      </>
    ),
    output: <NUM>3</NUM>
  },
  {
    code: (
      <>
        users<PUNC>[</PUNC>
        <NUM>0</NUM>
        <PUNC>]</PUNC>
      </>
    ),
    output: (
      <>
        <PUNC>{'{ '}</PUNC>id<PUNC>:</PUNC> <NUM>1</NUM>, name<PUNC>:</PUNC>{' '}
        <STR>&quot;user-1&quot;</STR>
        <PUNC>{' }'}</PUNC>
      </>
    )
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
    output: (
      <>
        <PUNC>[</PUNC>
        <STR>&quot;user-1&quot;</STR>, <STR>&quot;user-2&quot;</STR>,{' '}
        <STR>&quot;user-3&quot;</STR>
        <PUNC>]</PUNC>
      </>
    )
  },
  { code: <span className="select-none">&nbsp;</span>, output: null },
  {
    code: (
      <>
        <KW>await</KW> <FN>fetch</FN>
        <PUNC>(</PUNC>
        <STR>&quot;/api/health&quot;</STR>
        <PUNC>)</PUNC>
      </>
    ),
    output: (
      <>
        Response <PUNC>{'{ '}</PUNC>ok<PUNC>:</PUNC>{' '}
        <span className="text-type-boolean">true</span>
        <PUNC>{' }'}</PUNC>
      </>
    )
  },
  { code: <span className="select-none">&nbsp;</span>, output: null },
  {
    code: (
      <>
        <COM>// Async, errors, console.log — all aligned.</COM>
      </>
    ),
    output: null
  }
]

const LINE_HEIGHT_PX = 24

function CodeBlock() {
  return (
    <div className="py-4">
      {LINES.map((line, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4"
          style={{ height: LINE_HEIGHT_PX }}
        >
          <span className="select-none pt-px font-mono text-[11.5px] tabular-nums text-text-tertiary/60">
            {String(i + 1).padStart(2, ' ')}
          </span>
          <span className="text-text-primary">{line.code}</span>
        </div>
      ))}
    </div>
  )
}

function OutputBlock() {
  return (
    <div className="py-4">
      {LINES.map((line, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-4"
          style={{ height: LINE_HEIGHT_PX }}
        >
          {line.output !== null ? (
            <>
              <ArrowLeft
                size={11}
                strokeWidth={2}
                className="mt-[5px] flex-shrink-0 text-text-tertiary/70"
                aria-hidden="true"
              />
              <span className="text-text-primary">{line.output}</span>
            </>
          ) : (
            <span className="select-none">&nbsp;</span>
          )}
        </div>
      ))}
    </div>
  )
}
