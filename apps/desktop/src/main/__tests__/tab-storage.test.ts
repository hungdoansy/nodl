// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { TabIndex } from '../../../shared/types'
import {
  loadTabIndex, saveTabIndex,
  loadTabContent, saveTabContent, deleteTabContent,
  pruneOrphanTabFiles,
  InvalidTabIdError,
  INDEX_FILENAME, TABS_DIRNAME, TAB_INDEX_VERSION,
} from '../tab-storage'

let baseDir: string

beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), 'nodl-tab-storage-'))
})

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true })
})

function makeIndex(overrides: Partial<TabIndex> = {}): TabIndex {
  return {
    version: TAB_INDEX_VERSION,
    order: ['abc123'],
    activeTabId: 'abc123',
    meta: {
      abc123: { name: 'Untitled 1', language: 'typescript', createdAt: 1, updatedAt: 1 },
    },
    ...overrides,
  }
}

describe('tab-storage: index', () => {
  it('returns null when no index file exists', () => {
    expect(loadTabIndex(baseDir)).toBeNull()
  })

  it('round-trips an index through save/load', () => {
    const idx = makeIndex()
    saveTabIndex(baseDir, idx)
    expect(loadTabIndex(baseDir)).toEqual(idx)
  })

  it('writes the index to the expected path', () => {
    saveTabIndex(baseDir, makeIndex())
    expect(existsSync(join(baseDir, INDEX_FILENAME))).toBe(true)
  })

  it('returns null when the index file is corrupt JSON', () => {
    writeFileSync(join(baseDir, INDEX_FILENAME), '{not-json', 'utf-8')
    expect(loadTabIndex(baseDir)).toBeNull()
  })

  it('returns null when the index has an unexpected shape', () => {
    writeFileSync(join(baseDir, INDEX_FILENAME), JSON.stringify({ foo: 'bar' }), 'utf-8')
    expect(loadTabIndex(baseDir)).toBeNull()
  })

  it('creates the base directory if missing', () => {
    const nested = join(baseDir, 'nested', 'path')
    saveTabIndex(nested, makeIndex())
    expect(existsSync(join(nested, INDEX_FILENAME))).toBe(true)
  })
})

describe('tab-storage: tab content', () => {
  it('returns null when the tab file does not exist', () => {
    expect(loadTabContent(baseDir, 'missing')).toBeNull()
  })

  it('round-trips code through save/load', () => {
    saveTabContent(baseDir, 'abc123', 'console.log("hi")')
    expect(loadTabContent(baseDir, 'abc123')).toBe('console.log("hi")')
  })

  it('stores raw code (not JSON-wrapped) at tabs/<id>.ts', () => {
    const code = 'const x: number = 42\nx'
    saveTabContent(baseDir, 'abc123', code)
    const onDisk = readFileSync(join(baseDir, TABS_DIRNAME, 'abc123.ts'), 'utf-8')
    expect(onDisk).toBe(code)
  })

  it('overwrites existing content atomically', () => {
    saveTabContent(baseDir, 'abc123', 'first')
    saveTabContent(baseDir, 'abc123', 'second')
    expect(loadTabContent(baseDir, 'abc123')).toBe('second')
    // No leftover .tmp file
    const entries = readdirSync(join(baseDir, TABS_DIRNAME))
    expect(entries).toEqual(['abc123.ts'])
  })

  it('handles empty content', () => {
    saveTabContent(baseDir, 'abc123', '')
    expect(loadTabContent(baseDir, 'abc123')).toBe('')
  })

  it('deletes a tab file', () => {
    saveTabContent(baseDir, 'abc123', 'x')
    expect(existsSync(join(baseDir, TABS_DIRNAME, 'abc123.ts'))).toBe(true)
    deleteTabContent(baseDir, 'abc123')
    expect(existsSync(join(baseDir, TABS_DIRNAME, 'abc123.ts'))).toBe(false)
  })

  it('delete is a no-op when the file does not exist', () => {
    expect(() => deleteTabContent(baseDir, 'abc123')).not.toThrow()
  })

  it('preserves UTF-8 content', () => {
    const unicode = '// 🫶 héllo — 日本語\nconst x = "ok"'
    saveTabContent(baseDir, 'abc123', unicode)
    expect(loadTabContent(baseDir, 'abc123')).toBe(unicode)
  })
})

describe('tab-storage: id validation (path-traversal guard)', () => {
  const invalidIds = [
    '',
    '..',
    '../etc/passwd',
    'foo/bar',
    'foo\\bar',
    'foo.bar',
    'foo bar',
    'a'.repeat(65),  // over length limit
    'has space',
  ]

  for (const bad of invalidIds) {
    it(`rejects save with invalid id: ${JSON.stringify(bad)}`, () => {
      expect(() => saveTabContent(baseDir, bad, 'x')).toThrow(InvalidTabIdError)
    })

    it(`rejects load with invalid id: ${JSON.stringify(bad)}`, () => {
      expect(() => loadTabContent(baseDir, bad)).toThrow(InvalidTabIdError)
    })

    it(`rejects delete with invalid id: ${JSON.stringify(bad)}`, () => {
      expect(() => deleteTabContent(baseDir, bad)).toThrow(InvalidTabIdError)
    })
  }

  const validIds = ['abc', 'ABC123', 'abc_def-ghi', 'a', '0', 'V1StGXR8_Z5jdHi6B-myT']

  for (const good of validIds) {
    it(`accepts valid id: ${JSON.stringify(good)}`, () => {
      expect(() => saveTabContent(baseDir, good, 'x')).not.toThrow()
      expect(loadTabContent(baseDir, good)).toBe('x')
    })
  }
})

describe('tab-storage: pruneOrphanTabFiles', () => {
  it('no-ops when tabs dir is missing', () => {
    expect(() => pruneOrphanTabFiles(baseDir, new Set())).not.toThrow()
  })

  it('removes files whose ids are not in the keep set', () => {
    saveTabContent(baseDir, 'keep1', 'a')
    saveTabContent(baseDir, 'keep2', 'b')
    saveTabContent(baseDir, 'orphan', 'c')

    pruneOrphanTabFiles(baseDir, new Set(['keep1', 'keep2']))

    const entries = readdirSync(join(baseDir, TABS_DIRNAME)).sort()
    expect(entries).toEqual(['keep1.ts', 'keep2.ts'])
  })

  it('keeps everything when keep set contains all ids', () => {
    saveTabContent(baseDir, 'a', 'x')
    saveTabContent(baseDir, 'b', 'y')
    pruneOrphanTabFiles(baseDir, new Set(['a', 'b']))
    const entries = readdirSync(join(baseDir, TABS_DIRNAME)).sort()
    expect(entries).toEqual(['a.ts', 'b.ts'])
  })

  it('cleans up stray .tmp files from crashed writes', () => {
    saveTabContent(baseDir, 'a', 'x')
    writeFileSync(join(baseDir, TABS_DIRNAME, 'a.ts.tmp'), 'partial', 'utf-8')
    pruneOrphanTabFiles(baseDir, new Set(['a']))
    const entries = readdirSync(join(baseDir, TABS_DIRNAME)).sort()
    expect(entries).toEqual(['a.ts'])
  })

  it('ignores files with non-.ts suffixes', () => {
    saveTabContent(baseDir, 'a', 'x')
    writeFileSync(join(baseDir, TABS_DIRNAME, 'README.md'), 'x', 'utf-8')
    pruneOrphanTabFiles(baseDir, new Set(['a']))
    // README.md is not an id-shaped .ts, so we leave it alone
    const entries = readdirSync(join(baseDir, TABS_DIRNAME)).sort()
    expect(entries).toEqual(['README.md', 'a.ts'])
  })

  it('skips files whose stems are not valid ids (safety)', () => {
    saveTabContent(baseDir, 'a', 'x')
    writeFileSync(join(baseDir, TABS_DIRNAME, 'has space.ts'), 'x', 'utf-8')
    pruneOrphanTabFiles(baseDir, new Set(['a']))
    // 'has space' doesn't match VALID_ID, so pruning skips it — defensive,
    // not a policy that these should be kept forever.
    const entries = readdirSync(join(baseDir, TABS_DIRNAME)).sort()
    expect(entries).toEqual(['a.ts', 'has space.ts'])
  })
})

describe('tab-storage: atomicity', () => {
  it('leaves no partial file on repeated writes', () => {
    // Write the same file many times. If atomic rename is working, the
    // file should always have full content and no .tmp should linger.
    for (let i = 0; i < 50; i++) {
      saveTabContent(baseDir, 'abc', `iteration ${i}`)
    }
    expect(loadTabContent(baseDir, 'abc')).toBe('iteration 49')
    const entries = readdirSync(join(baseDir, TABS_DIRNAME))
    expect(entries).toEqual(['abc.ts'])
  })
})
