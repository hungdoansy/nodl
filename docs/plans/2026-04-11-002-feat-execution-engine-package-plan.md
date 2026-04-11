---
title: "feat: Extract execution pipeline as reusable package"
type: feat
status: active
date: 2026-04-11
---

# feat: Extract execution pipeline as reusable package

## Overview

Extract the code execution pipeline (`instrumentCode → transpile → runner.run`) into a standalone `packages/execution-engine` package with a single `executeCode()` function. The function takes a code string + options and returns a Promise resolving to all output entries and the execution result. This lets the Electron app continue to work exactly as before, while also enabling an HTTP API (or any other consumer) to use the same execution logic without Electron.

## Problem Frame

The execution pipeline is currently tightly coupled to the desktop app. It lives in `apps/desktop/src/main/executor/` and is used only from Electron's main process. There is no clean way for an external server or CLI to call it. Extracting into a shared package gives a single source of truth for execution behavior and enables the HTTP API use case.

### The esbuild concern

esbuild ships platform-specific native binaries as npm optional dependencies (e.g., `@esbuild/darwin-arm64`, `@esbuild/linux-x64`). When you run `pnpm install` on any platform, npm selects the right binary automatically. **This is not a problem** as long as:

1. `pnpm install` runs on the target machine (not copied from a different platform)
2. `node_modules` is not committed to git or Docker-copied from a dev machine
3. CI and production run `pnpm install` fresh in their environment

The historical issue users hit is copying `node_modules/` from macOS into a Linux Docker container without reinstalling. Standard Docker practice (`RUN pnpm install` in the Dockerfile) avoids this entirely.

**Decision:** Keep esbuild as a regular dependency in the execution-engine package. Document that `pnpm install` must run on the target platform. No WASM fallback needed — esbuild-wasm is 10× slower and unnecessary for a server deployment where you control the environment.

## Requirements Trace

- R1. Single `executeCode(code, opts?)` function returns `Promise<{ entries: OutputEntry[], result: ExecutionResult }>`
- R2. No Electron dependency — pure Node.js, runnable in any Node.js process
- R3. Worker path resolves correctly in both Electron and non-Electron contexts
- R4. Electron desktop app switches to using the package with no behavior change
- R5. esbuild works correctly on any supported platform (macOS, Linux, Windows) when installed from npm
- R6. Package ships with a pre-built `dist/worker.cjs` — consumers don't need to build it

## Scope Boundaries

- No HTTP server in this plan — that is a separate layer on top of this package
- No changes to the instrumentation logic — just relocation
- No changes to E2E tests
- The desktop app's IPC layer (`src/main/index.ts`) is not touched — only the executor internals move

## Context & Research

### Current pipeline files

| File | Responsibility | Move to package? |
|------|---------------|-----------------|
| `apps/desktop/src/main/executor/instrument.ts` | Code instrumentation | Yes — copy |
| `apps/desktop/src/main/executor/transpiler.ts` | esbuild TypeScript strip | Yes — copy |
| `apps/desktop/src/main/executor/runner.ts` | Fork worker, manage lifecycle | Yes — refactor (worker path) |
| `apps/desktop/src/main/executor/worker.ts` | Execute code in child process | Yes — source for pre-build |
| `apps/desktop/src/main/executor/console-capture.ts` | Intercept console.* | Yes — copy |
| `apps/desktop/shared/types.ts` | `OutputEntry`, `RunCodePayload`, `ExecutionResult` | Partial — execution types move |

### Key constraint: worker path resolution

`runner.ts` currently locates `worker.cjs` using Electron-specific logic (checking `app.isPackaged`, asar paths). When the runner moves to the package, it needs a generic path resolver — or the caller must pass the worker path explicitly.

**Decision:** The package exports a `resolveWorkerPath()` helper that finds `dist/worker.cjs` relative to the package's own `__dirname`. Callers can override with `options.workerPath` for custom setups (e.g., custom Electron asar layout).

### esbuild binary distribution

esbuild v0.28+ handles platform selection via npm `optionalDependencies`. No special handling needed in the package — `"esbuild": "^0.28.0"` in dependencies is sufficient. Each platform gets its native binary on install.

### Workspace support

`pnpm-workspace.yaml` already includes `packages/*`. Creating `packages/execution-engine` is immediately usable via pnpm workspace protocol (`"@nodl/execution-engine": "workspace:*"`).

## Key Technical Decisions

### 1. Package name: `@nodl/execution-engine`

Matches the project brand. Internal package — not published to npm.

### 2. Public API: single `executeCode()` function

```typescript
// packages/execution-engine/src/index.ts

export async function executeCode(
  code: string,
  options?: ExecuteOptions
): Promise<ExecutionOutput>

interface ExecuteOptions {
  language?: 'javascript' | 'typescript'  // default: 'typescript'
  timeout?: number                         // default: 5000 (ms)
  workerPath?: string                      // override default worker path
}

interface ExecutionOutput {
  entries: OutputEntry[]
  result: ExecutionResult
}
```

Internally: `instrumentCode(code)` → `transpile(instrumented, lang)` → wrap `createRunner().run()` in a Promise → collect entries in array → resolve on `onDone`. Identical to the pattern established in `docs/plans/2026-04-11-001-feat-pipeline-integration-tests-plan.md`.

### 3. Worker pre-built and shipped in the package

The package's build script produces `dist/worker.cjs`. This file is included in the package. `resolveWorkerPath()` finds it relative to the package root using `path.join(__dirname, '../dist/worker.cjs')`. When the Electron app packages to `.app`, the package's `dist/worker.cjs` is included by electron-builder alongside other node_modules.

No separate `build:worker` script is needed in the desktop app — the package handles it.

### 4. Desktop app: keep Electron-specific path override

The desktop app's `runner.ts` currently has Electron-specific fallback for the asar path. After migration, the desktop app passes its own `workerPath` to `executeCode()` to preserve the asar-aware resolution. This keeps Electron concerns out of the package.

```typescript
// apps/desktop/src/main/executor/index.ts (new thin wrapper)
import { executeCode } from '@nodl/execution-engine'
import { resolveDesktopWorkerPath } from './worker-path'  // existing Electron logic

export function runCode(code: string, opts?: ...) {
  return executeCode(code, { ...opts, workerPath: resolveDesktopWorkerPath() })
}
```

### 5. Keep streaming capability

`executeCode()` collects entries into an array for simple callers. But the package also exports `createRunner()` directly for callers that need streaming (e.g., an HTTP server using Server-Sent Events):

```typescript
export { createRunner } from './runner'
export type { OutputEntry, ExecutionResult, RunCodePayload } from './types'
```

## Implementation Units

---

### Unit 1: Create the package scaffold

**Goal:** Set up the `packages/execution-engine` workspace package with the right structure, build tooling, and dependency wiring.

**Requirements:** R2, R5, R6

**Dependencies:** None

**Files:**
- Create: `packages/execution-engine/package.json`
- Create: `packages/execution-engine/tsconfig.json`
- Create: `packages/execution-engine/scripts/build.mjs` — esbuild script to produce `dist/worker.cjs` and `dist/index.js`

**Approach:**
- Package type: CommonJS (`"type": "commonjs"`) — runner.ts and worker.ts use require()
- Main entry: `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`
- Dependencies: `esbuild: ^0.28.0`, `nanoid` (for OutputEntry IDs)
- Build script compiles two outputs: the main index (TypeScript → JS via tsc) and the worker bundle (via esbuild bundler)
- Add `"@nodl/execution-engine": "workspace:*"` to `apps/desktop/package.json` dependencies

**Patterns to follow:**
- `apps/desktop/package.json` `build:worker` script for esbuild worker bundling pattern
- `pnpm-workspace.yaml` already covers `packages/*`

**Verification:**
- `cd packages/execution-engine && pnpm run build` produces `dist/index.js` and `dist/worker.cjs`
- Package is importable from the desktop app via workspace protocol

---

### Unit 2: Move executor source files into the package

**Goal:** Relocate instrumentation, transpiler, runner, worker, and console capture into the package. Adjust imports. Extract types.

**Requirements:** R2, R3

**Dependencies:** Unit 1

**Files:**
- Create: `packages/execution-engine/src/instrument.ts` — copied from `apps/desktop/src/main/executor/instrument.ts`
- Create: `packages/execution-engine/src/transpiler.ts` — copied from `apps/desktop/src/main/executor/transpiler.ts`
- Create: `packages/execution-engine/src/console-capture.ts` — copied from `apps/desktop/src/main/executor/console-capture.ts`
- Create: `packages/execution-engine/src/runner.ts` — based on `apps/desktop/src/main/executor/runner.ts`, with worker path logic changed (see below)
- Create: `packages/execution-engine/src/worker.ts` — copied from `apps/desktop/src/main/executor/worker.ts`
- Create: `packages/execution-engine/src/types.ts` — execution-related types extracted from `apps/desktop/shared/types.ts`
- Create: `packages/execution-engine/src/worker-path.ts` — `resolveWorkerPath()` using `__dirname`

**Approach:**

*runner.ts changes:*
- Remove Electron-specific `app.isPackaged` / asar path logic
- Accept optional `workerPath` parameter in `createRunner(options?: { workerPath?: string })`
- Default: `resolveWorkerPath()` from `worker-path.ts` (relative to package `dist/`)
- Keep all other runner logic identical (timeout, IPC, kill on stop)

*worker-path.ts:*
```typescript
// Resolves dist/worker.cjs relative to this package
export function resolveWorkerPath(): string {
  return path.join(__dirname, '../dist/worker.cjs')
}
```

*types.ts:*
- Move only execution types: `OutputEntry`, `ExecutionResult`, `RunCodePayload`, `ConsoleMethod`, `WorkerMessage`
- Leave UI/IPC/Electron types in `apps/desktop/shared/types.ts`

**Desktop app impact:** `apps/desktop/shared/types.ts` re-exports execution types from the package:
```typescript
export type { OutputEntry, ExecutionResult, RunCodePayload } from '@nodl/execution-engine'
```

**Verification:**
- Package builds without errors
- All types resolve correctly
- No import of Electron APIs inside the package

---

### Unit 3: Create the `executeCode()` public API

**Goal:** The single callable function that wraps the full pipeline and returns a Promise.

**Requirements:** R1, R2

**Dependencies:** Unit 2

**Files:**
- Create: `packages/execution-engine/src/index.ts`

**Approach:**
- `executeCode()` wraps `instrumentCode() → transpile() → createRunner().run()` in a Promise
- Transpile errors throw immediately (no worker fork)
- Entries collected into array, resolved when `onDone` fires
- Re-export `createRunner` and types for advanced callers

**Test scenarios:**
- `executeCode('console.log("hello")')` → entries with `method: 'log'`, `args: ['hello']`
- `executeCode('42')` → entries with `__type: 'LastExpression'`, `value: 42`
- `executeCode('')` → zero entries, `result.success: true`
- `executeCode('throw new Error("boom")')` → entry with `method: 'error'`
- `executeCode('const x: number = "bad"')` → throws TranspileError before worker
- `executeCode('import path from "path"\npath.sep')` → expression value `/` or `\`
- Custom timeout: `executeCode('while(true){}', { timeout: 1000 })` → result.success false

**Verification:**
- Integration tests from `docs/plans/2026-04-11-001-feat-pipeline-integration-tests-plan.md` can be rewritten to call `executeCode()` from this package instead of calling pipeline functions directly

---

### Unit 4: Update desktop app to use the package

**Goal:** Swap desktop app's executor internals to use `@nodl/execution-engine`, keeping behavior identical. Add Electron-specific worker path override.

**Requirements:** R4

**Dependencies:** Unit 3

**Files:**
- Modify: `apps/desktop/src/main/executor/runner.ts` — becomes a thin wrapper calling `createRunner({ workerPath: resolveDesktopWorkerPath() })`
- Create: `apps/desktop/src/main/executor/worker-path.ts` — Electron-specific path resolution (extracted from current runner.ts)
- Modify: `apps/desktop/src/main/index.ts` — update imports if needed
- Modify: `apps/desktop/shared/types.ts` — re-export from package instead of defining locally
- Modify: `apps/desktop/package.json` — add `@nodl/execution-engine: workspace:*`, remove now-redundant build:worker script

**Approach:**

`apps/desktop/src/main/executor/worker-path.ts`:
```typescript
import { app } from 'electron'
import path from 'path'

// Electron-aware resolution: handles asar packaging and dev vs production paths
export function resolveDesktopWorkerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'worker.cjs')
  }
  // Dev: use the package's dist/ directly
  return path.join(__dirname, '../../node_modules/@nodl/execution-engine/dist/worker.cjs')
}
```

**Patterns to follow:**
- Existing `runner.ts` worker path resolution logic (preserve the asar fallback)

**Verification:**
- `pnpm run test` in `apps/desktop` — all 248 unit tests + 100 pipeline tests still pass
- `pnpm run dev` — app works, code execution produces correct output
- `pnpm run pack` — packaged app executes code correctly (asar path resolves)

---

## Risks & Dependencies

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| esbuild binary mismatch when deploying API to Linux from macOS dev machine | Medium | Run `pnpm install` on the target platform. Document in README. Standard Docker practice avoids this. |
| Worker path breaks in Electron asar context | Medium | Unit 4 preserves Electron-specific path resolution as a thin wrapper. Tested via `pnpm run pack`. |
| Desktop app behavior regression after switching to package | Low | 248 unit + 100 pipeline tests run in CI. No logic changes — only relocation. |
| Package build adds complexity to monorepo CI | Low | Add `build` to turbo pipeline so `packages/execution-engine` builds before `apps/desktop`. |

## API Use Case (Out of Scope Here, But Designed For)

Once this package exists, an HTTP server can be created (separate plan) as a thin Express/Hono wrapper:

```typescript
import { executeCode } from '@nodl/execution-engine'

app.post('/run', async (req, res) => {
  const { code, language, timeout } = req.body
  const output = await executeCode(code, { language, timeout })
  res.json(output)
})
```

No Electron, no UI, no worker build step for the API developer — just `pnpm install` and import.
