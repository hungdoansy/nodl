# nodl — System Design

> How the app is put together, and — most importantly — how user code is transformed and executed.
> Companion to [DEVELOPMENT.md](DEVELOPMENT.md) (setup, scripts, packaging commands).

Last reviewed against the code: 2026-07-18 (desktop v2.3.0).

---

## 1. What nodl is

nodl is a desktop scratchpad for JavaScript/TypeScript: you type code in a Monaco editor, hit `Cmd+Enter` (or enable auto-run), and every top-level expression and `console.*` call shows its result **inline, aligned to the source line that produced it**. Think RunJS: instant feedback, npm packages, TypeScript out of the box.

That one product promise — *output aligned to the line that produced it* — drives most of the interesting engineering in this codebase. Everything in the execution pipeline exists to answer the question: **"which editor line produced this value?"** while never changing what the user's code actually does.

## 2. Monorepo layout

```
nodl/
├── apps/
│   ├── desktop/          # The Electron app (the product)
│   └── web/              # Landing page (Next.js 15, nodlapp.site)
├── docs/                 # This file, DEVELOPMENT.md, plans/, ideation/
└── turbo.json            # Turborepo orchestrates dev/build/test/lint
```

- **pnpm workspaces + Turborepo**, Node >= 22, pnpm 9.
- `apps/web` is a static marketing site deployed to Vercel via a deploy hook (triggered by release tags). It shares no code with the desktop app.
- Everything below is about `apps/desktop`.

## 3. Process model

nodl runs as **four cooperating processes**, each with a distinct job:

```
┌────────────────────────────────────────────────────────────────────┐
│ Electron main process            src/main/                         │
│   - window management, native menu, persistence                    │
│   - the code pipeline: instrument → transpile → fork worker        │
│   - npm package management (shells out to npm)                     │
└──────────┬────────────────────────────────────┬────────────────────┘
           │ IPC (contextBridge)                │ child_process.fork
┌──────────┴─────────────────┐       ┌──────────┴────────────────────┐
│ Renderer                   │       │ Worker (worker.cjs)           │
│   React 19 + Monaco +      │       │   - one fresh process PER RUN │
│   Zustand                  │       │   - executes instrumented JS  │
│   src/renderer, components,│       │     inside an AsyncFunction   │
│   store, hooks             │       │   - streams output over IPC   │
└──────────▲─────────────────┘       └───────────────────────────────┘
           │ window.electronAPI
┌──────────┴─────────────────┐
│ Preload (src/preload)      │
│   contextBridge: exposes a │
│   typed ElectronAPI only   │
└────────────────────────────┘
```

Key security posture: the renderer has `contextIsolation: true`, `nodeIntegration: false`. It can only do what the preload's `ElectronAPI` (`shared/types.ts`) allows. User code never runs in the main process or renderer — always in a disposable forked child.

### IPC surface

All channel names live in one place: `shared/types.ts` → `IPC` const. Three layers wrap them:

1. `src/preload/index.ts` — raw `ipcRenderer.send/invoke/on`, exposed as `window.electronAPI`.
2. `src/ipc/bridge.ts` — renderer-side typed wrapper with null-safe fallbacks (so components never touch `window.electronAPI` directly, and tests run without Electron).
3. `src/main/index.ts` — `ipcMain.on/handle` handlers.

Fire-and-forget channels use `send` (`RUN_CODE`, `SAVE_STATE`, …); request/response uses `invoke` (`LOAD_STATE`, `LIST_PACKAGES`, …). Events flowing main→renderer (`OUTPUT_ENTRY`, `EXECUTION_DONE`, menu events) are `webContents.send` + listener registration functions that return unsubscribers.

---

## 4. The execution pipeline (the heart of the app)

When the user hits Run, the renderer sends the **raw editor text** plus language over `IPC.RUN_CODE`. The main process handler (`src/main/index.ts`) then runs a strict 3-stage pipeline:

```
raw source (exactly what's in the editor)
   │
   ▼  STAGE 1 — instrumentCode()          src/main/executor/instrument.ts
instrumented TS  (still valid TypeScript, same line numbers)
   │
   ▼  STAGE 2 — transpile()               src/main/executor/transpiler.ts
plain JS (types stripped by esbuild)
   │
   ▼  STAGE 3 — runner.run()              src/main/executor/runner.ts
forked worker executes it               src/main/executor/worker.ts
   │
   ▼  streamed OutputEntry messages → renderer
```

**The ordering is deliberate and load-bearing**: instrumentation runs on the *original* source **before** transpilation, because the instrumenter records 1-based line numbers that must match what the user sees in the editor. If esbuild ran first, it could reshape/renumber lines and every inline output would land on the wrong row. esbuild's transform is then careful to be line-preserving for this code (no minify, no bundling — just type stripping).

### 4.1 Stage 1 — Instrumentation (`instrument.ts`, `instrument-ast.ts`)

`instrumentCode()` tries the **AST instrumenter** first and falls back to a **regex/line-scanner instrumenter** if parsing throws entirely. The AST path is primary (see `docs/ideation/2026-04-11-babel-vs-native-parser.md` and `docs/plans/AST_MIGRATION_PLAN.md` for the history).

Four transformations are applied, all injected as calls to functions that the worker will supply at runtime:

| Injection | What it does | Example |
|---|---|---|
| `__expr__(line, value)` | Wraps every **top-level expression statement** so its value can be reported inline | `1 + 1` → `__expr__(3, 1 + 1);` |
| `__line__.value = N;` | Inserted before every statement in a block context, so async `console.log`s can be attributed to a source line | `doThing()` → `__line__.value = 7;\ndoThing()` |
| ESM → `require()` | Rewrites `import`/`export ... from` since the code runs inside an `AsyncFunction`, not a module | `import x from "m"` → `const x = (() => { const _m = require("m"); return _m.default ?? _m; })()` |
| `__loopGuard__();` | Injected into **every loop body** (for/while/do/for-in/for-of) to detect infinite loops | `while (true) {` → `while (true) {\n__loopGuard__();` |

#### The AST instrumenter (`instrument-ast.ts`)

- Parses with **@babel/parser** in maximum-leniency mode: `errorRecovery: true`, `allowAwaitOutsideFunction`, `allowReturnOutsideFunction`, `allowImportExportEverywhere`, plugins `typescript` + `jsx`. Scratchpad code is often half-written; error recovery yields a partial AST instead of failing.
- Edits are applied with **magic-string** by character offset — the original text is never regenerated from the AST. This is what preserves line numbers exactly: insertions are appended at offsets, replacements (`overwrite`) only span the import/export statements being rewritten.
- Two passes, order matters:
  1. **Traverse pass** — `__line__` insertions (before any statement whose parent is `Program`/`BlockStatement`/`StaticBlock`), import/export rewrites, loop guards. Loop bodies that aren't blocks (`while (x) doThing()`) get wrapped in `{ __loopGuard__(); ... }`.
  2. **Top-level expression pass** — walks `ast.program.body` directly and wraps each `ExpressionStatement` in `__expr__(line, …)`. Runs second because magic-string accumulates `appendLeft` calls at the same offset left-to-right — this guarantees `__line__.value = N;` lands *before* `__expr__(N,` in the output.
- Import rewriting handles: side-effect imports, default (with `.default ?? _m` CJS/ESM interop), namespace, named (incl. renames and string-literal imports), mixed default+named, `import type` (stripped), `export { } from` / `export * from` (become `require` calls), `export const/default` (export keyword stripped), type-only exports (stripped).

#### The regex fallback (`instrumentWithRegex`)

Kept for the rare case where Babel can't produce any AST. It's a line-by-line scanner that maintains a delimiter stack with brace *classification* (`block` vs `class` vs `object` vs `switch` — only `block` contexts are safe for statement injection), tracks multiline template literals, skips comment/continuation lines (leading `.`, `?`, `:`, `=>`…), and applies a conservative `isExpression()` heuristic before wrapping with `__expr__`. It also strips inline `//` comments before wrapping (otherwise the closing `);` would be swallowed by the comment). It is strictly less capable than the AST path (e.g. only wraps expressions at the top level with an empty stack) but can't crash on weird input.

#### Why wrapping every expression is safe — the `__expr__` contract

`__expr__` (built in `expr-reporter.ts`) is a **passthrough**: it always returns the original value, so wrapping never changes program behavior. Its reporting rules:

- `undefined` results are **suppressed** — this is what makes uniformly wrapping `console.log(...)`, `void 0`, `setTimeout(...)` etc. harmless (they return `undefined` and produce no duplicate output).
- Promises are awaited off to the side: the resolved value is reported when it settles (unless `undefined`), rejections are reported as errors, and the pending promise is pushed to a `pendingPromises` list the worker drains before declaring the run finished.
- Reported values are tagged `{ __type: 'LastExpression', value }` so the renderer styles them differently from `console.log` output.

### 4.2 Stage 2 — Transpilation (`transpiler.ts`)

A thin wrapper over **esbuild `transformSync`**:

- Loader `ts`, auto-upgraded to `tsx` when the source looks like JSX (`/<[A-Za-z>]/`), with `jsx: 'automatic'`.
- `target: 'esnext'`, no sourcemaps, no minify — output stays line-aligned with input.
- Strips esbuild's `/* @__PURE__ */` annotations from the output (they would confuse the regex instrumenter's expression detection and add noise).
- Errors come back as `{line, column, message}`; the main process converts them into synthetic `error` output entries (`TypeScript error (line N): …`) and aborts the run before ever forking a worker. Note: this is *esbuild syntax-level* checking — full type checking is Monaco's job in the editor, not the pipeline's.
- JavaScript tabs skip this stage entirely (`payload.language === 'typescript'` gates it).

### 4.3 Stage 3 — Execution (`runner.ts` + `worker.ts`)

**Runner (main process side).** Each run gets a **fresh forked child process** — `createRunner()` is re-created per run, and any previous runner is `stop()`ped first (so re-running kills the old execution). Fork details:

- `serialization: 'advanced'` — structured-clone IPC, so Maps/Sets/etc. survive the process boundary after serialization.
- `NODE_PATH` is set to the app's managed packages directory (see §6) so `require('lodash')` resolves inside the worker.
- A **timeout** (default 5000 ms, user-configurable in settings) SIGKILLs the child and reports a timeout entry. `stop()` also SIGKILLs.
- Exit handling distinguishes: got a result message (normal), non-zero exit (error), zero exit without a message (synthetic success — e.g. `process.exit(0)` in user code).
- Worker `stderr` is forwarded to the main process console for debugging.

**Worker path resolution** is one of the packaging-sensitive spots: in dev the worker is built to `out/worker/worker.cjs` (electron-vite wipes `out/main` on rebuild); in the packaged app it's copied next to main **and asar-unpacked**, because `child_process.fork` cannot spawn a script from inside an asar archive (even though `existsSync` claims it exists — Electron's fs patch lies). The unpacked path is therefore checked *first*.

**Worker (child process side).** On receiving `{ code, language }`:

1. Builds the sandbox pieces:
   - `capturedConsole` — a fake `console` (see §4.4) whose entries get stamped with the current `__line__.value`.
   - `exprReporter` — the `__expr__` implementation.
   - `lineTracker` — the `{ value: 0 }` object the instrumented code mutates.
   - `loopGuard` — throws `Infinite loop detected` after 1,000,000 total iterations.
2. Wraps the code as:

   ```js
   const fn = new AsyncFunction(
     '__console__', 'require', '__expr__', '__line__', '__loopGuard__',
     `const console = __console__;\n${code}`
   )
   await fn(capturedConsole, require, exprReporter, lineTracker, loopGuard)
   ```

   `AsyncFunction` (grabbed via `Object.getPrototypeOf(async function(){}).constructor`) gives top-level `await` for free and scopes the injected helpers as parameters rather than globals. `require` is the worker's own Node require — resolution reaches user-installed packages via `NODE_PATH`.

3. **Async drain.** The worker monkey-patches `setTimeout`/`setInterval`/`clearTimeout`/`clearInterval` *before* execution to count pending timers. After the main function returns it:
   - awaits all `pendingPromises` from `__expr__` (async expression results),
   - **auto-clears all intervals** (they'd never drain otherwise),
   - polls until `pendingTimers` reaches 0 (or a 5 s cap), so `setTimeout`-chained logs still get captured.
4. Sends `{ type: 'result' }` (or `{ type: 'error' }` with the message, also emitted as an error entry pinned to the last tracked line) and `process.exit(0)`.

Isolation model, stated plainly: user code runs with **full Node.js privileges** in a separate short-lived process. The protections (timeout, loop guard, kill-on-rerun) are about *responsiveness*, not security sandboxing — same trust model as running `node script.js` yourself, which is appropriate for a local scratchpad.

### 4.4 Console capture & serialization (`console-capture.ts`)

The fake `console` implements the full practical surface: `log/warn/error/info/debug/table/dir` pass through serialization; `assert` emits only on falsy condition; `time/timeEnd` and `count/countReset` are implemented with local Maps; `trace` appends a cleaned stack; `group` degrades to `log`; `clear` becomes a special entry the renderer interprets as "wipe the buffer".

Values cross two process boundaries (worker→main→renderer), so `serializeArg()` converts everything to plain JSON-able data with type tags the renderer's `ObjectTree` knows how to render:

- Tagged wrappers: `{ __type: 'Undefined' | 'Error' | 'Date' | 'RegExp' | 'Map' | 'Set' | 'LastExpression' }`.
- Functions → `"[Function: name]"`, symbols/bigints → strings.
- Cycle-safe (`WeakSet` → `"[Circular]"`), depth-capped (8), size-capped (1000 array items, 200 object keys, with `"... N more"` markers).

Every entry is an `OutputEntry { id, method, args, timestamp, line? }` — `line` is the value of `__line__` at call time, which is how a `console.log` inside a callback that fires 2 seconds later still lands on the right editor row.

### 4.5 End-to-end walkthrough

User code:

```ts
import _ from "lodash"          // line 1

const xs = [1, 2, 3]            // line 3
_.sum(xs)                       // line 4
setTimeout(() => console.log("later"), 100)  // line 5
```

After Stage 1 (conceptually):

```js
__line__.value = 1;
const _ = (() => { const _m = require("lodash"); return _m.default ?? _m; })()

__line__.value = 3;
const xs = [1, 2, 3]
__line__.value = 4;
__expr__(4, _.sum(xs));
__line__.value = 5;
__expr__(5, setTimeout(() => { __line__.value = 5; console.log("later") }, 100));
```

Stage 2 strips nothing here (no types), Stage 3 forks a worker: `__expr__(4, 6)` emits a `LastExpression` entry for line 4; the `setTimeout` call returns a Timeout object (reported for line 5); the worker's drain loop keeps the process alive 100 ms so the `"later"` log (line 5, because `__line__` was last set to 5 inside that callback's body) is captured before `result` is sent. The renderer shows `6` beside line 4 and both entries beside line 5.

---

## 5. Renderer architecture

React 19 + Zustand + Monaco, no router. State is sliced into small stores (`src/store/`):

| Store | Owns |
|---|---|
| `tabs.ts` | tab list, active tab, code content (source of truth for the editor) |
| `output.ts` | per-tab output entries + last result, `isRunning`, the run buffer |
| `settings.ts` | font size, vim mode, auto-run, timeout, theme… (persisted via IPC) |
| `ui.ts` | dialogs open/closed, output mode (aligned vs console) |
| `scroll-sync.ts` | shared scrollTop + per-line pixel heights (editor ↔ output) |
| `packages.ts` | installed npm packages list |

Hooks (`src/hooks/`) compose stores with the IPC bridge: `useCodeExecution` (run/stop/clear + selectors), `useOutputListener` (subscribes to `OUTPUT_ENTRY`/`EXECUTION_DONE` exactly once at App level), `useAutoRun` (debounced run-on-keystroke), `usePersistence`, `useKeyboardShortcuts`, `useMenuEvents`, `useErrorHighlighting` (Monaco decorations from error entries), `useTheme`.

### Output buffering — why results don't flicker

`output.ts` **buffers** entries during a run instead of appending live: `addEntry` pushes to `buffer`, and only `setDone` atomically swaps `outputs[tabId] = { entries: buffer, lastResult }`. The previous run's output stays visible until the new run completes — no flash of empty panel on every auto-run keystroke. `console.clear()` resets the buffer mid-run.

### The aligned-output algorithm (`OutputPane.tsx`)

The output panel renders **one row per editor line**, so results sit beside their source. The hard part is heights:

1. Entries are grouped by `line` (`groupByLine`); entries with no line (and errors) render in separate sections — errors pinned at top, unattributed output below.
2. Each editor line's *actual* pixel height comes from Monaco (`getTopForLineNumber` deltas, recomputed on layout/content change) — this accounts for word-wrapped lines being taller. Published through `scroll-sync.ts`.
3. `computeAdjustedHeights()` handles output taller than its source line (a 10-line object beside a 1-line `console.log`): the overflow is **absorbed into subsequent blank lines**, shrinking them until the overflow is paid off, so alignment recovers as soon as possible instead of pushing everything down.
4. Content heights are *measured* with a `ResizeObserver` (expanding an `ObjectTree` changes them), with `flushSync` so the height adjustment lands in the same frame — no visible jump.
5. Scroll sync is bidirectional: editor scroll events → store → output pane sets `scrollTop`, and vice versa, with an `ignoreScroll` ref + `requestAnimationFrame` handshake to break feedback loops.

A toolbar toggle switches to **console mode**: a flat, chronological list, auto-scrolled to bottom — no alignment machinery.

### Monaco integration (`EditorPane.tsx`)

- One Monaco model per tab at path `file:///src/<tabId>.ts`, language always `typescript` (JS is a subset; type stripping happens in the pipeline).
- Compiler options tuned for scratchpad use; diagnostics for "cannot find module" and friends are suppressed (`2792, 2307, 1259, 1471, 7016`) because packages resolve at *runtime* via `require`, not in Monaco's virtual FS.
- **Type definitions for installed packages** are injected as extra libs: the main process scans each installed package for *all* its `.d.ts` files plus its `package.json` (so TS module resolution finds the `types` field), and the renderer registers them at `file:///node_modules/<path>` (§6). This gives real IntelliSense for `import _ from "lodash"`.
- A custom **import-path completion provider** fills the gap that Monaco's TS worker can't (no `readDirectory`): it suggests module specifiers (including subpaths like `lodash/join`) derived from the registered type-lib paths.
- Optional vim mode via `monaco-vim`.

---

## 6. npm package management (`package-manager.ts`)

Users can install packages from inside the app. Design:

- All packages live in **one managed directory**: `<userData>/packages/` with its own minimal `package.json`. Nothing touches the user's projects.
- Install/remove shell out to the **user's own npm** (`execSync`, `--save-exact`). Finding npm is non-trivial in a packaged app (Electron launches with a bare PATH), so `resolveNpm()` probes: PATH → Homebrew (both archs) → Windows installer/Scoop paths → newest nvm version. If nothing works, the error tells the user to install Node.
- Search and update-checks hit the npm registry HTTP API directly (no npm CLI needed).
- The **worker** resolves these packages because the runner sets `NODE_PATH=<userData>/packages/node_modules` on fork.
- The **editor** gets types because `getTypeDefinitions()` recursively collects every `.d.ts` in each installed package (handling `@types/*` layouts with per-method files like `lodash/join.d.ts`) and ships them to Monaco over IPC.

So one installed package feeds two independent consumers: runtime resolution (worker, via NODE_PATH) and static intelligence (Monaco, via extra libs).

## 7. Persistence

Everything persists under Electron's `userData` dir; all writes are best-effort (failures never crash the app):

| File | Contents |
|---|---|
| `nodl-tab-index.json` | `{ version, order, activeTabId, meta }` — tab metadata only |
| `tabs/<id>.ts` | raw code per tab (`tab-storage.ts`) |
| `nodl-settings.json` | `AppSettings` |
| `nodl-window-state.json` | window bounds/maximized |
| `nodl-state.json` | legacy single-file format (v1), still readable for migration |
| `packages/` | managed npm prefix (§6) |

`tab-storage.ts` decisions worth knowing: code is stored as **raw `.ts` text** (greppable, openable elsewhere, no JSON-escape cost); writes are **atomic** (`.tmp` + `rename`); tab IDs are validated against a nanoid-safe regex before touching the filesystem, which blocks path traversal from a rogue IPC message; orphaned tab files and stray `.tmp`s are pruned on load.

## 8. Build, packaging & release

### Build (dev and prod)

- **electron-vite** builds three targets: main (node), preload (node), renderer (Vite + React).
- The **worker is built separately** by a plain esbuild script (`build:worker` in package.json): bundled to a single CommonJS file `worker.cjs` (`platform: 'node'`, `external: ['electron']`). It must be:
  - a single self-contained file (a forked process can't share the main bundle's module graph),
  - `.cjs` (the package is `"type": "module"` but `fork` + NODE_PATH resolution want CJS),
  - built to `out/worker/` in dev (electron-vite cleans `out/main` on hot rebuild) and copied to `out/main/` for production.

### Packaging (electron-builder, `electron-builder.yml`)

Two asar escape hatches, both because *native things can't run from inside an archive*:

1. `out/main/worker.cjs` is `asarUnpack`ed — `child_process.fork` needs a real file (§4.3).
2. `node_modules/esbuild/**` and `node_modules/@esbuild/**` are unpacked, **and** `src/main/index.ts` sets `ESBUILD_BINARY_PATH` to the unpacked platform binary at startup — esbuild's own `require.resolve` would otherwise find the binary inside the asar and fail to spawn it.

Targets: macOS dmg+zip (arm64 & x64, each built on its native runner because esbuild's binary is platform-specific), Windows NSIS + portable, Linux AppImage + deb. The app is intentionally **unsigned/un-notarized** (documented in the README with the `xattr -cr` workaround).

### Release flow (`.github/workflows/release.yml`)

Manual `workflow_dispatch` with a version input → validates semver, generates a changelog → matrix-builds each platform → publishes a GitHub Release with all artifacts. In-app updates are check-only: the app compares its version against the latest GitHub release (`CHECK_FOR_UPDATES` IPC) and links to the download — no auto-updater.

Tagging a release also triggers `deploy-web.yml`, which pings a Vercel deploy hook for the landing page.

## 9. Testing strategy

Three layers (see `DEVELOPMENT.md` for counts):

- **Unit (vitest)** — the instrumenter, expression detection, console capture/serialization, worker helpers, tab storage, stores, output alignment math. The pure-function extraction style (e.g. `expr-reporter.ts` split out of the side-effectful `worker.ts`, `tab-storage.ts` taking `baseDir` as a parameter) exists specifically to make this layer possible.
- **Pipeline tests** (`__tests__/pipeline.test.ts`, the biggest test file) — run real code samples through `instrumentCode() → transpile()` and assert the result still parses/behaves. This is the regression net for the #1 historical bug class: *instrumentation producing syntactically invalid code*.
- **E2E (Playwright + Electron)** — drives the packaged app: typing, running, output assertions, tabs, settings.

## 10. Design decisions & trade-offs (summary)

| Decision | Why | Cost |
|---|---|---|
| Instrument before transpile | Line numbers must match the editor | Instrumenter must handle TS syntax, not just JS |
| AST (Babel + magic-string) with regex fallback | Correctness on real-world code; offsets preserve formatting/lines exactly | Two implementations to maintain; Babel adds ~bundle weight to main |
| `AsyncFunction` instead of `vm`/module eval | Free top-level await; injected helpers as params, not globals | Code isn't a real module — hence the import→require rewriting |
| Fresh forked process per run | Crash/hang isolation; kill = instant stop; no state bleed between runs | ~process spawn cost per run (fine at human/auto-run frequency) |
| `undefined`-suppressing passthrough `__expr__` on *every* top-level expression | Uniform wrapping with zero behavior change; no expression/statement heuristics needed at runtime | Expressions evaluating to `undefined` show nothing (accepted UX) |
| Buffer output, swap on done | No flicker with auto-run | Long-running code shows stale output until completion (mitigated by streaming console mode + errors pinned) |
| One managed npm prefix + user's own npm binary | No bundled node/npm; exact-pinned installs; single dir feeds both runtime and types | Requires Node installed on the machine; npm discovery heuristics |
| Timeout + loop guard + interval auto-clear | Keep the app responsive against runaway code | Not a security sandbox — user code has full Node access (by design, local tool) |

## 11. Pointers into the code

| Concern | File |
|---|---|
| Pipeline orchestration (RUN_CODE handler) | `apps/desktop/src/main/index.ts` |
| AST instrumenter | `apps/desktop/src/main/executor/instrument-ast.ts` |
| Regex instrumenter + entry point | `apps/desktop/src/main/executor/instrument.ts` |
| esbuild wrapper | `apps/desktop/src/main/executor/transpiler.ts` |
| Worker lifecycle / timeout / kill | `apps/desktop/src/main/executor/runner.ts` |
| Execution sandbox + async drain | `apps/desktop/src/main/executor/worker.ts` |
| `__expr__` contract | `apps/desktop/src/main/executor/expr-reporter.ts` |
| console.* capture + serialization | `apps/desktop/src/main/executor/console-capture.ts` |
| npm + type defs | `apps/desktop/src/main/executor/package-manager.ts` |
| IPC channel names + shared types | `apps/desktop/shared/types.ts` |
| Preload bridge | `apps/desktop/src/preload/index.ts` |
| Output alignment math | `apps/desktop/src/components/Output/OutputPane.tsx` |
| Monaco setup + type-lib injection | `apps/desktop/src/components/Editor/EditorPane.tsx` |
| Tab file storage | `apps/desktop/src/main/tab-storage.ts` |
| Packaging quirks | `apps/desktop/electron-builder.yml`, `apps/desktop/package.json` scripts |
