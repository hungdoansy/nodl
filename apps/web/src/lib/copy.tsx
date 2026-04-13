import type { ReactNode } from 'react'
import { Kbd } from '@/components/Kbd'
import type { FeatureIcon } from './constants'

export type Feature = {
  icon: FeatureIcon
  title: string
  blurb: ReactNode
}

export const FEATURES: Feature[] = [
  {
    icon: 'Zap',
    title: 'Instant inline output',
    blurb: 'See the result of every line right next to where you wrote it.'
  },
  {
    icon: 'FileCode',
    title: 'TypeScript, zero config',
    blurb: 'Strip types, run code. No tsconfig. No build step. Just write.'
  },
  {
    icon: 'Package',
    title: 'Real npm packages',
    blurb: 'Install from the sidebar. Import like any project. Including types.'
  },
  {
    icon: 'Files',
    title: 'Multi-tab scratchpads',
    blurb: (
      <>
        Keep experiments separate. Switch with{' '}
        <span className="inline-flex items-center gap-1 align-middle">
          <Kbd k="mod" />
          <Kbd k="P" />
        </span>
        . Auto-saved.
      </>
    )
  },
  {
    icon: 'Command',
    title: 'Keyboard-first',
    blurb: (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <span className="inline-flex items-center gap-1">
          <Kbd k="mod" />
          <Kbd k="enter" />
        </span>
        <span>to run</span>
        <span className="text-text-tertiary/40">·</span>
        <span className="inline-flex items-center gap-1">
          <Kbd k="mod" />
          <Kbd k="S" />
        </span>
        <span>to save</span>
        <span className="text-text-tertiary/40">·</span>
        <span className="inline-flex items-center gap-1">
          <Kbd k="mod" />
          <Kbd k="P" />
        </span>
        <span>for tabs</span>
      </span>
    )
  },
  {
    icon: 'Cpu',
    title: 'Native desktop speed',
    blurb: 'No browser tab. No sandbox tax. Electron + Node, all yours.'
  }
]

export type HowItWorksStep = {
  ordinal: string
  title: string
  description: string
  hint: ReactNode
}

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    ordinal: '01',
    title: 'Write code',
    description:
      'Open a tab, drop in a snippet. Full TypeScript. Familiar Monaco editor.',
    hint: <span>const users = [...]</span>
  },
  {
    ordinal: '02',
    title: 'Hit run',
    description:
      'Code transpiles, executes in a forked Node worker, and streams output back.',
    hint: (
      <span className="inline-flex items-center gap-1">
        <Kbd k="mod" />
        <Kbd k="enter" />
      </span>
    )
  },
  {
    ordinal: '03',
    title: 'See it inline',
    description:
      'Each value shows up next to the line that produced it. Async, errors, console.log — all aligned.',
    hint: <span>// → 3</span>
  }
]
