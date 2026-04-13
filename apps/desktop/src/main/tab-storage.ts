/**
 * Per-tab file storage.
 *
 * Layout:
 *   <baseDir>/
 *     nodl-tab-index.json   — { version, order, activeTabId, meta }
 *     tabs/
 *       <id>.ts              — raw code for each tab
 *
 * Design decisions:
 *  - Code is stored as raw text, not JSON-wrapped. Greppable, openable in
 *    another editor, no escape cost.
 *  - Writes are atomic (write to `.tmp`, rename). POSIX rename is atomic on
 *    the same filesystem, so a crash mid-write can't corrupt the existing
 *    tab — you either see the old content or the new content.
 *  - Tab IDs are validated against a nanoid-safe alphabet. This prevents
 *    path traversal (`../../etc/passwd`) from a rogue IPC call.
 *  - All functions take a `baseDir` parameter so tests can use a tmp dir.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import type { TabIndex } from '../../shared/types'

export const INDEX_FILENAME = 'nodl-tab-index.json'
export const TABS_DIRNAME = 'tabs'
export const TAB_INDEX_VERSION = 1

const VALID_ID = /^[A-Za-z0-9_-]{1,64}$/

export class InvalidTabIdError extends Error {
  constructor(id: string) {
    super(`Invalid tab id: ${JSON.stringify(id)}`)
    this.name = 'InvalidTabIdError'
  }
}

function assertValidId(id: string): void {
  if (typeof id !== 'string' || !VALID_ID.test(id)) {
    throw new InvalidTabIdError(id)
  }
}

function tabsDir(baseDir: string): string {
  return join(baseDir, TABS_DIRNAME)
}

function tabFilePath(baseDir: string, id: string): string {
  assertValidId(id)
  return join(tabsDir(baseDir), `${id}.ts`)
}

function indexPath(baseDir: string): string {
  return join(baseDir, INDEX_FILENAME)
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/**
 * Write to `<path>.tmp`, then rename. POSIX rename is atomic on the same fs,
 * so a crash mid-write can't leave the destination half-written.
 */
function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, content, 'utf-8')
  renameSync(tmp, path)
}

export function loadTabIndex(baseDir: string): TabIndex | null {
  const path = indexPath(baseDir)
  if (!existsSync(path)) return null
  try {
    const data = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(data) as TabIndex
    // Minimal shape check — return null (app falls back to defaults) if corrupt
    if (
      typeof parsed !== 'object' || parsed === null ||
      !Array.isArray(parsed.order) ||
      typeof parsed.activeTabId !== 'string' ||
      typeof parsed.meta !== 'object' || parsed.meta === null
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveTabIndex(baseDir: string, index: TabIndex): void {
  ensureDir(baseDir)
  atomicWrite(indexPath(baseDir), JSON.stringify(index, null, 2))
}

export function loadTabContent(baseDir: string, id: string): string | null {
  const path = tabFilePath(baseDir, id)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

export function saveTabContent(baseDir: string, id: string, code: string): void {
  ensureDir(tabsDir(baseDir))
  atomicWrite(tabFilePath(baseDir, id), code)
}

export function deleteTabContent(baseDir: string, id: string): void {
  const path = tabFilePath(baseDir, id)
  if (existsSync(path)) {
    try { unlinkSync(path) } catch { /* best-effort */ }
  }
}

/**
 * Delete any per-tab files that are not referenced in the given ID set.
 * Use after loading the index to clean up orphans left by interrupted closes.
 */
export function pruneOrphanTabFiles(baseDir: string, keepIds: Set<string>): void {
  const dir = tabsDir(baseDir)
  if (!existsSync(dir)) return
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return }
  for (const entry of entries) {
    // Strip .ts suffix to get id. Also skip stray .tmp files from crashed writes.
    if (entry.endsWith('.tmp')) {
      try { unlinkSync(join(dir, entry)) } catch { /* best-effort */ }
      continue
    }
    if (!entry.endsWith('.ts')) continue
    const id = entry.slice(0, -3)
    if (!VALID_ID.test(id)) continue
    if (!keepIds.has(id)) {
      try { unlinkSync(join(dir, entry)) } catch { /* best-effort */ }
    }
  }
}
