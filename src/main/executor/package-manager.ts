import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { InstalledPackage, PackageOperationResult, PackageSearchResult } from '../../../shared/types'

const PACKAGES_DIR = join(app.getPath('userData'), 'packages')

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
    execSync(`pnpm add ${name}`, {
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
    execSync(`pnpm remove ${name}`, {
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
