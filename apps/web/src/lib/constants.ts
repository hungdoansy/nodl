import desktopPkg from '../../../desktop/package.json'

/**
 * Source of truth for shared landing-page strings & links.
 * Version is read from the desktop app's package.json at build time
 * so the site auto-updates with each release.
 */

export const APP_NAME = 'nodl'
export const APP_VERSION = desktopPkg.version
export const APP_TAGLINE = 'A scratchpad for JavaScript.'
export const APP_DESCRIPTION =
  'Instant inline output. Full TypeScript. Real npm packages. Native desktop speed.'

export const DOWNLOAD_URL = 'https://github.com/hungdoansy/nodl/releases/latest'
export const GITHUB_URL = 'https://github.com/hungdoansy/nodl'
export const ISSUES_URL = 'https://github.com/hungdoansy/nodl/issues'
export const RELEASES_URL = 'https://github.com/hungdoansy/nodl/releases'
export const AUTHOR_URL = 'https://github.com/hungdoansy'
export const LICENSE_URL =
  'https://github.com/hungdoansy/nodl/blob/main/LICENSE'

export const SYSTEM_REQUIREMENTS = 'macOS 12+ · Apple Silicon & Intel'
export const DOWNLOAD_SIZE_APPROX = '~90 MB'

export type Feature = {
  icon:
    | 'Zap'
    | 'FileCode2'
    | 'Package'
    | 'Files'
    | 'Command'
    | 'Cpu'
    | 'Sparkles'
    | 'Layers'
  title: string
  blurb: string
}

export const FEATURES: Feature[] = [
  {
    icon: 'Zap',
    title: 'Instant inline output',
    blurb: 'See the result of every line right next to where you wrote it.'
  },
  {
    icon: 'FileCode2',
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
    blurb: 'Keep experiments separate. Switch with ⌘P. Auto-saved.'
  },
  {
    icon: 'Command',
    title: 'Keyboard-first',
    blurb: '⌘⏎ to run · ⌘S to save · ⌘L to clear · ⌘P for tabs.'
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
  hint: string
}

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    ordinal: '01',
    title: 'Write code',
    description:
      'Open a tab, drop in a snippet. Full TypeScript. Familiar Monaco editor.',
    hint: 'const users = [...]'
  },
  {
    ordinal: '02',
    title: 'Hit ⌘⏎',
    description:
      'Code transpiles, executes in a forked Node worker, and streams output back.',
    hint: '⌘⏎'
  },
  {
    ordinal: '03',
    title: 'See it inline',
    description:
      'Each value shows up next to the line that produced it. Async, errors, console.log — all aligned.',
    hint: '// → 3'
  }
]
