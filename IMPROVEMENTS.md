# Improvements & Known Limitations

A catalog of edge cases, limitations, and potential improvements in the code execution pipeline.

---

## Critical

### 1. Infinite synchronous loops are undetectable
**File:** `apps/desktop/src/main/executor/worker.ts`

The worker runs in a single thread. A synchronous infinite loop blocks everything — the only escape is the parent's 5-second timeout killing the process. There is no in-process bailout or cooperative scheduling.

```js
while (true) {} // Hangs until external timeout kills the worker
```

**Possible fix:** Inject a loop counter or timeout check via instrumentation (e.g., insert `if (Date.now() > deadline) throw new Error("timeout")` inside loops).

### 2. No serialization size limit in console capture
**File:** `apps/desktop/src/main/executor/console-capture.ts`

`serializeArg()` recursively walks the entire object graph with no depth or size cap. Large objects serialize fully over IPC and can OOM or freeze the process.

```js
console.log(new Array(1_000_000).fill({ data: "x".repeat(1000) }))
```

**Possible fix:** Add a max depth (e.g., 5 levels) and max total size (e.g., 1MB) to `serializeArg()`. Truncate with a `[truncated]` marker.

---

## High

### 3. No persistent scope between runs
**File:** `apps/desktop/src/main/executor/worker.ts`

Each execution creates a new `AsyncFunction`. Variables from a previous run are gone.

```js
// Run 1:
const x = 42
// Run 2:
x // ReferenceError
```

**Possible fix:** Maintain a shared `vm.Context` or accumulate declarations across runs (like a REPL).

### 4. Regex literals rejected as expressions
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isExpression()`

Lines starting with `/` are rejected (treated as division operator), so regex literals at the top level aren't wrapped with `__expr__()`.

```js
/test/gi // Not recognized as an expression
```

**Possible fix:** Add regex detection — if a line starts with `/` and ends with `/[gimsuy]*`, treat it as an expression.

### 5. Unary operators rejected as expressions
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isExpression()`

`!x`, `~x`, `-x`, `+x` as standalone expressions are rejected because `isExpression()` excludes lines starting with operators.

```js
!someFlag // Valid expression, not recognized
```

**Possible fix:** Whitelist unary prefix operators (`!`, `~`, `+`, `-`, `typeof`, `void`) in `isExpression()`.

### 6. Re-exports not transformed
**File:** `apps/desktop/src/main/executor/instrument.ts` — `transformImports()`

`export { foo } from "bar"` isn't handled — only lines starting with `import` are matched. This fails at runtime inside `AsyncFunction`.

**Possible fix:** Add regex patterns for `export ... from` syntax, converting to `const { foo } = require("bar"); module.exports.foo = foo` or similar.

### 7. Silent promise rejections
**File:** `apps/desktop/src/main/executor/worker.ts`

When `__expr__()` tracks a promise that rejects, the rejection handler is a no-op. The error is silently swallowed.

```js
Promise.reject(new Error("oops")) // Expression tracked, rejection lost
```

**Possible fix:** Capture rejection in the `__expr__` handler and send it as an error `OutputEntry` to the renderer.

### 8. Exit code 0 without result = silent failure
**File:** `apps/desktop/src/main/executor/runner.ts`

If the worker exits cleanly (code 0) but never sent a `result` message, the runner doesn't report an error. The user sees no output and no error.

**Possible fix:** Track whether a `result` or `error` message was received. If the process exits without one, fire `onDone` with a synthetic error.

---

## Medium

### 9. Missing Node.js globals in worker
**File:** `apps/desktop/src/main/executor/worker.ts`

The `AsyncFunction` only receives `require`, `__console__`, `__expr__`, `__line__` as parameters. Common globals like `Buffer`, `__filename`, `__dirname` are unavailable or point to the worker's context.

```js
Buffer.from("hello") // ReferenceError
```

**Possible fix:** Pass `Buffer`, `URL`, `TextEncoder`, `TextDecoder`, etc. as additional parameters to the `AsyncFunction`.

### 10. `require()` resolves relative to the worker, not the user's project
**File:** `apps/desktop/src/main/executor/worker.ts`

File paths in `require("./file")` or `fs.readFileSync("./data.json")` resolve relative to the worker process CWD, not the user's expected directory.

**Possible fix:** Set the worker's CWD to the user's project directory, or rewrite relative paths during instrumentation.

### 11. Dynamic imports not transformed
**File:** `apps/desktop/src/main/executor/instrument.ts` — `transformImports()`

`import("lodash")` is valid syntax but the transformer only handles static `import ... from` patterns.

**Possible fix:** Leave dynamic imports as-is (they work natively in Node.js) or ensure the AsyncFunction context supports them.

### 12. Template literals in comments corrupt state
**File:** `apps/desktop/src/main/executor/instrument.ts`

A backtick inside a comment flips the `inTemplate` tracker, corrupting instrumentation for subsequent lines.

```js
// This has a backtick ` in a comment
const x = 1 // Instrumentation thinks we're inside a template literal
```

**Possible fix:** Strip or skip comment content before updating template literal state.

### 13. Arrow function continuations not detected
**File:** `apps/desktop/src/main/executor/instrument.ts` — `isChainContinuation()`

Only `.`, `?`, `:` are checked as continuation prefixes. Lines starting with `=>` aren't detected.

```js
const fn = (x)
  => x * 2 // __line__ inserted before =>, breaking syntax
```

**Possible fix:** Add `=>` to the continuation detection patterns.

### 14. `setInterval` never drains
**File:** `apps/desktop/src/main/executor/worker.ts`

Intervals auto-reschedule, so `pendingTimers` never reaches 0. `waitForAsyncDrain()` polls until the 5-second timeout.

```js
setInterval(() => console.log("tick"), 100) // Blocks drain
```

**Possible fix:** Auto-clear all intervals after main code completes, or cap interval execution count.

### 15. Race condition on timeout boundary
**File:** `apps/desktop/src/main/executor/runner.ts`

If the worker sends a result at t=5001ms but the timeout fires at t=5000ms, the `stopped` flag is set first and the valid result is silently dropped.

**Possible fix:** Add a small grace period after timeout, or check for pending messages before killing.

### 16. Many console methods uncaptured
**File:** `apps/desktop/src/main/executor/console-capture.ts`

Only `log`, `warn`, `error`, `info`, `debug`, `table`, `clear` are captured. Missing: `assert`, `time`/`timeEnd`, `count`/`countReset`, `trace`, `dir`, `group`/`groupEnd`.

**Possible fix:** Add handlers for the missing methods, at minimum `console.assert()`, `console.time()`, and `console.trace()`.

### 17. Circular reference detection is per-argument
**File:** `apps/desktop/src/main/executor/console-capture.ts`

Each argument in `console.log(a, b)` gets its own `WeakSet`. If `a` and `b` reference the same circular object, it's serialized twice.

**Possible fix:** Share a single `WeakSet` across all arguments within one `console.log()` call.

### 18. No JSX support in JavaScript mode
**File:** `apps/desktop/src/main/executor/transpiler.ts`

If the language is set to JavaScript but the code contains JSX, esbuild rejects it since the loader is `'ts'`, not `'tsx'`.

**Possible fix:** Detect JSX syntax and switch to the `tsx` loader automatically.

### 19. Source maps disabled
**File:** `apps/desktop/src/main/executor/transpiler.ts`

`sourcemap: false` is hardcoded. Error stack traces reference transpiled line numbers, and combined with `__line__` insertions shifting lines, error locations can be misleading.

**Possible fix:** Enable sourcemaps and map error locations back to original source.

---

## Low

### 20. No zombie process cleanup retry
**File:** `apps/desktop/src/main/executor/runner.ts`

`child.kill('SIGKILL')` doesn't check its return value. On rare failure, the process lingers.

**Possible fix:** Verify kill succeeded, retry if needed.

### 21. `@__PURE__` stripping is fragile
**File:** `apps/desktop/src/main/executor/transpiler.ts`

The regex-based cleanup of `/* @__PURE__ */` comments is context-unaware and could theoretically strip legitimate code containing that pattern.

**Possible fix:** Only strip these comments in known esbuild output patterns, or skip stripping entirely.

### 22. Circular promise dependencies not tracked
**File:** `apps/desktop/src/main/executor/worker.ts`

`Promise.allSettled(pendingPromises)` doesn't recursively track promises that resolve to other promises.

```js
const p1 = new Promise(r => setTimeout(() => r(p2), 100))
const p2 = new Promise(r => setTimeout(() => r(1), 200))
p1 // __expr__ tracks p1 but not the chained p2
```

**Possible fix:** Recursively unwrap promise results until a non-promise value is reached.
