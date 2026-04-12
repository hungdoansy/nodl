// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock electron before importing package-manager
vi.mock('electron', () => ({
  app: { getPath: () => tmpdir() }
}))

import { collectAllDtsFiles } from '../package-manager'

/**
 * Creates a temp directory structure simulating node_modules with .d.ts files.
 * Returns the node_modules path and a helper to write files relative to it.
 */
function createTempNodeModules() {
  const root = join(tmpdir(), `nodl-dts-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const nodeModules = join(root, 'node_modules')
  mkdirSync(nodeModules, { recursive: true })

  function writeFile(relativePath: string, content: string) {
    const fullPath = join(nodeModules, relativePath)
    mkdirSync(join(fullPath, '..'), { recursive: true })
    writeFileSync(fullPath, content)
  }

  function pkgDir(relativePath: string) {
    return join(nodeModules, relativePath)
  }

  function cleanup() {
    rmSync(root, { recursive: true, force: true })
  }

  return { nodeModules, writeFile, pkgDir, cleanup }
}

describe('collectAllDtsFiles', () => {
  let env: ReturnType<typeof createTempNodeModules>

  beforeEach(() => {
    env = createTempNodeModules()
  })

  afterEach(() => {
    env.cleanup()
  })

  it('returns a single file for a package with only index.d.ts', () => {
    env.writeFile('axios/index.d.ts', 'export function get(url: string): Promise<any>;')

    const files = collectAllDtsFiles(env.pkgDir('axios'), env.nodeModules)

    expect(files).toHaveLength(1)
    expect(files[0].relativePath).toBe('axios/index.d.ts')
    expect(files[0].content).toContain('export function get')
  })

  it('finds .d.ts files in subdirectories', () => {
    env.writeFile('pkg/index.d.ts', 'export declare const main: string;')
    env.writeFile('pkg/sub/types.d.ts', 'export interface Foo { bar: string }')
    env.writeFile('pkg/sub/deep/more.d.ts', 'export type X = number;')

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)

    expect(files).toHaveLength(3)
    const paths = files.map(f => f.relativePath).sort()
    expect(paths).toEqual([
      'pkg/index.d.ts',
      'pkg/sub/deep/more.d.ts',
      'pkg/sub/types.d.ts',
    ])
  })

  it('ignores non-.d.ts files', () => {
    env.writeFile('pkg/index.d.ts', 'export declare const x: number;')
    env.writeFile('pkg/index.js', 'module.exports = {}')
    env.writeFile('pkg/README.md', '# pkg')
    env.writeFile('pkg/types.ts', 'const x = 1') // .ts but not .d.ts

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)

    expect(files).toHaveLength(1)
    expect(files[0].relativePath).toBe('pkg/index.d.ts')
  })

  it('skips nested node_modules', () => {
    env.writeFile('pkg/index.d.ts', 'export declare const x: number;')
    env.writeFile('pkg/node_modules/dep/index.d.ts', 'export declare const dep: string;')

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)

    expect(files).toHaveLength(1)
    expect(files[0].relativePath).toBe('pkg/index.d.ts')
  })

  it('handles @types/lodash structure: entry + common/ + per-method files', () => {
    // Entry file with reference directives
    env.writeFile('@types/lodash/index.d.ts', [
      '/// <reference path="./common/common.d.ts" />',
      '/// <reference path="./common/array.d.ts" />',
      'export = _;',
      'declare const _: _.LoDashStatic;',
      'declare namespace _ { interface LoDashStatic {} }',
    ].join('\n'))

    // Common files (module augmentation)
    env.writeFile('@types/lodash/common/common.d.ts', [
      'import _ = require("../index");',
      'declare module "../index" { interface LoDashStatic { value(): any; } }',
    ].join('\n'))
    env.writeFile('@types/lodash/common/array.d.ts', [
      'import _ = require("../index");',
      'declare module "../index" { interface LoDashStatic { join(arr: any[], sep?: string): string; } }',
    ].join('\n'))

    // Per-method files (for `import join from "lodash/join"`)
    env.writeFile('@types/lodash/join.d.ts', 'import { join } from "./index";\nexport = join;')
    env.writeFile('@types/lodash/map.d.ts', 'import { map } from "./index";\nexport = map;')
    env.writeFile('@types/lodash/filter.d.ts', 'import { filter } from "./index";\nexport = filter;')

    const files = collectAllDtsFiles(env.pkgDir('@types/lodash'), env.nodeModules)

    // 1 index + 2 common + 3 per-method = 6
    expect(files).toHaveLength(6)

    const paths = files.map(f => f.relativePath).sort()
    expect(paths).toContain('@types/lodash/index.d.ts')
    expect(paths).toContain('@types/lodash/common/common.d.ts')
    expect(paths).toContain('@types/lodash/common/array.d.ts')
    expect(paths).toContain('@types/lodash/join.d.ts')
    expect(paths).toContain('@types/lodash/map.d.ts')
    expect(paths).toContain('@types/lodash/filter.d.ts')
  })

  it('preserves file content exactly', () => {
    const content = [
      'import _ = require("../index");',
      '',
      'declare module "../index" {',
      '    interface LoDashStatic {',
      '        join(array: any[], separator?: string): string;',
      '    }',
      '}',
    ].join('\n')

    env.writeFile('pkg/common/array.d.ts', content)

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)
    expect(files[0].content).toBe(content)
  })

  it('handles scoped package names', () => {
    env.writeFile('@scope/pkg/index.d.ts', 'export declare const x: number;')
    env.writeFile('@scope/pkg/utils.d.ts', 'export declare const y: string;')

    const files = collectAllDtsFiles(env.pkgDir('@scope/pkg'), env.nodeModules)

    expect(files).toHaveLength(2)
    const paths = files.map(f => f.relativePath).sort()
    expect(paths).toContain('@scope/pkg/index.d.ts')
    expect(paths).toContain('@scope/pkg/utils.d.ts')
  })

  it('handles empty .d.ts files', () => {
    env.writeFile('pkg/index.d.ts', '')

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)

    expect(files).toHaveLength(1)
    expect(files[0].content).toBe('')
  })

  it('handles package with no .d.ts files', () => {
    env.writeFile('pkg/index.js', 'module.exports = {}')

    const files = collectAllDtsFiles(env.pkgDir('pkg'), env.nodeModules)

    expect(files).toHaveLength(0)
  })

  it('simulates full @types/lodash with 12 common + 303 method files', () => {
    const commonFiles = [
      'common', 'array', 'collection', 'date', 'function',
      'lang', 'math', 'number', 'object', 'seq', 'string', 'util'
    ]
    const methodFiles = ['join', 'map', 'filter', 'reduce', 'find', 'chunk', 'compact', 'flatten']

    // Entry file
    const refs = commonFiles.map(f => `/// <reference path="./common/${f}.d.ts" />`).join('\n')
    env.writeFile('@types/lodash/index.d.ts', `${refs}\nexport = _;\ndeclare const _: _.LoDashStatic;`)

    // Common files
    for (const name of commonFiles) {
      env.writeFile(`@types/lodash/common/${name}.d.ts`, `declare module "../index" { interface LoDashStatic { ${name}Method(): void; } }`)
    }

    // Per-method files
    for (const name of methodFiles) {
      env.writeFile(`@types/lodash/${name}.d.ts`, `import { ${name} } from "./index";\nexport = ${name};`)
    }

    const files = collectAllDtsFiles(env.pkgDir('@types/lodash'), env.nodeModules)

    // 1 index + 12 common + 8 method = 21
    expect(files).toHaveLength(21)

    // Verify per-method files are included
    for (const name of methodFiles) {
      const found = files.find(f => f.relativePath === `@types/lodash/${name}.d.ts`)
      expect(found, `missing @types/lodash/${name}.d.ts`).toBeDefined()
    }

    // Verify common files are included
    for (const name of commonFiles) {
      const found = files.find(f => f.relativePath === `@types/lodash/common/${name}.d.ts`)
      expect(found, `missing @types/lodash/common/${name}.d.ts`).toBeDefined()
    }
  })

  it('works with real @types/lodash if installed', () => {
    const realNodeModules = join(
      process.env.HOME ?? '',
      'Library/Application Support/@nodl/desktop/packages/node_modules'
    )
    const realPkgDir = join(realNodeModules, '@types/lodash')

    // Skip if not installed
    try {
      const { existsSync } = require('fs')
      if (!existsSync(realPkgDir)) return
    } catch { return }

    const files = collectAllDtsFiles(realPkgDir, realNodeModules)

    // Should have 300+ files (index + 12 common + ~290 per-method)
    expect(files.length).toBeGreaterThan(100)

    // Should contain join.d.ts for `import join from "lodash/join"`
    const joinFile = files.find(f => f.relativePath === '@types/lodash/join.d.ts')
    expect(joinFile).toBeDefined()
    expect(joinFile!.content).toContain('join')

    // Should contain common/array.d.ts for module augmentation
    const arrayFile = files.find(f => f.relativePath === '@types/lodash/common/array.d.ts')
    expect(arrayFile).toBeDefined()

    // All files should have @types/lodash prefix
    for (const file of files) {
      expect(file.relativePath).toMatch(/^@types\/lodash\//)
    }
  })
})
