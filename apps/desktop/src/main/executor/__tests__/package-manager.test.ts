// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { delimiter, join } from 'path'
import { tmpdir } from 'os'

const testRoot = join(tmpdir(), `nodl-package-manager-test-${process.pid}`)
const userDataDir = join(testRoot, 'user-data')
const nvmDir = join(testRoot, 'nvm')
const npmBinDir = join(nvmDir, 'versions', 'node', 'v24.4.0', 'bin')
const npmPath = join(npmBinDir, 'npm')

// Mock electron before importing package-manager
vi.mock('electron', () => ({
  app: { getPath: () => userDataDir }
}))

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

import { execSync } from 'child_process'

/** Fresh module instance — package-manager memoizes the resolved npm path */
async function loadPackageManager() {
  vi.resetModules()
  return import('../package-manager')
}

/** Reads the PATH entry of a spawn env, whatever its casing */
function envPath(env: NodeJS.ProcessEnv | undefined): string | undefined {
  if (!env) return undefined
  const key = Object.keys(env).find(k => k.toUpperCase() === 'PATH')
  return key ? env[key] : undefined
}

describe('package manager', () => {
  const originalNvmDir = process.env.NVM_DIR
  const originalPath = process.env.PATH
  const systemPath = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(delimiter)

  beforeEach(() => {
    rmSync(testRoot, { recursive: true, force: true })
    mkdirSync(npmBinDir, { recursive: true })
    writeFileSync(npmPath, '#!/usr/bin/env node\n')
    process.env.NVM_DIR = nvmDir
    process.env.PATH = systemPath

    vi.mocked(execSync).mockImplementation((command, options) => {
      const cmd = String(command)
      const path = envPath((options as { env?: NodeJS.ProcessEnv } | undefined)?.env)

      // Only the nvm npm exists, and its `#!/usr/bin/env node` launcher needs
      // Node's sibling bin directory on PATH to run at all
      if (!cmd.startsWith(`"${npmPath}"`)) throw new Error('npm not found')
      if (!path?.split(delimiter).includes(npmBinDir)) {
        throw new Error('env: node: No such file or directory')
      }

      if (cmd.includes(' --version')) return Buffer.from('10.9.0\n')

      const packageJsonPath = join(userDataDir, 'packages', 'package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      packageJson.dependencies = { dotenv: '17.0.0' }
      writeFileSync(packageJsonPath, JSON.stringify(packageJson))
      return Buffer.from('')
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    rmSync(testRoot, { recursive: true, force: true })
    if (originalNvmDir === undefined) delete process.env.NVM_DIR
    else process.env.NVM_DIR = originalNvmDir
    if (originalPath === undefined) delete process.env.PATH
    else process.env.PATH = originalPath
  })

  function installCallEnv(): NodeJS.ProcessEnv {
    const call = vi.mocked(execSync).mock.calls.find(([command]) =>
      String(command).includes(' install --save-exact ')
    )
    return (call?.[1] as { env: NodeJS.ProcessEnv }).env
  }

  it('adds an nvm npm bin directory to PATH before installing a package', async () => {
    const { installPackage } = await loadPackageManager()

    expect(installPackage('dotenv')).toEqual({ success: true, name: 'dotenv', version: '17.0.0' })

    const path = envPath(installCallEnv())
    expect(path?.split(delimiter)[0]).toBe(npmBinDir)
    expect(path?.split(delimiter)).toEqual(expect.arrayContaining(systemPath.split(delimiter)))
  })

  it('probes candidate npm binaries with the augmented PATH', async () => {
    const { getPackagePaths } = await loadPackageManager()

    expect(getPackagePaths().npmPath).toBe(npmPath)

    const probeCall = vi.mocked(execSync).mock.calls.find(([command]) =>
      String(command) === `"${npmPath}" --version`
    )
    const path = envPath((probeCall?.[1] as { env?: NodeJS.ProcessEnv } | undefined)?.env)
    expect(path?.split(delimiter)[0]).toBe(npmBinDir)
  })

  it('prepends to the existing PATH key regardless of its casing', async () => {
    delete process.env.PATH
    process.env.Path = systemPath
    try {
      const { installPackage } = await loadPackageManager()
      expect(installPackage('dotenv').success).toBe(true)

      const env = installCallEnv()
      const pathKeys = Object.keys(env).filter(k => k.toUpperCase() === 'PATH')
      expect(pathKeys).toHaveLength(1)
      expect(env[pathKeys[0]]?.split(delimiter)).toEqual([npmBinDir, ...systemPath.split(delimiter)])
    } finally {
      delete process.env.Path
      process.env.PATH = systemPath
    }
  })
})
