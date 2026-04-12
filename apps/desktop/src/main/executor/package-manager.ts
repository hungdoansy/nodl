import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import type { InstalledPackage, PackageOperationResult, PackageSearchResult, TypeDefInfo } from '../../../shared/types'

const PACKAGES_DIR = join(app.getPath('userData'), 'packages')

/**
 * Find the npm binary.
 *
 * In dev mode npm is on PATH. In the packaged .app Electron launches with a
 * minimal system PATH (/usr/bin:/bin:/usr/sbin:/sbin) so npm is invisible.
 * We search well-known locations explicitly.
 */
function resolveNpm(): string {
  const home = homedir()
  const isWin = process.platform === 'win32'

  const candidates = [
    // Shell PATH (works in dev / terminal launch)
    isWin ? 'npm.cmd' : 'npm',
    // Homebrew — Intel Mac
    '/usr/local/bin/npm',
    // Homebrew — Apple Silicon
    '/opt/homebrew/bin/npm',
    // Windows — Node.js official installer
    'C:\\Program Files\\nodejs\\npm.cmd',
    join(home, 'AppData', 'Roaming', 'npm', 'npm.cmd'),
    // Windows — Scoop
    join(home, 'scoop', 'shims', 'npm.cmd'),
  ]

  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: 'pipe', timeout: 3000 })
      return bin
    } catch {
      // not available — try next
    }
  }

  // Last resort: scan nvm versions (macOS/Linux), newest Node first
  try {
    const nvmDir = process.env.NVM_DIR ?? join(home, '.nvm')
    const versionsDir = join(nvmDir, 'versions', 'node')
    if (existsSync(versionsDir)) {
      const versions = readdirSync(versionsDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => {
          const [aMaj = 0, aMin = 0] = a.slice(1).split('.').map(Number)
          const [bMaj = 0, bMin = 0] = b.slice(1).split('.').map(Number)
          return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin
        })
      for (const v of versions) {
        const npmPath = join(versionsDir, v, 'bin', 'npm')
        if (existsSync(npmPath)) return npmPath
      }
    }
  } catch {
    // nvm not present
  }

  throw new Error('npm not found. Install Node.js from https://nodejs.org')
}

// Resolved once per app session
let _npm: string | null = null
function getNpm(): string {
  if (!_npm) _npm = resolveNpm()
  return _npm
}

function ensurePackagesDir(): void {
  if (!existsSync(PACKAGES_DIR)) {
    mkdirSync(PACKAGES_DIR, { recursive: true })
  }
  const pkgJsonPath = join(PACKAGES_DIR, 'package.json')
  if (!existsSync(pkgJsonPath)) {
    writeFileSync(pkgJsonPath, JSON.stringify({ name: 'nodl-packages', version: '1.0.0', private: true }, null, 2))
  }
}

export function getPackagesDir(): string {
  ensurePackagesDir()
  return PACKAGES_DIR
}

export function getNodeModulesPath(): string {
  return join(PACKAGES_DIR, 'node_modules')
}

export function installPackage(name: string): PackageOperationResult {
  ensurePackagesDir()
  try {
    const npm = getNpm()
    // --save-exact pins the version (no ^ or ~ range prefix)
    execSync(`"${npm}" install --save-exact ${name}`, {
      cwd: PACKAGES_DIR,
      stdio: 'pipe',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: '' }
    })

    // name may be "axios@1.7.9" — extract bare name for lookup
    const bareName = name.includes('@') && !name.startsWith('@')
      ? name.split('@')[0]
      : name.startsWith('@')
        ? '@' + name.slice(1).split('@')[0]  // scoped: @scope/pkg@version
        : name

    const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, 'package.json'), 'utf-8'))
    const deps = pkgJson.dependencies ?? {}
    const version = deps[bareName] ?? deps[bareName.split('/').pop()!] ?? 'unknown'

    return { success: true, name: bareName, version: version.replace(/^\^|~/, '') }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, name, error: msg }
  }
}

/**
 * Fetch latest versions for a list of packages from the npm registry.
 * Returns a map of packageName → latestVersion for packages that have updates.
 */
export async function checkPackageUpdates(
  packages: { name: string; version: string }[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  await Promise.all(
    packages.map(async ({ name, version }) => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${name}/latest`)
        if (!res.ok) return
        const data = await res.json() as { version: string }
        if (data.version && isNewer(data.version, version)) {
          results[name] = data.version
        }
      } catch {
        // network error or package not found — skip
      }
    })
  )
  return results
}

function isNewer(latest: string, installed: string): boolean {
  const parse = (v: string) => v.replace(/^\^|~/, '').split('.').map(n => parseInt(n, 10) || 0)
  const [lMaj, lMin, lPatch] = parse(latest)
  const [iMaj, iMin, iPatch] = parse(installed)
  if (lMaj !== iMaj) return lMaj > iMaj
  if (lMin !== iMin) return lMin > iMin
  return lPatch > iPatch
}

/** Returns the resolved npm binary path, packages storage directory, and user data directory. */
export function getPackagePaths(): { npmPath: string; packagesDir: string; userDataDir: string } {
  let npmPath: string
  try {
    npmPath = getNpm()
  } catch {
    npmPath = 'npm not found'
  }
  return { npmPath, packagesDir: PACKAGES_DIR, userDataDir: app.getPath('userData') }
}

export function removePackage(name: string): PackageOperationResult {
  ensurePackagesDir()
  try {
    const npm = getNpm()
    execSync(`"${npm}" uninstall ${name}`, {
      cwd: PACKAGES_DIR,
      stdio: 'pipe',
      timeout: 30000
    })
    return { success: true, name }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, name, error: msg }
  }
}

export function listPackages(): InstalledPackage[] {
  ensurePackagesDir()
  try {
    const pkgJsonPath = join(PACKAGES_DIR, 'package.json')
    if (!existsSync(pkgJsonPath)) return []
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    const deps = pkgJson.dependencies ?? {}
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version: String(version).replace(/^\^|~/, '')
    }))
  } catch {
    return []
  }
}

export async function searchPackages(query: string): Promise<PackageSearchResult[]> {
  if (!query.trim()) return []
  try {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as {
      objects: Array<{
        package: { name: string; description?: string; version: string; date: string }
      }>
    }
    return data.objects.map((obj) => ({
      name: obj.package.name,
      description: obj.package.description ?? '',
      version: obj.package.version,
      date: obj.package.date
    }))
  } catch {
    return []
  }
}

/**
 * Recursively scan a directory for all .d.ts files.
 * Returns each file with its path relative to nodeModulesDir.
 * This handles packages like @types/lodash which have:
 *   - index.d.ts (entry with /// <reference path> to common/*.d.ts)
 *   - common/*.d.ts (module augmentation files)
 *   - join.d.ts, map.d.ts, etc. (per-method files for "lodash/join" imports)
 */
export function collectAllDtsFiles(
  pkgDir: string,
  nodeModulesDir: string
): { relativePath: string; content: string }[] {
  const files: { relativePath: string; content: string }[] = []
  const nmPrefix = nodeModulesDir.replace(/\\/g, '/') + '/'

  function scan(dir: string) {
    let entries: string[]
    try { entries = readdirSync(dir) } catch { return }

    for (const entry of entries) {
      if (entry === 'node_modules') continue
      const fullPath = join(dir, entry)
      try {
        const stat = require('fs').statSync(fullPath)
        if (stat.isDirectory()) {
          scan(fullPath)
        } else if (entry.endsWith('.d.ts')) {
          const content = readFileSync(fullPath, 'utf-8')
          const relative = fullPath.replace(/\\/g, '/').replace(nmPrefix, '')
          files.push({ relativePath: relative, content })
        }
      } catch { /* skip unreadable entries */ }
    }
  }

  scan(pkgDir)
  return files
}

/**
 * Read .d.ts files from installed packages that ship their own types.
 * Scans ALL .d.ts files in the package directory so both entry-referenced
 * files (common/*.d.ts) and per-method files (join.d.ts, map.d.ts) are
 * loaded. This supports both `import _ from "lodash"` and
 * `import join from "lodash/join"` style imports.
 */
export function getTypeDefinitions(): TypeDefInfo[] {
  const nodeModules = join(PACKAGES_DIR, 'node_modules')
  if (!existsSync(nodeModules)) return []

  const packages = listPackages()
  const results: TypeDefInfo[] = []

  for (const pkg of packages) {
    try {
      const pkgDir = join(nodeModules, pkg.name)
      const pkgJsonPath = join(pkgDir, 'package.json')
      if (!existsSync(pkgJsonPath)) continue

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
      const typesField = pkgJson.types ?? pkgJson.typings

      // Only load types if the package has a types entry or index.d.ts
      const hasTypes = typesField
        ? existsSync(join(pkgDir, typesField))
        : existsSync(join(pkgDir, 'index.d.ts'))

      if (hasTypes) {
        // Include package.json so TypeScript's module resolution finds the types field
        results.push({ packageName: pkg.name, filePath: `${pkg.name}/package.json`, content: readFileSync(pkgJsonPath, 'utf-8') })
        // Include all .d.ts files
        const files = collectAllDtsFiles(pkgDir, nodeModules)
        for (const file of files) {
          results.push({ packageName: pkg.name, filePath: file.relativePath, content: file.content })
        }
      }
    } catch {
      // Skip packages whose types can't be read
    }
  }

  return results
}
