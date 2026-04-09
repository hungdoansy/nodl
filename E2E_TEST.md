# nodl — E2E Test Coverage

## Setup

- **Framework:** Playwright with Electron support (`_electron.launch()`)
- **Target:** Packaged app (`dist/mac-arm64/nodl.app`)
- **Run:** `pnpm run test:e2e`
- **Config:** `playwright.config.ts` — serial execution, 30s timeout per test

## Test Files

| File | Tests | Category |
|------|-------|----------|
| `e2e/01-app-launch.test.ts` | E2E-001 to E2E-010 | App launch, window, UI elements |
| `e2e/02-code-execution.test.ts` | E2E-011 to E2E-030 | Code execution, output, JS features |
| `e2e/03-ui-interactions.test.ts` | E2E-031 to E2E-040 | Buttons, sidebar, dialogs |
| `e2e/04-typescript-advanced.test.ts` | E2E-041 to E2E-060 | TypeScript, advanced JS |
| `e2e/05-edge-cases-tabs.test.ts` | E2E-061 to E2E-100 | Edge cases, tabs, complex patterns |

## Test Cases

### 01 — App Launch & UI Elements (10 tests)

| ID | Test Case | Status |
|----|-----------|--------|
| E2E-001 | App window opens | PENDING |
| E2E-002 | Window has reasonable dimensions | PENDING |
| E2E-003 | Header is visible with app name | PENDING |
| E2E-004 | Monaco editor is present | PENDING |
| E2E-005 | Run button is visible | PENDING |
| E2E-006 | Output panel header visible | PENDING |
| E2E-007 | Sidebar toggle button exists | PENDING |
| E2E-008 | Theme toggle button exists | PENDING |
| E2E-009 | Clear output button exists | PENDING |
| E2E-010 | Output mode toggle exists | PENDING |

### 02 — Code Execution (20 tests)

| ID | Test Case | Input | Expected |
|----|-----------|-------|----------|
| E2E-011 | console.log outputs text | `console.log("hello e2e")` | Contains "hello e2e" |
| E2E-012 | Expression result shown inline | `1 + 2` | Contains "3" |
| E2E-013 | Multiple console.log calls | 3 log calls | All 3 appear |
| E2E-014 | Syntax error displays error | `const x = ;` | Contains "error" |
| E2E-015 | Runtime error — TypeError | `null.foo` | Contains "typeerror" |
| E2E-016 | Undefined variable — ReferenceError | `console.log(undefinedVariable)` | Contains "referenceerror" |
| E2E-017 | Object output | `console.log({ name: "test" })` | Contains "Object" |
| E2E-018 | Array output | `console.log([1, 2, 3])` | Contains "Array" |
| E2E-019 | String expression result | `"hello world"` | Contains "hello world" |
| E2E-020 | Boolean expression result | `5 > 3` | Contains "true" |
| E2E-021 | console.warn | `console.warn("warning")` | Contains "warning" |
| E2E-022 | console.error | `console.error("error")` | Contains "error" |
| E2E-023 | Multi-line code | const + log | Contains "30" |
| E2E-024 | Function definition and call | `function add(a,b)...` | Contains "7" |
| E2E-025 | Arrow function | `const mul = (a,b) => ...` | Contains "30" |
| E2E-026 | Template literal | `` `hello ${name}` `` | Contains "hello world" |
| E2E-027 | Async/await | `await Promise.resolve(42)` | Contains "42" |
| E2E-028 | setTimeout fires | `setTimeout(...)` | Contains "delayed" |
| E2E-029 | for loop | `for (let i...)` | Contains 0, 1, 2 |
| E2E-030 | Destructuring | `const { a, b } = ...` | Contains "1", "2" |

### 03 — UI Interactions (10 tests)

| ID | Test Case | Status |
|----|-----------|--------|
| E2E-031 | Clear output button clears entries | PENDING |
| E2E-032 | Sidebar toggle works | PENDING |
| E2E-033 | Output mode toggle switches | PENDING |
| E2E-034 | Copy button shows feedback | PENDING |
| E2E-035 | Cmd+Enter runs code | PENDING |
| E2E-036 | Duration badge shows after run | PENDING |
| E2E-037 | Re-run replaces previous output | PENDING |
| E2E-038 | Click app title opens About dialog | PENDING |
| E2E-039 | Settings dialog opens and closes | PENDING |
| E2E-040 | Packages dialog opens and closes | PENDING |

### 04 — TypeScript & Advanced JS (20 tests)

| ID | Test Case | Input Summary |
|----|-----------|---------------|
| E2E-041 | TypeScript type annotations | `const x: number = 42` |
| E2E-042 | TypeScript interface | `interface User { ... }` |
| E2E-043 | TypeScript enum | `enum Color { ... }` |
| E2E-044 | TypeScript generics | `function identity<T>(x: T)` |
| E2E-045 | TypeScript type casting | `"123" as any` |
| E2E-046 | Class with methods | `class Dog { ... }` |
| E2E-047 | Map and Set | `new Map()` |
| E2E-048 | Array methods chain | `.filter().map()` |
| E2E-049 | try/catch block | `try { throw ... }` |
| E2E-050 | Promise.all | `await Promise.all([...])` |
| E2E-051 | Spread operator | `[...a, 3, 4]` |
| E2E-052 | Optional chaining | `obj?.a?.b` |
| E2E-053 | Nullish coalescing | `null ?? "default"` |
| E2E-054 | RegExp | `"hello123".match(/\\d+/)` |
| E2E-055 | JSON stringify/parse | round-trip |
| E2E-056 | Date object | `new Date(2025, 0, 1)` |
| E2E-057 | Math functions | `Math.max, Math.floor` |
| E2E-058 | Symbol | `Symbol("test")` |
| E2E-059 | WeakMap | `new WeakMap()` |
| E2E-060 | console.table | `console.table([...])` |

### 05 — Edge Cases & Tabs (40 tests)

| ID | Test Case | Input Summary |
|----|-----------|---------------|
| E2E-061 | Empty code runs without error | `""` |
| E2E-062 | Only comments | `// comment` |
| E2E-063 | Large output (100 logs) | `for loop 100x` |
| E2E-064 | Circular reference handled | `obj.self = obj` |
| E2E-065 | Multiple args to console.log | `"a", 1, true, null` |
| E2E-066 | Throw string shows error | `throw "oops"` |
| E2E-067 | Throw Error shows message | `throw new Error(...)` |
| E2E-068 | Infinite recursion stack error | `function f() { f() }` |
| E2E-069 | console.info | `console.info("info")` |
| E2E-070 | Deeply nested object | `{ a: { b: { c: ... } } }` |
| E2E-071 | Create new tab | Click "New file" |
| E2E-072 | Switch tabs preserves code | Switch between tabs |
| E2E-073 | Switch statement | `switch (val) { ... }` |
| E2E-074 | While loop | `while (i < 3) { ... }` |
| E2E-075 | Ternary operator | `x > 3 ? "big" : "small"` |
| E2E-076 | Object.keys/values | `Object.keys(obj)` |
| E2E-077 | Array destructuring | `const [first, ...rest]` |
| E2E-078 | Async rejected promise catch | `try { await reject }` |
| E2E-079 | Generator function | `function* gen() { yield }` |
| E2E-080 | Proxy object | `new Proxy({}, handler)` |
| E2E-081 | Error stack trace | Nested function throws |
| E2E-082 | Logging undefined/null | `console.log(undefined)` |
| E2E-083 | Numeric edge cases | `Infinity, MAX_SAFE_INTEGER` |
| E2E-084 | String methods | `.toUpperCase(), .split()` |
| E2E-085 | Object spread | `{ ...a, y: 2 }` |
| E2E-086 | Async IIFE | `(async () => { ... })()` |
| E2E-087 | for...of loop | `for (const item of [...])` |
| E2E-088 | for...in loop | `for (const key in obj)` |
| E2E-089 | typeof operator | `typeof 42, typeof "str"` |
| E2E-090 | Array.reduce | `[1,2,3,4].reduce(...)` |
| E2E-091 | Tagged template literal | `` tag`hello ${42}` `` |
| E2E-092 | Computed property names | `{ [key]: 99 }` |
| E2E-093 | Private class fields | `class Counter { #count }` |
| E2E-094 | Static class methods | `class MathUtils { static }` |
| E2E-095 | BigInt | `9007199254740991n + 1n` |
| E2E-096 | Array.from | `Array.from({ length: 5 })` |
| E2E-097 | Nested ternary | `x > 10 ? ... : x > 3 ? ...` |
| E2E-098 | Custom error subclass | `class CustomError extends Error` |
| E2E-099 | Complex nested structure | Deep object + array access |
| E2E-100 | Rapid re-execution no crash | Run 3 times quickly |

---

## Cycle Log

| Cycle | Date | Tests Run | Passed | Failed | Notes |
|-------|------|-----------|--------|--------|-------|
| 1 | 2026-04-09 | 100 | 22 | 78 | All code exec tests failed — `spawn ENOTDIR` (esbuild binary inside asar) |
| 2 | 2026-04-09 | 100 | 72 | 28 | Fixed ESBUILD_BINARY_PATH. Remaining: `keyboard.type()` breaks multi-line in Monaco |
| 3 | 2026-04-09 | 100 | 99 | 1 | Switched to `monaco.editor.setValue()`. Only Settings dialog overlay issue |
| 4 | 2026-04-09 | 100 | 100 | 0 | All passing. Fixed dialog backdrop dismiss with `force: true` click |

## Key Fixes Found During E2E Testing

1. **`spawn ENOTDIR` in production build** — esbuild's `require.resolve()` finds its platform binary inside the asar archive, but `child_process.spawn()` can't execute from asar. Fix: set `ESBUILD_BINARY_PATH` env var to the `app.asar.unpacked` binary path in `src/main/index.ts`.

2. **Worker fork also needs asar-unpacked path** — Same issue for `worker.cjs`. Fix: check `__dirname.includes('app.asar')` first in `resolveWorkerPath()` and prefer the unpacked path.

3. **Playwright `keyboard.type()` breaks multi-line code in Monaco** — Newline characters don't translate to actual line breaks. Fix: use `monaco.editor.getEditors()[0].setValue(code)` via `page.evaluate()`.

4. **Dialog overlays block subsequent interactions** — `useDialogTransition` keeps overlays mounted during exit animation. Fix: click backdrop with `{ force: true }` and wait for animation to complete.
