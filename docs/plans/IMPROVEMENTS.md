# Improvements & Known Limitations

A catalog of edge cases, limitations, and potential improvements in the code execution pipeline.

---

## Critical

### 1. ~~Infinite synchronous loops are undetectable~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts`, `worker.ts`

The instrumenter now injects `__loopGuard__();` inside `for`/`while`/`do` loop bodies (after the opening `{`). The worker provides a `__loopGuard__` function that throws after 1,000,000 iterations with a clear error message. This catches infinite loops within milliseconds instead of waiting for the 5-second external timeout. Note: only works for loops with braces — single-line loops without `{` still rely on the timeout.

### 2. ~~No serialization size limit in console capture~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/console-capture.ts`

Added depth limit (8 levels), array item limit (1000), and object key limit (200) to `serializeArg()`. Deeply nested objects show `[Object (truncated)]` or `[Array (N)]`. Large arrays append `... N more items`. Large objects append `... N more keys`.

---

## High

### 3. No persistent scope between runs — DEFERRED
**File:** `apps/desktop/src/main/executor/worker.ts`

Each execution creates a new `AsyncFunction` in a fresh child process. Variables from a previous run are gone. Fixing this requires either a `vm.Context` that persists across runs (keeping the worker alive) or REPL-style declaration accumulation. Both are significant architectural changes that affect the isolation model.

### 4. ~~Regex literals rejected as expressions~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isExpression()`

Split `/` handling: if the line matches `/pattern/flags` (regex literal syntax), it's accepted as an expression. Otherwise (`/ 2`, `/= 3`), it's rejected as a division continuation.

### 5. ~~Unary operators rejected as expressions~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isExpression()`

Split the operator rejection regex: `!` and `~` are no longer rejected (always unary). `+` and `-` are only rejected when followed by a space (binary continuation), allowed when followed by a word char or `(` (unary). `typeof` and `void` were already allowed (not in STATEMENT_PREFIXES).

### 6. ~~Re-exports not transformed~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts` — `transformImports()`

Added handling for `export { a, b } from "mod"` → `const { a, b } = require("mod")`, `export * from "mod"` → `require("mod")`, and `export type { ... } from` → stripped. The instrumenter now detects `export ... from` lines and routes them through `transformImports()`.

### 7. ~~Silent promise rejections~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/worker.ts`

The `__expr__` rejection handler now sends the error message as a `console.error` entry to the renderer instead of silently swallowing it.

### 8. ~~Exit code 0 without result = silent failure~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/runner.ts`

Added `gotResult` flag. On exit, if no `result`/`error` message was received: exit code 0 fires `onDone({ success: true })`, non-zero fires `onDone` with an error. The user no longer sees a blank panel when the worker exits silently.

---

## Medium

### 9. ~~Missing Node.js globals in worker~~ ❌ NOT A BUG
**File:** `apps/desktop/src/main/executor/worker.ts`

Verified: `Buffer`, `URL`, `TextEncoder`, `TextDecoder`, `__dirname`, `__filename` are all available as Node.js globals inside `AsyncFunction`. They don't need to be passed as parameters. The worker runs in a real Node.js child process, so all globals are accessible.

### 10. `require()` resolves relative to the worker, not the user's project — DEFERRED
**File:** `apps/desktop/src/main/executor/worker.ts`

File paths in `require("./file")` or `fs.readFileSync("./data.json")` resolve relative to the worker process CWD, not the user's expected directory. Fixing this requires a "project directory" concept (e.g., letting users set a working directory per tab) and passing it to the worker's CWD.

### 11. ~~Dynamic imports not transformed~~ ❌ NOT A BUG
**File:** `apps/desktop/src/main/executor/instrument.ts` — `transformImports()`

Verified: `import("mod")` works natively inside `AsyncFunction` in Node.js. No transformation needed — dynamic imports are left as-is and work correctly.

### 12. ~~Template literals in comments corrupt state~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts`

Added `//` and `/* */` comment detection in `updateStack()`. When the character loop encounters `//` outside a string, it stops processing the rest of the line. Block comments `/* ... */` skip to the closing `*/`. Backticks inside comments no longer flip `inTemplate`.

### 13. ~~Arrow function continuations not detected~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isChainContinuation()`

Added `=>` to continuation detection in `isChainContinuation()`, `isExpression()`, and `nextNonEmptyIsContinuation()`. The instrumenter no longer inserts `__line__` before or on `=>` continuation lines. Note: `=>` on a new line is invalid JS syntax regardless — esbuild rejects it. But the instrumenter no longer makes it worse.

### 14. ~~`setInterval` never drains~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/worker.ts`

Added `trackedIntervals` set. After main code completes (and pending promises settle), all tracked intervals are auto-cleared before `waitForAsyncDrain()`. This prevents intervals from blocking the worker exit.

### 15. ~~Race condition on timeout boundary~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/runner.ts`

The timeout handler now checks `gotResult` before killing the worker. If the worker sent a valid result just before the timeout fired, the result is preserved and the timeout is a no-op.

### 16. ~~Many console methods uncaptured~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/console-capture.ts`

Added support for `assert` (only outputs on falsy), `time`/`timeEnd` (internal timer map), `count`/`countReset` (counter map), `trace` (with stack trace), `dir` (like log), `group`/`groupEnd` (group outputs as log, groupEnd is no-op). Updated `ConsoleMethod` type in `shared/types.ts`.

### 17. ~~Circular reference detection is per-argument~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/console-capture.ts`

A single `WeakSet` is now created per `console.log()` call and shared across all arguments. If the same circular object appears as multiple args, the second reference is `[Circular]` instead of being serialized again.

### 18. ~~No JSX support in JavaScript mode~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/transpiler.ts`

Added `detectJsx()` that checks for `<Component`, `<div`, or `<>` patterns. When JSX is detected and the loader is `'ts'`, it auto-upgrades to `'tsx'`.

### 19. Source maps disabled — DEFERRED
**File:** `apps/desktop/src/main/executor/transpiler.ts`

`sourcemap: false` is hardcoded. Enabling source maps requires generating mappings through the full instrument→transpile→worker pipeline and mapping error stack traces back to original line numbers. The `__line__` instrumentation already provides correct line tracking for console output, so the main gap is in error stack traces.

---

## Low

### 20. ~~No zombie process cleanup retry~~ ✅ FIXED
**File:** `apps/desktop/src/main/executor/runner.ts`

`cleanup()` now checks the return value of `child.kill('SIGKILL')`. If it returns false (kill failed), retries once with try/catch to handle the case where the process died between the check and the retry.

### 21. ~~`@__PURE__` stripping is fragile~~ ❌ ACCEPTABLE RISK
**File:** `apps/desktop/src/main/executor/transpiler.ts`

The regex matches the exact esbuild pattern `/* @__PURE__ */ ` (with trailing space). No legitimate user code would contain this exact string. `treeShaking: false` was tested but doesn't prevent the annotations. The current regex approach is the best available option.

### 22. ~~Circular promise dependencies not tracked~~ ❌ NOT A BUG
**File:** `apps/desktop/src/main/executor/worker.ts`

Verified: JavaScript's `.then()` automatically unwraps nested promises. `Promise.resolve(Promise.resolve(42)).then(v => ...)` gives `v = 42`. The `exprReporter`'s `.then()` handler already receives the fully unwrapped value — no manual recursion needed.
