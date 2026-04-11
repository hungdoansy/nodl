---
title: "feat: Add pipeline integration tests"
type: feat
status: active
date: 2026-04-11
---

# feat: Add pipeline integration tests

## Overview

Add integration tests that exercise the full code execution pipeline (instrument → transpile → fork worker → collect output) without launching Electron or the UI. This fills the gap between unit tests (which test individual functions) and E2E tests (which drive the full UI via Playwright), allowing fast, reliable validation of input→output behavior.

## Problem Frame

The current test coverage has a gap:

- **Unit tests (248):** Test `instrumentCode()`, `transpile()`, stores individually
- **Pipeline tests (100):** Test `instrumentCode() → transpile()` chain (no execution)
- **E2E tests (101):** Full Playwright UI tests — slow, flaky, require Electron

No tests exercise the actual execution: code goes in, worker runs it, output entries come back. Verifying this currently requires either E2E tests (slow, ~30s+ per test) or manual testing. The user's original idea of an HTTP API would achieve this but introduces unnecessary infrastructure (server, ports, security surface). Calling the pipeline functions directly in Vitest is simpler and faster (~50ms per test).

## Requirements Trace

- R1. Test the full pipeline: `instrumentCode() → transpile() → runner.run() → OutputEntry[]`
- R2. No Electron, no UI, no HTTP server — pure Node.js Vitest tests
- R3. Test helper should be reusable across test files
- R4. Worker must be pre-built (`build:worker`) before tests run
- R5. Cover happy paths, error paths, timeouts, and expression value capture

## Scope Boundaries

- No HTTP API or server
- No changes to the production pipeline code — tests only
- No changes to E2E tests
- Not replacing existing unit or pipeline tests — this is an additional layer

## Context & Research

### Relevant Code and Patterns

- `src/main/executor/runner.ts` — `createRunner().run(payload, { onOutput, onDone })` is the API to call
- `src/main/executor/__tests__/pipeline.test.ts` — existing pattern: `// @vitest-environment node`, helper functions, `instrumentCode() → transpile()` chain
- `shared/types.ts` — `RunCodePayload`, `OutputEntry`, `ExecutionResult` types
- `package.json` — `build:worker` script builds `out/worker/worker.cjs` via esbuild

### Key Constraint: Worker Must Be Built

`createRunner()` forks a child process from `out/worker/worker.cjs`. This file is built separately by `pnpm run build:worker`. Tests will fail with "worker not found" if it doesn't exist. The test setup must ensure the worker is built before running.

## Key Technical Decisions

- **Call `runner.run()` directly** (not instrument+transpile only): The existing pipeline tests already cover instrument→transpile. The new tests should exercise the full cycle including worker execution, timer handling, and IPC message collection.
- **Pre-build worker via globalSetup**: Use Vitest's `globalSetup` to run `build:worker` once before the test suite, rather than requiring manual build or per-test builds.
- **Shared test helper**: An `executeCode()` helper wraps the instrument→transpile→run chain and returns a Promise of `{ entries, result }`. This keeps individual tests focused on assertions.
- **Separate test file**: New file `src/main/executor/__tests__/integration.test.ts` — keeps integration tests distinct from unit/pipeline tests.

## Implementation Units

- [ ] **Unit 1: Create the `executeCode()` test helper**

**Goal:** A reusable async helper that takes code input and returns execution output.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Create: `apps/desktop/src/main/executor/__tests__/integration.test.ts`

**Approach:**
- Helper signature: `executeCode(code: string, opts?: { language?, timeout? }): Promise<{ entries: OutputEntry[], result: ExecutionResult }>`
- Internally: `instrumentCode(code)` → `transpile(instrumented, lang)` → wrap `createRunner().run()` in a Promise → resolve on `onDone` callback
- If transpilation has errors, throw immediately with error details (don't fork the worker)
- Default timeout: 5000ms (matches runner default)
- Use `// @vitest-environment node` directive

**Patterns to follow:**
- `pipeline.test.ts` — helper pattern (`pipeline()`, `expectValid()`), environment directive
- `runner.ts` — callback-based API wrapped in Promise

**Test scenarios:**
- Happy path: `executeCode('console.log("hello")')` returns entries with `method: 'log'`, `args: ['hello']`
- Happy path: `executeCode('42')` returns entries with `__type: 'LastExpression'`, `value: 42`
- Edge case: `executeCode('')` returns zero entries, `result.success: true`
- Error path: `executeCode('throw new Error("boom")')` returns error entry with `method: 'error'`
- Error path: `executeCode('const x: number = "bad"')` — transpilation error, thrown before worker
- Integration: `executeCode('const x = 1\nx')` — variable declared, then expression value captured on correct line

**Verification:**
- Helper compiles and can be called from a test
- All 6 scenarios pass

---

- [ ] **Unit 2: Add execution behavior tests**

**Goal:** Cover the important execution behaviors — async, timeouts, imports, expression capture, multi-line.

**Requirements:** R1, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/desktop/src/main/executor/__tests__/integration.test.ts`

**Approach:**
- Group tests by behavior: console capture, expression values, async/timers, error handling, imports, loop guards
- Each test calls `executeCode()` and asserts on entries/result
- For timeout tests, use a short timeout override (e.g., 1000ms) to keep tests fast

**Patterns to follow:**
- `pipeline.test.ts` — describe blocks grouped by behavior

**Test scenarios:**

*Console capture:*
- Happy path: `console.log(1, 2, 3)` → entries with `args: [1, 2, 3]`
- Happy path: `console.warn("warning")` → entry with `method: 'warn'`
- Happy path: `console.error("err")` → entry with `method: 'error'`
- Edge case: `console.log({ a: 1, b: [2, 3] })` → serialized object in args

*Expression values:*
- Happy path: `"hello"` → entry with `LastExpression`, `value: "hello"`
- Happy path: `1 + 2` → value `3`
- Happy path: `[1, 2, 3]` → array value
- Edge case: `undefined` → no entry (filtered by `!== undefined` check)
- Edge case: `console.log("hi")` → no expression entry (returns `undefined`)

*Async:*
- Happy path: `setTimeout(() => console.log("delayed"), 50)` → entry appears after delay
- Happy path: `await Promise.resolve(42)` → expression value `42`
- Edge case: `await new Promise(r => setTimeout(r, 100))` → completes without timeout

*Timeouts:*
- Error path: `while(true){}` with `timeout: 1000` → loop guard error or timeout error
- Error path: code that hangs → result.success is false, error message present

*Imports:*
- Happy path: `import path from "path"\npath.sep` → expression value is `/` or `\\`
- Error path: `import nonexistent from "nonexistent-pkg-xyz"` → error entry

*Line tracking:*
- Integration: `console.log("a")\nconsole.log("b")` → first entry has `line: 1`, second has `line: 2`

**Verification:**
- All tests pass
- Total integration test count: ~20 tests
- Tests complete in <5s total (no per-test Electron boot)

---

- [ ] **Unit 3: Ensure worker is pre-built for tests**

**Goal:** Tests that use `createRunner()` should not fail because `worker.cjs` is missing.

**Requirements:** R4

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/desktop/vitest.config.ts`

**Approach:**
- Add a `globalSetup` file that runs `build:worker` before the test suite starts
- Only build if `out/worker/worker.cjs` doesn't exist or is older than `src/main/executor/worker.ts`
- This avoids rebuilding on every test run when unnecessary

**Patterns to follow:**
- Vitest `globalSetup` docs — export a `setup()` function

**Test scenarios:**
- Happy path: Fresh checkout → run tests → worker builds automatically → integration tests pass
- Edge case: Worker already exists → globalSetup skips build → tests still pass (no slowdown)

**Verification:**
- `pnpm run test` works from a clean state (no prior `build:worker`)
- Existing 248 unit tests + 100 pipeline tests still pass (globalSetup doesn't interfere)

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Worker path resolution fails in test context | Runner's `resolveWorkerPath()` checks `out/worker/worker.cjs` (dev path) — this works from the project root. Verify in first test. |
| `globalSetup` adds startup latency | Only builds when worker is missing/stale. Typical case: <100ms check, 0ms build. |
| Tests become flaky due to timing (async drain) | Use generous timeouts for async tests. The worker's `waitForAsyncDrain()` handles most cases. |
