import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import type { InstalledPackage, PackageOperationResult, PackageSearchResult } from '../../../shared/types'

const PACKAGES_DIR = join(app.getPath('userData'), 'packages')

/**
 * Find a usable npm or pnpm binary.
 *
 * In dev mode the shell PATH contains the right binary. In the packaged .app
 * Electron launches with a minimal system PATH (/usr/bin:/bin:/usr/sbin:/sbin)
 * so pnpm/npm are invisible. We search well-known locations explicitly.
 */
function resolvePackageManager(): string {
  const home = homedir()

  const candidates = [
    // Shell PATH (works in dev / when launched from terminal)
    'npm',
    'pnpm',
    // Homebrew — Intel Mac
    '/usr/local/bin/npm',
    '/usr/local/bin/pnpm',
    // Homebrew — Apple Silicon
    '/opt/homebrew/bin/npm',
    '/opt/homebrew/bin/pnpm',
    // pnpm standalone installer default location
    join(home, 'Library', 'pnpm', 'pnpm'),
    join(home, '.local', 'share', 'pnpm', 'pnpm'),
  ]

  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: 'pipe', timeout: 3000 })
      return bin
    } catch {
      // not available — try next
    }
  }

  // Last resort: find npm inside nvm (use the highest installed version)
  try {
    const nvmDir = process.env.NVM_DIR ?? join(home, '.nvm')
    const versionsDir = join(nvmDir, 'versions', 'node')
    if (existsSync(versionsDir)) {
      const versions = execSync(`ls -1 "${versionsDir}"`, { stdio: 'pipe' })
        .toString().trim().split('\n').filter(Boolean)
      for (const v of versions.reverse()) {
        const npmPath = join(versionsDir, v, 'bin', 'npm')
        if (existsSync(npmPath)) return npmPath
      }
    }
  } catch {
    // nvm not present
  }

  throw new Error(
    'No package manager found (tried npm, pnpm, Homebrew, pnpm standalone, nvm). ' +
    'Install Node.js from https://nodejs.org or pnpm from https://pnpm.io'
  )
}

// Resolved once per app session
let _pm: string | null = null
function getPackageManager(): string {
  if (!_pm) _pm = resolvePackageManager()
  return _pm
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
    const pm = getPackageManager()
    execSync(`"${pm}" add ${name}`, {
      cwd: PACKAGES_DIR,
      stdio: 'pipe',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: '' }
    })

    // Read installed version from package.json
    const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, 'package.json'), 'utf-8'))
    const deps = pkgJson.dependencies ?? {}
    const version = deps[name] ?? deps[name.split('/').pop()!] ?? 'unknown'

    return { success: true, name, version: version.replace(/^\^|~/, '') }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, name, error: msg }
  }
}

export function removePackage(name: string): PackageOperationResult {
  ensurePackagesDir()
  try {
    const pm = getPackageManager()
    execSync(`"${pm}" remove ${name}`, {
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
