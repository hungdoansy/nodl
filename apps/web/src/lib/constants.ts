import desktopPkg from '../../../desktop/package.json'

/**
 * Plain-data constants. JSX-bearing copy (e.g. feature blurbs that
 * contain <Kbd> components) lives in `apps/web/src/lib/copy.tsx`.
 */

export const APP_NAME = 'nodl'
export const APP_VERSION = desktopPkg.version
export const APP_TAGLINE = 'A scratchpad for TypeScript.'
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

export const QUARANTINE_BYPASS_CMD =
  'xattr -cr /Applications/nodl.app'

export type FeatureIcon =
  | 'Zap'
  | 'FileCode'
  | 'Package'
  | 'Files'
  | 'Command'
  | 'Cpu'
  | 'Sparkles'
  | 'Layers'
