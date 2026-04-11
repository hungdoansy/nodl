import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import type { InstalledPackage, PackageOperationResult, PackageSearchResult } from '../../../shared/types'

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
    execSync(`"${npm}" install ${name}`, {
      cwd: PACKAGES_DIR,
      stdio: 'pipe',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: '' }
    })

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
