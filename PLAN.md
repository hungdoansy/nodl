# nodl — RunJS Clone (Desktop App): Implementation Plan

## Runtime & Tooling Requirements

- **Node.js v22** (LTS) — required runtime
- **pnpm** — required package manager (no npm/yarn)
- Add `"packageManager": "pnpm@9"` and `"engines": { "node": ">=22" }` to `package.json`
- Add `.npmrc` with `engine-strict=true`

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js v22 | Required; enables modern APIs (native fetch, etc.) |
| Package manager | pnpm | Required; fast, strict, disk-efficient |
| Desktop shell | Electron | Mature, full Node.js access in main process |
| Renderer | React 18 + Vite | Fast HMR, used via `electron-vite` or manual config |
| Build tool | electron-builder | Packs for macOS/Windows/Linux |
| Editor | Monaco Editor (`@monaco-editor/react`) | VS Code-grade editing |
| TS transpile | esbuild (native, not WASM) | We have Node.js — use native esbuild, no WASM overhead |
| Styling | Tailwind CSS v3 | Utility-first, fast iteration |
| State | Zustand | Minimal boilerplate, good DX |
| Persistence | electron-store (JSON file on disk) | Simple, synchronous, no DB needed for a desktop app |
| Testing | Vitest + React Testing Library + Playwright (Electron) | Unit + integration + E2E |
| Split pane | `react-resizable-panels` | Lightweight, accessible |

---

## Architecture Overview

```
nodl/
├── electron/
│   ├── main.ts               # Electron main process: window creation, IPC handlers
│   ├── preload.ts             # Preload script: expose safe IPC bridge to renderer
│   └── executor/
│       ├── runner.ts          # Execute JS/TS in a child process (Node.js vm or worker_threads)
│       ├── transpiler.ts      # esbuild (native) TS → JS transpilation
│       └── console-capture.ts # Intercept console in the execution sandbox, serialize output
├── src/                       # Renderer process (React app)
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Root layout: header + split panes
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx     # App bar: logo, tabs, settings, theme toggle
│   │   │   └── TabBar.tsx     # Tab list with add/close/rename/reorder
│   │   ├── Editor/
│   │   │   ├── EditorPane.tsx # Monaco wrapper + toolbar (run, auto-run toggle)
│   │   │   └── monaco-setup.ts # Monaco config: themes, TS compiler options
│   │   ├── Output/
│   │   │   ├── OutputPane.tsx # Output container: console entries list
│   │   │   ├── ConsoleEntry.tsx # Single log/warn/error/info/table entry
│   │   │   └── ObjectTree.tsx # Expandable object/array inspector
│   │   ├── Packages/
│   │   │   ├── PackageDialog.tsx # Modal to search & install npm packages
│   │   │   └── PackageList.tsx   # Sidebar list of installed packages
│   │   └── Settings/
│   │       └── SettingsDialog.tsx # Modal for user settings
│   ├── store/
│   │   ├── tabs.ts            # Zustand slice: tabs CRUD, active tab, code
│   │   ├── settings.ts        # Zustand slice: font size, theme, auto-run, etc.
│   │   ├── output.ts          # Zustand slice: console output entries per tab
│   │   └── packages.ts        # Zustand slice: installed packages per tab
│   ├── hooks/
│   │   ├── useAutoRun.ts      # Debounced auto-run effect
│   │   ├── useCodeExecution.ts # Calls main process via IPC to run code
│   │   └── usePersistence.ts  # Sync store ↔ electron-store on changes
│   ├── ipc/
│   │   └── bridge.ts          # Typed wrapper around window.electronAPI (preload bridge)
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types
│   └── lib/
│       └── utils.ts           # Small shared utilities
├── shared/
│   └── types.ts               # Types shared between main and renderer (IPC payloads)
├── package.json
├── electron-builder.yml       # Build/packaging config
├── vite.config.ts             # Vite config for renderer
├── tsconfig.json              # Shared TS config
├── tsconfig.node.json         # TS config for Electron main process
└── tailwind.config.js
```

### Key Architecture Decisions

**Execution in Main Process (via child process)**
- User code runs in a forked Node.js child process (`child_process.fork`) — NOT in the renderer
- This gives: real Node.js APIs (fs, path, http, etc.), process isolation (crash doesn't kill the app), ability to kill runaway code via `process.kill`
- Console output is serialized via IPC messages from child → main → renderer

**IPC Communication Pattern**
```
Renderer                    Main Process                Child Process
   │                            │                            │
   │── ipc:run-code ──────────→ │                            │
   │                            │── fork worker.js ────────→ │
   │                            │                            │── execute code
   │                            │                            │── console.log(...)
   │                            │←── message {type,data} ────│
   │←── ipc:output-entry ───────│                            │
   │←── ipc:output-entry ───────│                            │
   │←── ipc:execution-done ─────│←── exit ───────────────────│
   │                            │                            │
```

**Preload Bridge (Context Isolation)**
- `contextBridge.exposeInMainWorld` provides a typed `window.electronAPI` object
- Renderer never has direct access to Node.js — all via IPC
- Methods: `runCode()`, `stopExecution()`, `installPackage()`, `onOutput()`, `getSettings()`, `saveSettings()`

---

## Phase 1: Electron Scaffold + Editor + Basic JS Execution ✅

**Goal:** Electron app opens a window with Monaco editor on the left and console output on the right. JS code runs in a child process and output appears.

### Tasks

1. **Project init** ✅
   - Initialize with Vite + React + TypeScript
   - Use **pnpm** for all package operations (`pnpm create`, `pnpm add`, `pnpm run`)
   - Set `"packageManager": "pnpm@9"` and `"engines": { "node": ">=22" }` in `package.json`
   - Add `.npmrc` with `engine-strict=true` and `shamefully-hoist=true` (needed for Electron)
   - Add Electron: `pnpm add -D electron electron-builder`, configure `electron/main.ts`
   - Set up dev workflow: Vite dev server for renderer, Electron loads from `localhost` in dev
   - Install deps: `pnpm add @monaco-editor/react react-resizable-panels zustand tailwindcss electron-store`
   - Configure Tailwind, set up base styles (dark background, monospace output)

2. **Electron main process** ✅
   - `src/main/index.ts`: create `BrowserWindow` with `preload.ts`, load Vite dev URL or built HTML
   - Window config: 1200x800 default, min size 800x500, hiddenInset title bar on macOS
   - `src/preload/index.ts`: expose `electronAPI` via `contextBridge` with typed methods

3. **App shell (renderer)** ✅
   - `App.tsx`: vertical layout — Header (fixed height, draggable region for frameless) + body (flex-1, split panes)
   - Use `react-resizable-panels` for horizontal split: EditorPane | OutputPane
   - Minimum pane sizes: 20% each

4. **Monaco editor integration** ✅
   - `EditorPane.tsx`: render Monaco with JS language, dark theme
   - Controlled value via Zustand store (`editor.code`)
   - Default code: `console.log("Hello, nodl!");`

5. **Basic JS execution via child process** ✅
   - `src/main/executor/runner.ts`:
     - Fork a worker script with `child_process.fork()`
     - Worker receives code via IPC message, executes with AsyncFunction
     - Intercept `console` methods in the sandbox, send each call back via `process.send()`
     - Execution timeout: 5 seconds (configurable), kill child on timeout
   - `src/main/executor/console-capture.ts`:
     - Create sandboxed console that serializes args (handles circular refs, non-serializable values)
     - Each entry: `{ id, method, args: SerializedValue[], timestamp }`
   - IPC handlers in main:
     - `ipc:run-code` → fork child, pipe output messages to renderer
     - `ipc:stop-execution` → kill child process
     - `ipc:output-entry` → forward to renderer (stream, not batch)
     - `ipc:execution-done` → signal completion with duration & exit code

6. **Output panel (renderer)** ✅
   - `OutputPane.tsx`: scrollable list of `ConsoleEntry` components
   - Color-code by method: log=white, warn=yellow, error=red, info=blue
   - Stringify primitives inline, show `[Object]` / `[Array]` for complex types (Phase 2 does tree expansion)
   - "Clear" button in output toolbar
   - "Stop" button (visible during execution) to kill running code
   - Auto-scroll to bottom on new entries

7. **Manual run** ✅
   - "Run" button (▶) in editor toolbar triggers execution via IPC
   - Keyboard shortcut: `Cmd/Ctrl + Enter`
   - Clear previous output before each run

### Acceptance Criteria
- Electron app launches with split-pane editor + output
- User types JS code → clicks Run → sees console output on the right
- `console.log`, `console.warn`, `console.error` all work with correct styling
- Code runs in isolated child process (not in renderer)
- Errors show in red with message and stack trace
- Infinite loops terminate after timeout
- "Stop" button kills running code
- Clear button resets output
- Split pane is resizable by dragging

---

## Phase 2: TypeScript Support + Auto-Run + Rich Output

**Goal:** TS code works, auto-run on keystroke, and objects are expandable in output.

### Tasks

1. **esbuild native integration**
   - `electron/executor/transpiler.ts`: use native `esbuild` (not WASM — we have Node.js)
   - `transpile(code: string, loader: "ts" | "tsx") → { js: string, errors: TranspileError[] }`
   - Handle syntax errors gracefully — return error array, don't throw
   - Transpile step happens in main process before forking the execution child

2. **Language toggle**
   - Per-tab language setting: `"javascript" | "typescript"`
   - Monaco language switches accordingly
   - TypeScript compiler options in Monaco: strict mode, ESNext target, JSX react-jsx
   - Tab file extension shown: `.js` / `.ts`

3. **Auto-run mode**
   - `useAutoRun.ts`: `useEffect` with debounced callback (300ms default)
   - Toggle button in editor toolbar: "Auto" on/off
   - When off, only manual Run triggers execution
   - Cancel pending debounce on manual run or tab switch
   - Kill previous execution if still running when auto-run fires again

4. **Object tree inspector**
   - `ObjectTree.tsx`: recursive component for nested objects/arrays
   - Collapsed by default, click to expand
   - Show type tag: `Object {3}`, `Array (5)`, `Map (2)`, etc.
   - Handle circular references (show `[Circular]`)
   - Max depth: 10 levels (configurable)
   - Support: primitives, objects, arrays, Map, Set, Date, RegExp, Error, null, undefined, Symbol, BigInt
   - Serialization in child process must preserve type information (custom serializer, not just JSON.stringify)

5. **console.table support**
   - Render as a styled `<table>` in the output panel
   - Columns from object keys, rows from array entries

6. **Last expression result**
   - The executor wraps code so the last expression's value is captured and sent back
   - Displayed as a dimmed entry prefixed with `←`

### Acceptance Criteria
- TS code with type annotations runs correctly
- TS syntax errors shown in output (not a crash)
- Auto-run triggers ~300ms after last keystroke
- Auto-run kills previous execution before starting new one
- Nested objects expand/collapse in output
- `console.table([{a:1,b:2}])` renders a table
- Circular references render as `[Circular]`

---

## Phase 3: Multi-Tab System + Persistence

**Goal:** Users can manage multiple independent scratchpads, and everything survives app restart.

### Tasks

1. **Tab store**
   - `tabs.ts` Zustand slice:
     ```ts
     interface Tab {
       id: string          // nanoid
       name: string        // user-editable, default "Untitled 1"
       language: "javascript" | "typescript"
       code: string
       createdAt: number
       updatedAt: number
     }
     ```
   - Actions: `createTab`, `closeTab`, `renameTab`, `setActiveTab`, `updateCode`, `reorderTabs`

2. **TabBar component**
   - Horizontal scrollable tab list in the header
   - Each tab: name label, close (×) button
   - Double-click tab name to rename (inline edit)
   - "+" button to create new tab
   - Active tab highlighted
   - Drag to reorder (use native drag events or a small lib)
   - At least 1 tab must remain — closing the last tab creates a fresh default tab

3. **Per-tab isolation**
   - Each tab has its own: code, output entries, installed packages
   - Switching tabs swaps all state instantly
   - Output is preserved when switching away and back

4. **Persistence layer using electron-store**
   - `electron-store` stores data as JSON file in the app's userData directory
   - Schema:
     ```ts
     {
       version: number,
       tabs: Tab[],
       activeTabId: string,
       settings: Settings,
       packages: Record<tabId, Package[]>
     }
     ```
   - On store change → debounced write via IPC to main process (500ms)
   - On app load → main process reads file, sends to renderer via IPC
   - Schema versioning: version key, migrate on bump

5. **Session restore**
   - On open: restore all tabs, active tab, code, settings
   - If storage is empty/corrupt: create one default tab with welcome code

### Acceptance Criteria
- Can create, rename, close, switch, reorder tabs
- Each tab has independent code and output
- Quit and reopen app → all tabs and code restored exactly
- Closing last tab creates a fresh one (never zero tabs)

---

## Phase 4: npm Package Support

**Goal:** Users can install real npm packages and require/import them in their code.

### Tasks

1. **Package installation via npm**
   - `electron/executor/package-manager.ts`:
     - Maintain a shared `node_modules` directory in app's userData folder (e.g., `~/.nodl/packages/`)
     - `installPackage(name, version?)`: run `pnpm add <pkg>` in that directory via `child_process.exec`
     - `removePackage(name)`: run `pnpm remove <pkg>`
     - Return installed version on success, error on failure
   - This gives **real** npm packages running in **real** Node.js — not CDN shims

2. **Package dialog**
   - `PackageDialog.tsx`: modal with search input
   - Debounced search against npm registry API (`https://registry.npmjs.org/-/v1/search?text=...`)
   - Show results: name, description, version, weekly downloads
   - Click to install → shows progress spinner → IPC to main → main runs pnpm add → result back
   - Error handling: network errors, install failures

3. **Package list sidebar**
   - Small collapsible section showing installed packages (global, shared across tabs)
   - Each entry: name@version, remove button
   - Removing triggers `pnpm remove` via IPC

4. **Module resolution in executor**
   - The child process execution environment has `NODE_PATH` set to the shared `node_modules`
   - `require()` and `import` (via dynamic import or top-level await) resolve from there
   - For `import` syntax in code: transpile to `require()` via esbuild, or use dynamic import
   - No CDN rewriting needed — real packages, real require

5. **Built-in Node.js modules**
   - Code can use `require('fs')`, `require('path')`, etc. natively
   - The child process is a real Node.js process — all built-in modules work
   - This is a major advantage over browser-based RunJS clones

### Acceptance Criteria
- User installs "lodash" → writes `const _ = require("lodash")` → `_.chunk([1,2,3,4], 2)` works
- `import` syntax also works (transpiled or via dynamic import)
- Scoped packages install correctly (`@faker-js/faker`)
- Built-in Node.js modules work: `require('fs').readdirSync('.')` shows files
- `require('path').join('a', 'b')` returns `a/b`
- Install progress/errors shown in UI
- Removing a package and re-running shows a "module not found" error
- Installed packages persist across app restarts

---

## Phase 5: Settings + Theming + Polish

**Goal:** Configurable editor, light/dark themes, polished native desktop experience.

### Tasks

1. **Settings dialog**
   - `SettingsDialog.tsx`: modal with sections:
     - **Editor**: font size (10–24), tab size (2/4), word wrap on/off, minimap on/off
     - **Execution**: auto-run on/off, auto-run delay (100–2000ms slider), execution timeout (1–30s)
     - **Appearance**: theme (light/dark/system)
   - Changes apply immediately (live preview)
   - Persisted via electron-store

2. **Theming**
   - CSS variables for app chrome colors
   - Two palettes: dark (default) and light
   - Monaco theme synced: `vs-dark` ↔ `vs` (light)
   - System preference detection via `nativeTheme` (Electron API) + `prefers-color-scheme`
   - Toggle button in header (sun/moon icon)
   - Native title bar color matches theme

3. **Keyboard shortcuts**
   - `Cmd/Ctrl + Enter`: Run code
   - `Cmd/Ctrl + S`: Force save (prevents default, triggers manual persist)
   - `Cmd/Ctrl + N`: New tab
   - `Cmd/Ctrl + W`: Close tab
   - `Cmd/Ctrl + ,`: Open settings
   - `Cmd/Ctrl + 1-9`: Switch to tab N
   - `Cmd/Ctrl + Shift + P`: Command palette (stretch goal)
   - Register via Electron `globalShortcut` or in-renderer key handlers

4. **Native desktop polish**
   - App icon and proper app name in dock/taskbar
   - macOS: traffic light buttons positioned correctly, drag region in header
   - Window state persistence: remember size, position, maximized state on relaunch
   - Native context menus (right-click in editor, tabs)
   - App menu: File (New Tab, Close Tab), Edit (standard), View (Toggle Theme, Settings), Help
   - Loading spinner while first execution initializes
   - Execution time shown in output footer ("Ran in 12ms")
   - Error highlighting: when execution errors, highlight the error line in the editor with a red gutter marker
   - Empty state for output: "Run your code to see output here"

5. **Packaging & distribution**
   - `electron-builder.yml`: configure for macOS (.dmg), Windows (.exe), Linux (.AppImage)
   - Code signing setup (documented, not automated in v1)
   - Auto-update support via `electron-updater` (stretch goal)

### Acceptance Criteria
- Changing font size updates editor immediately
- Light/dark toggle works on both editor and app chrome
- All keyboard shortcuts functional
- Settings persist across app restart
- App icon visible in dock/taskbar
- Window position/size remembered
- Native menus work
- App can be packaged into a .dmg / .exe

---

## Implementation Order & Dependencies

```
Phase 1 (no deps) — Electron + editor + JS execution
  └→ Phase 2 (needs editor + execution) — TS + auto-run + rich output
       └→ Phase 3 (needs working editor) — multi-tab + persistence
            ├→ Phase 4 (needs persistence) — npm packages
            └→ Phase 5 (needs all prior) — settings + theming + polish
```

Estimated file count: ~30-35 source files, ~15-20 test files.
