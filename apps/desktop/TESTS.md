# nodl — Comprehensive Test Plan (Desktop App / Electron)

## Testing Stack

- **Unit tests**: Vitest (engine logic, stores, utils)
- **Component tests**: Vitest + React Testing Library (renderer components)
- **E2E tests**: Playwright Electron support (`electron = _electron.launch(...)`)
- **Convention**: test files colocated as `__tests__/ComponentName.test.tsx` or `module.test.ts`

---

## 1. Engine Tests (Unit — Vitest, run in Node.js)

### 1.1 `executor/runner.ts` — Child Process Code Execution

| # | Test Case | Input | Expected Output | Type |
|---|-----------|-------|-----------------|------|
| 1 | Execute simple expression | `1 + 1` | Last expression result: `2` | Happy |
| 2 | Execute console.log | `console.log("hi")` | Output entry: `{method:"log", args:["hi"]}` | Happy |
| 3 | Execute multiple console calls | `console.log(1); console.warn(2); console.error(3)` | 3 entries with correct methods | Happy |
| 4 | Execute console.info | `console.info("info")` | Entry with `method:"info"` | Happy |
| 5 | Execute console.clear | `console.log(1); console.clear(); console.log(2)` | Clear entry followed by `2` | Happy |
| 6 | Execute console.table | `console.table([{a:1}])` | Entry with `method:"table"`, args contain array | Happy |
| 7 | Syntax error | `const x = ;` | Error entry with SyntaxError message | Error |
| 8 | Runtime error — TypeError | `null.foo` | Error entry with TypeError message + stack trace | Error |
| 9 | Runtime error — ReferenceError | `undefinedVar` | Error entry with ReferenceError | Error |
| 10 | Thrown string | `throw "oops"` | Error entry with "oops" | Error |
| 11 | Thrown Error object | `throw new Error("bad")` | Error entry with "bad" + stack trace | Error |
| 12 | Thrown non-Error object | `throw { code: 42 }` | Error entry with serialized object | Error |
| 13 | Infinite loop — timeout kills child | `while(true) {}` | Execution terminates within timeout (5s), timeout error shown | Edge |
| 14 | Infinite recursion | `function f() { f() }; f()` | RangeError: Maximum call stack | Edge |
| 15 | Async code with await | `const r = await Promise.resolve(42); console.log(r)` | Output: `42` | Happy |
| 16 | Async rejection (unhandled) | `await Promise.reject("fail")` | Error entry with "fail" | Error |
| 17 | Async rejection (caught) | `try { await Promise.reject("x") } catch(e) { console.log("caught") }` | Output: "caught" | Happy |
| 18 | Return value of last expression | `const x = 5; x * 2` | Last expression: `10` | Happy |
| 19 | Return value — object | `({a: 1, b: 2})` | Last expression: `{a: 1, b: 2}` | Happy |
| 20 | Return value — undefined (statement) | `const x = 5;` | No return value entry (ends with statement) | Edge |
| 21 | Code that logs objects | `console.log({a: {b: {c: 1}}})` | Entry with nested object preserved in serialization | Happy |
| 22 | Code that logs arrays | `console.log([1, [2, [3]]])` | Entry with nested array preserved | Happy |
| 23 | Logs circular reference | `const a = {}; a.self = a; console.log(a)` | Entry without crash, circular marked as `[Circular]` | Edge |
| 24 | Console.log with multiple args | `console.log("a", 1, true, null)` | Single entry with 4 args | Happy |
| 25 | Empty code | `` (empty string) | No output, no errors, execution completes | Edge |
| 26 | Only comments | `// just a comment` | No output, no errors | Edge |
| 27 | Large output (10k logs) | `for(let i=0;i<10000;i++) console.log(i)` | All 10000 entries captured, no crash | Edge |
| 28 | Variables don't leak between runs | Run `var x = 1`, then run `console.log(x)` in new execution | ReferenceError (each run is a fresh child process) | Isolation |
| 29 | setTimeout works | `setTimeout(() => console.log("delayed"), 50)` | Output appears, process waits for timers | Happy |
| 30 | setInterval + clearInterval | `const id = setInterval(()=>console.log("tick"), 10); setTimeout(()=>clearInterval(id), 55)` | ~5 "tick" entries, process exits | Happy |
| 31 | process.exit in user code | `console.log("before"); process.exit(0)` | Output: "before", execution ends cleanly | Edge |
| 32 | Accessing __dirname / __filename | `console.log(typeof __dirname)` | Outputs "string" (or error if using ESM) | Edge |
| 33 | Stop execution mid-run | Start `while(true){}`, send stop signal | Child process killed, error/cancelled status returned | Happy |
| 34 | Multiple rapid executions | Fire 5 runs in quick succession | Each run produces independent output, no cross-contamination | Isolation |
| 35 | Code that writes to stdout directly | `process.stdout.write("raw")` | Captured (or ignored cleanly), doesn't corrupt IPC | Edge |

#### Node.js Built-in Module Access

| # | Test Case | Input | Expected | Type |
|---|-----------|-------|----------|------|
| 36 | require('fs') | `console.log(typeof require('fs').readFileSync)` | `"function"` | Happy |
| 37 | require('path') | `console.log(require('path').join('a','b'))` | `"a/b"` (platform-specific separator) | Happy |
| 38 | require('os') | `console.log(require('os').platform())` | Platform string (e.g., "darwin") | Happy |
| 39 | require('http') | `console.log(typeof require('http').createServer)` | `"function"` | Happy |
| 40 | require('crypto') | `console.log(require('crypto').randomBytes(4).length)` | `4` | Happy |
| 41 | require('child_process') | `console.log(typeof require('child_process').exec)` | `"function"` (allowed — user code runs in sandbox) | Happy |
| 42 | fs.readdirSync('.') | `console.log(require('fs').readdirSync('.').length > 0)` | `true` | Happy |
| 43 | fetch (global, Node 18+) | `const r = await fetch('https://httpbin.org/get'); console.log(r.status)` | `200` | Happy |
| 44 | Buffer | `console.log(Buffer.from("hello").toString('base64'))` | `"aGVsbG8="` | Happy |
| 45 | URL / URLSearchParams | `console.log(new URL('https://a.com/b').pathname)` | `"/b"` | Happy |

### 1.2 `executor/transpiler.ts` — Native esbuild

| # | Test Case | Input | Expected | Type |
|---|-----------|-------|----------|------|
| 1 | Transpile simple TS | `const x: number = 1; console.log(x)` | Valid JS, types stripped | Happy |
| 2 | Transpile interface | `interface Foo { bar: string }` | Empty or no-op JS | Happy |
| 3 | Transpile enum | `enum Dir { Up, Down }; console.log(Dir.Up)` | Valid JS enum output | Happy |
| 4 | Transpile generic function | `function id<T>(x: T): T { return x }` | Valid JS | Happy |
| 5 | Transpile type assertion | `const x = "hi" as string` | `const x = "hi"` | Happy |
| 6 | Transpile TSX | `const el = <div>hi</div>` | Valid JSX transform | Happy |
| 7 | Transpile optional chaining | `a?.b?.c` | Preserved (modern target) | Happy |
| 8 | Transpile nullish coalescing | `a ?? b` | Preserved | Happy |
| 9 | Transpile satisfies | `const x = {a: 1} satisfies Record<string, number>` | Types stripped | Happy |
| 10 | TS syntax error | `const x: = 1` | Returns error array with line/col, no throw | Error |
| 11 | Multiple errors | `const x: = 1; const y: = 2` | Returns all errors | Error |
| 12 | Invalid TS type (type error, not syntax) | `const x: number = "hi"` | Still transpiles — esbuild strips types, doesn't type-check | Edge |
| 13 | Empty input | `` | Empty string output | Edge |
| 14 | Decorators | `@decorator class Foo {}` | Transpiled with experimentalDecorators or error | Edge |
| 15 | Import statements preserved | `import _ from "lodash"` | Import or require in output (depends on format) | Happy |
| 16 | Top-level await | `const x = await fetch("...")` | Preserved in output | Happy |
| 17 | Very large file (10k lines) | Generated code | Completes within 500ms (native esbuild is fast) | Perf |
| 18 | Transpile to CJS format | Config set to cjs | Output uses `require()` / `module.exports` | Happy |

### 1.3 `executor/console-capture.ts` — Serialization

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Serialize string | `{type: "string", value: "hello"}` | Happy |
| 2 | Serialize number | `{type: "number", value: 42}` | Happy |
| 3 | Serialize boolean | `{type: "boolean", value: true}` | Happy |
| 4 | Serialize null | `{type: "null"}` | Happy |
| 5 | Serialize undefined | `{type: "undefined"}` | Happy |
| 6 | Serialize plain object | `{type: "object", properties: [...]}` with key-value pairs | Happy |
| 7 | Serialize array | `{type: "array", items: [...]}` | Happy |
| 8 | Serialize nested object | Recursively serialized | Happy |
| 9 | Serialize circular reference | Circular ref marked as `{type: "circular"}` | Edge |
| 10 | Serialize Date | `{type: "date", value: "2024-01-01T..."}` | Happy |
| 11 | Serialize RegExp | `{type: "regexp", source: "abc", flags: "gi"}` | Happy |
| 12 | Serialize Error | `{type: "error", message: "...", stack: "..."}` | Happy |
| 13 | Serialize Map | `{type: "map", entries: [...]}` | Happy |
| 14 | Serialize Set | `{type: "set", items: [...]}` | Happy |
| 15 | Serialize Symbol | `{type: "symbol", description: "foo"}` | Happy |
| 16 | Serialize BigInt | `{type: "bigint", value: "123"}` | Happy |
| 17 | Serialize function | `{type: "function", name: "myFunc"}` | Happy |
| 18 | Serialize Buffer | `{type: "buffer", data: [...]}` or hex string | Happy |
| 19 | Serialize class instance | Serialized as object with constructor name | Happy |
| 20 | Serialize deeply nested (50 levels) | Stops at max depth, shows truncation marker | Edge |
| 21 | Serialize very large object (10k keys) | Truncated after limit (e.g., 100 keys), marker shown | Edge |
| 22 | Serialize very large array (10k items) | Truncated after limit, marker shown | Edge |
| 23 | Serialize non-enumerable properties | Skipped (or optionally included) | Edge |
| 24 | Serialize getter that throws | Property shown as `[Getter error]`, no crash | Edge |
| 25 | Serialize Proxy | Serialized without crash | Edge |
| 26 | Multiple args in single log | All args serialized independently | Happy |

---

## 2. Component Tests (Vitest + React Testing Library)

### 2.1 `EditorPane`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Renders Monaco editor | Editor container element present in DOM | Happy |
| 2 | Shows run button | Button with ▶ or "Run" label visible | Happy |
| 3 | Shows stop button during execution | Stop button visible when `isRunning=true` | Happy |
| 4 | Shows auto-run toggle | Toggle/switch visible | Happy |
| 5 | Run button calls execution handler | Clicking Run calls the provided `onRun` callback | Happy |
| 6 | Run button disabled during execution | Button disabled or hidden when `isRunning=true` | Happy |
| 7 | Displays correct language badge | Shows "JS" or "TS" indicator | Happy |
| 8 | Code changes call onChange | Mocked Monaco change triggers store update | Happy |

### 2.2 `OutputPane`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Renders empty state | "Run your code to see output here" message | Happy |
| 2 | Renders log entries | Entries appear as list items | Happy |
| 3 | Color-codes by method | warn=yellow border/bg, error=red | Happy |
| 4 | Clear button clears output | Entries removed after click | Happy |
| 5 | Auto-scrolls to bottom | Scroll container scrollTop near max after new entry | Happy |
| 6 | Shows execution time | "Ran in Xms" footer visible after execution | Happy |
| 7 | Shows error with stack trace | Stack trace lines rendered for error entries | Happy |
| 8 | Shows "Running..." indicator | Spinner or text when execution is in progress | Happy |
| 9 | Shows timeout error | Distinct "Execution timed out" message | Error |
| 10 | Handles many entries (virtualized or capped) | 1000+ entries render without freezing | Perf |

### 2.3 `ConsoleEntry`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | String value | Rendered as green-tinted text (like DevTools) | Happy |
| 2 | Number value | Rendered as blue-tinted text | Happy |
| 3 | Boolean value | `true`/`false` with distinct color | Happy |
| 4 | null | Rendered as grey "null" | Happy |
| 5 | undefined | Rendered as grey "undefined" | Happy |
| 6 | Multiple args | All args shown space-separated | Happy |
| 7 | Error method | Red background/left-border | Happy |
| 8 | Warn method | Yellow background/left-border | Happy |
| 9 | Info method | Blue icon or left-border | Happy |
| 10 | Table method | Renders `<table>` element | Happy |
| 11 | Object arg | Renders `ObjectTree` component | Happy |
| 12 | Array arg | Renders `ObjectTree` for array | Happy |
| 13 | Last-expression entry | Dimmed style with `←` prefix | Happy |

### 2.4 `ObjectTree`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Shallow object | Shows `{a: 1, b: 2}` inline (collapsed) | Happy |
| 2 | Click to expand | Shows keys and values on separate indented lines | Happy |
| 3 | Click again to collapse | Returns to inline view | Happy |
| 4 | Nested object | Inner object expandable independently | Happy |
| 5 | Array | Shows `Array(3) [1, 2, 3]` format | Happy |
| 6 | Empty object | Shows `{}` | Edge |
| 7 | Empty array | Shows `Array(0) []` | Edge |
| 8 | Circular ref marker | Shows `[Circular]` in grey | Edge |
| 9 | Date | Shows `Date "2024-01-01T00:00:00.000Z"` | Edge |
| 10 | RegExp | Shows `/pattern/flags` | Edge |
| 11 | Map | Shows `Map(N)` with expandable entries | Edge |
| 12 | Set | Shows `Set(N)` with expandable items | Edge |
| 13 | Error object | Shows `Error` with message + expandable stack | Edge |
| 14 | Null prototype object | Renders as `Object [null prototype] {...}` | Edge |
| 15 | Deeply nested (>10 levels) | Stops at max depth, shows `(...)` | Edge |
| 16 | Large array (1000 items) | Shows first N items + "... N more" | Perf |
| 17 | Symbol keys | Displayed as `[Symbol(desc)]: value` | Edge |
| 18 | BigInt values | Displayed as `123n` | Edge |
| 19 | Buffer | Displayed as `Buffer(N) [...]` | Edge |
| 20 | Function value | Shows `ƒ functionName()` | Edge |

### 2.5 `TabBar`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Renders tabs | All tab names visible | Happy |
| 2 | Active tab highlighted | Visual distinction (bg color, border) | Happy |
| 3 | Click tab switches active | Calls `setActiveTab` with correct ID | Happy |
| 4 | Click + creates tab | Calls `createTab` | Happy |
| 5 | Click × closes tab | Calls `closeTab` with correct ID | Happy |
| 6 | × button not visible on hover-off | Only visible on hover (or always for active tab) | Happy |
| 7 | Double-click to rename | Inline `<input>` appears with current name | Happy |
| 8 | Rename confirm with Enter | Calls `renameTab`, input closes | Happy |
| 9 | Rename cancel with Escape | Input closes, name unchanged | Happy |
| 10 | Rename to empty string | Rejected, reverts to old name | Edge |
| 11 | Rename to whitespace-only | Rejected, reverts to old name | Edge |
| 12 | Close last tab | `closeTab` called, store creates new default tab | Edge |
| 13 | Many tabs (20+) | Horizontal scroll appears, no layout break | Edge |
| 14 | Tab name truncation | Names longer than ~20 chars truncated with ellipsis | Edge |
| 15 | Language icon per tab | Shows JS/TS icon or file extension | Happy |
| 16 | Drag to reorder | `reorderTabs` called with new order | Happy |

### 2.6 `SettingsDialog`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Opens on trigger | Modal rendered in DOM | Happy |
| 2 | Font size control | Changing value calls `setFontSize` | Happy |
| 3 | Tab size toggle (2/4) | Calls `setTabSize` | Happy |
| 4 | Word wrap toggle | Calls `setWordWrap` | Happy |
| 5 | Minimap toggle | Calls `setMinimap` | Happy |
| 6 | Auto-run toggle | Calls `setAutoRun` | Happy |
| 7 | Auto-run delay slider | Calls `setAutoRunDelay` | Happy |
| 8 | Execution timeout control | Calls `setExecutionTimeout` | Happy |
| 9 | Theme selector | Calls `setTheme` | Happy |
| 10 | Close with Escape | Dialog closes, settings retained | Happy |
| 11 | Close with × button | Dialog closes | Happy |
| 12 | Close with overlay click | Dialog closes | Happy |
| 13 | Values match current settings | Controls pre-filled with store values | Happy |

### 2.7 `PackageDialog`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Opens on trigger | Modal with search input visible, input focused | Happy |
| 2 | Search shows results | Typing triggers search, results appear | Happy |
| 3 | Debounced search | Rapid typing fires only one search after pause | Perf |
| 4 | Click result triggers install | Calls `installPackage` IPC with name | Happy |
| 5 | Shows install progress | Spinner/loading state during install | Happy |
| 6 | Shows install success | Success indicator, package in list | Happy |
| 7 | Empty search | "Type to search npm packages" message | Edge |
| 8 | No results found | "No packages found" message | Edge |
| 9 | Network error on search | Error message displayed, retry possible | Error |
| 10 | Install failure | Error message with pnpm output | Error |
| 11 | Adding already-installed package | Shows "already installed" or updates version | Edge |
| 12 | Shows package metadata | Description, version, download count | Happy |

---

## 3. Store Tests (Unit — Vitest)

### 3.1 `tabs` store

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Initial state | One default tab ("Untitled 1"), active | Happy |
| 2 | createTab | New tab added to end, becomes active, named "Untitled N" | Happy |
| 3 | createTab increments name | After "Untitled 1", next is "Untitled 2" | Happy |
| 4 | closeTab (with others) | Tab removed, active switches to right neighbor (or left if rightmost) | Happy |
| 5 | closeTab (last one) | New default tab created, becomes active | Edge |
| 6 | closeTab (active, others exist) | Adjacent tab becomes active | Happy |
| 7 | closeTab (inactive) | Active tab unchanged | Happy |
| 8 | renameTab | Name updates, other fields unchanged | Happy |
| 9 | renameTab to empty | Rejected, name unchanged | Edge |
| 10 | renameTab to whitespace | Rejected, name unchanged | Edge |
| 11 | setActiveTab | Active tab ID updates | Happy |
| 12 | setActiveTab with invalid ID | No-op or error, active unchanged | Edge |
| 13 | updateCode | Active tab's code updates, updatedAt changes | Happy |
| 14 | updateCode on inactive tab | Correct tab updated | Happy |
| 15 | reorderTabs | Tab order changes to match new array | Happy |
| 16 | Multiple rapid createTab | All created, no duplicate IDs | Edge |
| 17 | setLanguage | Tab language switches, no code change | Happy |

### 3.2 `settings` store

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Default values | fontSize=14, tabSize=2, theme="dark", autoRun=true, autoRunDelay=300, executionTimeout=5000, wordWrap=true, minimap=false | Happy |
| 2 | setFontSize | Value updates | Happy |
| 3 | setFontSize below min (10) | Clamped to 10 | Edge |
| 4 | setFontSize above max (24) | Clamped to 24 | Edge |
| 5 | setFontSize non-integer | Rounded to integer | Edge |
| 6 | setAutoRun toggle | Boolean flips | Happy |
| 7 | setAutoRunDelay | Value updates | Happy |
| 8 | setAutoRunDelay below min (100) | Clamped to 100 | Edge |
| 9 | setAutoRunDelay above max (2000) | Clamped to 2000 | Edge |
| 10 | setExecutionTimeout | Value updates | Happy |
| 11 | setTheme("light") | Theme changes to light | Happy |
| 12 | setTheme("dark") | Theme changes to dark | Happy |
| 13 | setTheme("system") | Theme set to system | Happy |
| 14 | setTabSize(4) | Value updates | Happy |
| 15 | setWordWrap toggle | Boolean flips | Happy |
| 16 | setMinimap toggle | Boolean flips | Happy |

### 3.3 `output` store

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | addEntry | Entry appended to specified tab's output | Happy |
| 2 | clearOutput(tabId) | Specified tab's entries cleared | Happy |
| 3 | clearOutput doesn't affect other tabs | Other tab's entries intact | Isolation |
| 4 | Max entries limit (5000) | Oldest entries evicted when limit exceeded | Edge |
| 5 | Per-tab isolation | addEntry to tab A doesn't appear in tab B | Isolation |
| 6 | setExecutionStatus(tabId, "running") | Status updated | Happy |
| 7 | setExecutionDuration(tabId, ms) | Duration stored | Happy |
| 8 | addEntry with all console methods | Each method type stored correctly | Happy |
| 9 | Bulk add (e.g., from buffered output) | All entries added in order | Happy |

### 3.4 `packages` store

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | addPackage | Package added to global list | Happy |
| 2 | removePackage | Package removed from list | Happy |
| 3 | addPackage duplicate name | Version updated (or ignored) | Edge |
| 4 | Package with version | Version stored correctly | Happy |
| 5 | setInstalling(name, true/false) | Loading state updated | Happy |
| 6 | setInstallError(name, error) | Error stored | Happy |
| 7 | List all packages | Returns all installed packages | Happy |

---

## 4. IPC / Preload Bridge Tests (Unit — Vitest)

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | runCode sends IPC message | `ipcRenderer.invoke("run-code", ...)` called with code + language | Happy |
| 2 | stopExecution sends IPC | `ipcRenderer.invoke("stop-execution")` called | Happy |
| 3 | onOutput registers listener | `ipcRenderer.on("output-entry", ...)` registered | Happy |
| 4 | onOutput cleanup removes listener | Calling cleanup fn removes the listener | Happy |
| 5 | installPackage sends IPC | `ipcRenderer.invoke("install-package", name)` called | Happy |
| 6 | removePackage sends IPC | `ipcRenderer.invoke("remove-package", name)` called | Happy |
| 7 | getSettings returns settings | Resolves with settings object from main | Happy |
| 8 | saveSettings sends settings | Sends settings object to main | Happy |
| 9 | Typed API matches shared types | TypeScript compilation succeeds with shared types | Safety |

---

## 5. Persistence Tests (Unit — Vitest)

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Save tabs to electron-store | Data written to JSON file | Happy |
| 2 | Load tabs from electron-store | Correct tabs restored | Happy |
| 3 | Save settings | Settings written | Happy |
| 4 | Load settings | Correct values hydrated | Happy |
| 5 | Corrupted JSON file | Falls back to defaults, no crash, file rewritten | Error |
| 6 | Missing JSON file (first launch) | Default state created, file written | Edge |
| 7 | Schema migration v1 → v2 | Old data migrated correctly | Edge |
| 8 | Debounced save | 10 rapid changes result in 1-2 writes | Perf |
| 9 | Save large code (100KB) | Successfully saved and loaded | Edge |
| 10 | Concurrent saves | Last write wins, no corruption | Edge |
| 11 | Save window state (size, position) | Restored on next launch | Happy |
| 12 | Save installed packages list | Packages list restored | Happy |

---

## 6. Hook Tests (Unit — Vitest)

### 6.1 `useAutoRun`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Fires after debounce delay | Execution triggered after 300ms of no input | Happy |
| 2 | Resets on new input | Timer resets, only fires once after final keystroke | Happy |
| 3 | Disabled when autoRun=false | No execution triggered on code change | Happy |
| 4 | Cancels on tab switch | Pending execution cancelled | Edge |
| 5 | Cancels on manual run | Pending auto-run cancelled to avoid double execution | Edge |
| 6 | Respects custom delay | Fires after configured delay (e.g., 500ms) | Happy |
| 7 | Kills previous execution | If prior run still active, stops it before starting new | Edge |

### 6.2 `useCodeExecution`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | JS code path | Sends JS code directly to main (no transpile) | Happy |
| 2 | TS code path | Sends TS code, main transpiles then executes | Happy |
| 3 | Transpile error | Error shown in output, execution skipped | Error |
| 4 | Runtime error | Error entry appears in output | Error |
| 5 | Output entries streamed | Entries appear one by one (not batched at end) | Happy |
| 6 | Execution time measured | Duration available after completion | Happy |
| 7 | Concurrent executions | New run kills previous, only latest output shown | Edge |
| 8 | isRunning state | True during execution, false after | Happy |
| 9 | Stop mid-execution | Calling stop sets isRunning=false, kills child | Happy |

### 6.3 `usePersistence`

| # | Test Case | Expected | Type |
|---|-----------|----------|------|
| 1 | Saves on tab create/close | electron-store updated | Happy |
| 2 | Saves on code change | Debounced write via IPC | Happy |
| 3 | Saves on settings change | Immediate or debounced write | Happy |
| 4 | Hydrates on mount | Store populated from electron-store data | Happy |
| 5 | Handles file permission error | Graceful degradation, warning in console | Error |

---

## 7. Integration Tests (Vitest, may need Electron test harness)

| # | Test Case | Steps | Expected | Type |
|---|-----------|-------|----------|------|
| 1 | Full JS execution flow | Send JS code via IPC → receive output entries | Output matches expected | Happy |
| 2 | Full TS execution flow | Send TS code → transpile → execute → output | Types stripped, output correct | Happy |
| 3 | TS syntax error flow | Send bad TS → transpile fails → error returned | Error entry with line info | Error |
| 4 | Timeout flow | Send infinite loop → wait → timeout | Timeout error returned within ~5s | Edge |
| 5 | Stop execution flow | Send long-running code → stop → verify killed | Process killed, status returned | Happy |
| 6 | pnpm install flow | Call installPackage("left-pad") → verify installed | Package in node_modules, success returned | Happy |
| 7 | pnpm install + require flow | Install package → execute code that requires it | Output shows package works | Happy |
| 8 | Persistence round-trip | Write tabs/settings → read back | Data matches | Happy |
| 9 | Serialization round-trip | Serialize complex object in child → deserialize in renderer | Object tree renders correctly | Happy |
| 10 | Multiple tabs execution | Run code in tab A, switch to B, run different code | Each tab has own output | Isolation |

---

## 8. E2E Tests (Playwright with Electron)

| # | Test Case | Steps | Expected | Type |
|---|-----------|-------|----------|------|
| 1 | App launches | Start Electron app | Window visible with editor + output | Smoke |
| 2 | Type and run JS | Type `console.log(42)` → Click Run | "42" in output panel | Happy |
| 3 | Type and run TS | Type `const x: number = 42; console.log(x)` → Run | "42" in output | Happy |
| 4 | Auto-run mode | Toggle auto-run on → Type code → Wait 500ms | Output appears automatically | Happy |
| 5 | Run with Cmd+Enter | Type code → Press Cmd+Enter | Output appears | Happy |
| 6 | Stop running code | Run `while(true){}` → Click Stop | Execution stopped, error/cancel shown | Happy |
| 7 | Create & switch tabs | Click + → Type code in tab 2 → Click tab 1 | Tab 1 has original code, tab 2 has new code | Happy |
| 8 | Rename tab | Double-click tab name → Type "My Script" → Enter | Tab shows "My Script" | Happy |
| 9 | Close tab | Click × on tab → Verify removed | Tab gone, adjacent active | Happy |
| 10 | Close last tab | Close all tabs one by one | New default tab created, never zero | Edge |
| 11 | Resize panes | Drag divider | Both panes resize, content visible | Happy |
| 12 | Toggle theme | Click theme toggle | App + editor switch light/dark | Happy |
| 13 | Open settings | Click settings icon → Change font size → Close | Editor font updated | Happy |
| 14 | Session persistence | Type code → Quit app → Relaunch | Code restored in correct tab | Happy |
| 15 | Console.error display | Run `console.error("fail")` | Red styled error entry | Happy |
| 16 | Console.warn display | Run `console.warn("caution")` | Yellow styled warn entry | Happy |
| 17 | Object expansion | Run `console.log({a:{b:1}})` → Click to expand | Keys visible | Happy |
| 18 | Syntax error | Run `const x = ;` | SyntaxError in red | Error |
| 19 | Runtime error | Run `null.foo` | TypeError with stack trace | Error |
| 20 | Large output | Run `for(let i=0;i<1000;i++) console.log(i)` | All entries visible, scrollable | Perf |
| 21 | Console.table | Run `console.table([{a:1,b:2}])` | Table rendered | Happy |
| 22 | Clear output | Run code → Click Clear | Output panel empty | Happy |
| 23 | Node.js API access | Run `console.log(require('os').platform())` | Platform string shown | Happy |
| 24 | require installed package | Install lodash → Run `console.log(require('lodash').VERSION)` | Version number shown | Happy |
| 25 | Keyboard: new tab | Cmd+N | New tab created | Happy |
| 26 | Keyboard: close tab | Cmd+W | Active tab closed | Happy |
| 27 | Keyboard: switch tab | Cmd+1, Cmd+2 | Correct tab activated | Happy |
| 28 | Window remembers size | Resize window → Quit → Relaunch | Same size/position | Happy |
| 29 | Execution timeout | Run `while(true){}` → Wait 5s | Timeout error shown | Edge |
| 30 | Multiple rapid runs | Click Run 5 times fast | Only last run's output shown | Edge |
| 31 | Last expression result | Run `5 + 5` | Shows `← 10` dimmed | Happy |
| 32 | App menu: New Tab | File → New Tab | New tab created | Happy |
| 33 | App menu: Toggle Theme | View → Toggle Theme | Theme switches | Happy |

---

## 9. Performance Benchmarks

| # | Metric | Target | How to Measure |
|---|--------|--------|---------------|
| 1 | App launch to interactive | < 2s | Playwright timing from launch to editor ready |
| 2 | JS execution latency (simple) | < 30ms | measure from IPC send to first output entry |
| 3 | TS transpile + execute | < 100ms for simple code | measure transpile + execution time |
| 4 | TS transpile (1000 lines) | < 100ms | Native esbuild is fast |
| 5 | Auto-run input-to-output | < 400ms (300ms debounce + execution) | E2E timing |
| 6 | Tab switch | < 50ms | Measure store update + re-render |
| 7 | 1000 console entries render | < 500ms, no dropped frames | DevTools performance panel |
| 8 | npm install (small package) | < 10s | Time from click to success |
| 9 | Memory after 100 runs | < 300MB RSS | `process.memoryUsage()` in main |
| 10 | Child process startup | < 50ms | Time from fork to ready message |
