# nodl — Claude Code Instructions

## Project Overview

nodl is a desktop JavaScript/TypeScript code scratchpad (like RunJS). Users write code in a Monaco editor, hit Cmd+Enter, and see output inline next to the corresponding source lines.

**Monorepo:** Turborepo + pnpm workspaces
- `apps/desktop/` — Electron app (Electron + React 19 + electron-vite + Zustand + Monaco + Tailwind v3 + esbuild)
- `apps/web/` — Landing page (Next.js, static export)

## Quick Start

```bash
pnpm install              # Install all workspace deps
pnpm run dev              # Start all apps (turbo)
pnpm run build            # Build all apps (turbo)
pnpm run test             # Test all apps (turbo)

# Desktop app specifically:
cd apps/desktop
pnpm run dev              # Electron dev mode
pnpm run test             # 248 unit tests (vitest)
pnpm run test:e2e         # 101 E2E tests (playwright)
pnpm run pack             # Package to .app (local testing)
pnpm run dist             # Package to DMG/installer

# Landing page:
cd apps/web
pnpm run dev              # Next.js dev server
pnpm run build            # Static export to out/
```

## Architecture

```
User code → instrumentCode() → transpile() → worker (child_process.fork)
                ↓                    ↓              ↓
         Add __line__/          Strip TS types    Execute in AsyncFunction
         __expr__ tracking      via esbuild       with captured console
                                                       ↓
                                              IPC messages → renderer
```

### Process Model

- **Main process** (`src/main/index.ts`): Window management, IPC handlers, code pipeline (instrument → transpile → fork worker)
- **Preload** (`src/preload/index.ts`): Bridges IPC to renderer via `contextBridge`
- **Renderer** (`src/renderer/main.tsx`): React app with Monaco editor and output panels
- **Worker** (`src/main/executor/worker.ts`): Forked child process that executes user code. Built separately as `.cjs` (required because `"type": "module"` in package.json)

### Code Execution Pipeline

1. `instrumentCode(code)` — runs on ORIGINAL source (before transpilation) to preserve line numbers
   - Inserts `__line__.value = N;` for console.log line tracking
   - Wraps standalone expressions with `__expr__(N, expr)` for inline value display
   - Converts `import` statements to `require()` calls (ESM → CJS)
   - Uses tagged delimiter stack to avoid inserting inside class bodies, object literals, switch statements, template literals
2. `transpile(instrumented, 'ts')` — esbuild strips TypeScript, no format specified (allows require)
3. Worker receives transpiled code, wraps in `new AsyncFunction(...)`, executes with captured console
4. Worker intercepts `setTimeout`/`setInterval` globally to track pending timers
5. Worker awaits Promise results from `__expr__` before exiting
6. `waitForAsyncDrain()` polls until all timers complete (max 5s)

### Critical Gotchas

- **Worker must be `.cjs`**: `"type": "module"` makes Node treat `.js` as ESM. Worker uses `require()` so must be CommonJS.
- **Worker builds to `out/worker/worker.cjs`**: electron-vite wipes `out/main/` on rebuild, so worker is built separately. Production build copies it to `out/main/`.
- **Instrument BEFORE transpile**: esbuild strips empty lines and rewrites code, breaking line alignment. Instrumentation must run on the original source.
- **No `format: 'esm'` in esbuild**: Would reject `require()` calls from import transforms.
- **Zustand selectors**: Use module-level constants for empty defaults (`const EMPTY_ENTRIES: OutputEntry[] = []`), never `?? []` inline — causes infinite re-renders in React StrictMode.
- **IPC subscriptions**: Must use `useOutputStore.getState()` in callbacks, not selector-derived values. Subscribed once in `useOutputListener()` at App level.
- **Output buffering**: `addEntry()` buffers during execution, `setDone()` flushes atomically. This prevents output flash on re-run.
- **Error line highlighting**: Uses `entry.line` (from `__line__` tracking) not stack trace parsing — stack traces have transpiled line numbers. Decorations stored in a ref with `.clear()` to avoid duplicates. `onDidChangeContent` listener clears stale decorations when the user edits code.
- **IPC serialization**: Worker fork uses `serialization: 'advanced'` (V8 structured clone) to preserve `undefined` through IPC. Also has `{ __type: 'Undefined' }` sentinel in `serializeArg` as defense-in-depth.

## File Structure

All desktop app paths below are relative to `apps/desktop/`.

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Window, IPC handlers, menu, update check
│   └── executor/
│       ├── instrument.ts    # Code instrumentation (line tracking, expr wrapping, import transform)
│       ├── transpiler.ts    # esbuild TypeScript → JS
│       ├── runner.ts        # Forks worker, manages execution lifecycle
│       ├── worker.ts        # Executes user code (built separately as .cjs)
│       ├── console-capture.ts  # Intercepts console.* methods
│       └── package-manager.ts  # npm install/remove/search
├── preload/
│   └── index.ts             # contextBridge API
├── renderer/
│   ├── index.html           # Entry HTML
│   └── main.tsx             # React mount point
├── components/
│   ├── Header/              # Header.tsx, UpdateDialog.tsx, AboutDialog.tsx
│   ├── Sidebar/             # Sidebar.tsx (files, packages, settings)
│   ├── Editor/              # EditorPane.tsx (Monaco)
│   ├── Output/              # OutputPane.tsx, ConsoleEntry.tsx, ObjectTree.tsx, ConsoleTable.tsx
│   ├── Settings/            # SettingsDialog.tsx
│   └── Packages/            # PackageDialog.tsx
├── store/                   # Zustand stores
│   ├── tabs.ts              # Multi-tab state
│   ├── output.ts            # Buffered output with per-tab isolation
│   ├── settings.ts          # Editor/execution/appearance settings
│   ├── ui.ts                # Sidebar, settings dialog, output mode
│   ├── packages.ts          # Package management state
│   └── scroll-sync.ts       # Editor ↔ output scroll position sync
├── hooks/                   # React hooks
│   ├── useCodeExecution.ts  # Pure state/action hook
│   ├── useOutputListener.ts # Single IPC subscription at App level
│   ├── useAutoRun.ts        # Debounced auto-execution
│   ├── useDialogTransition.ts  # Enter/exit transition for modals
│   ├── useUpdateCheck.ts    # GitHub release version check
│   └── ...
├── ipc/
│   └── bridge.ts            # Typed wrapper around window.electronAPI
├── index.css                # Design system (CSS variables, components)
└── App.tsx                  # Root layout with resizable panels
shared/
└── types.ts                 # Shared types, IPC channel names, ElectronAPI interface
```

## Instrumentation Rules

The `instrumentCode()` function is the most complex and bug-prone part. It uses a tagged delimiter stack to know when it's safe to insert statements.

### Safe to insert `__line__.value = N;`:
- Top level (stack empty)
- Inside `block` context (function body, if/for/while/try body)

### NOT safe (pass through):
- Inside `class` / `interface` / `enum` body
- Inside `object` literal
- Inside `switch` body
- Inside `(` or `[` (function args, arrays)
- Inside multiline template literal (backtick string spanning lines)
- Chain continuation lines (starting with `.`, `?`, `: `)

### `__expr__` wrapping — only when:
- Stack is completely empty (top level)
- `isExpression()` returns true
- Not the start of a method chain (next line doesn't start with `.`)

### `isExpression()` rejects:
- Statement prefixes: `const`, `let`, `var`, `function`, `class`, `if`, `for`, `while`, `switch`, `try`, `import`, `export`, `return`, `throw`, `type`, `interface`, `enum`, `declare`, `abstract`, etc.
- Lines starting with `}`, `)`, `]`, `.`, `,`, `?`, `:`, operators
- Lines ending with `{`, `}`, `,`
- Multi-statement lines (contains `;` mid-line)
- `console.*` calls
- Lines with unbalanced brackets

### Import transformation:
- `import foo from "bar"` → `const foo = (() => { const _m = require("bar"); return _m.default ?? _m; })()`
- `import { a, b } from "bar"` → `const { a, b } = require("bar")`
- `import * as foo from "bar"` → `const foo = require("bar")`
- `import "bar"` → `require("bar")`
- `import type { ... }` → stripped (no runtime)

## Design System

**Theme:** Warm neutral dark (NOT the old sci-fi/violet terminal theme from STYLE.md — that's outdated)

### Colors (Dark)
- Backgrounds: `#171717` → `#1e1e1e` → `#252525` → `#2d2d2d` (warm grays)
- Text: `#e5e5e5` / `#999999` / `#666666` (warm neutral)
- Accent: `#a78bfa` (violet, used sparingly)
- Borders: white-alpha based

### Typography
- UI: System font (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- Code: `JetBrains Mono` (loaded from Google Fonts)

### Components
- Buttons: `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.toolbar-btn` (icon-only 28x28)
- Border radius: `6px` / `8px` / `12px` via CSS variables
- Dialogs: rounded, backdrop blur, enter/exit transitions via `useDialogTransition`
- Resizer: `[data-separator]` attribute (react-resizable-panels v4.9)

### Toolbar buttons are icon-only
- Use Lucide React icons at 14px
- Show tooltip on hover
- Auto-run (Zap): `fill="currentColor"` when on, outline when off

## Testing

```bash
pnpm run test       # 243 tests across 11 files
```

### Test structure:
- Store tests: `src/store/__tests__/`
- Executor tests: `src/main/executor/__tests__/`
- Pipeline tests: `executor/__tests__/pipeline.test.ts` — full instrument → transpile chain
- Hook tests: `src/hooks/__tests__/`

### When adding instrumenter changes:
Always add pipeline tests that run `instrumentCode() → transpile()` and verify no transpilation errors. This catches cases where `__line__` insertion breaks syntax.

## Platform Notes

- macOS: `titleBarStyle: 'hiddenInset'`, 70px traffic light spacer (conditional on platform)
- Windows: Default title bar, no spacer
- Header spacer is conditional: `window.navigator.platform.includes('Mac')`
- Monaco diagnostics suppress module-not-found errors (2792, 2307) since packages resolve at runtime

## Update System

- No auto-update (requires code signing / Apple Developer account)
- App checks GitHub Releases API on launch (3s delay)
- If newer version found, shows "v1.x.0 available" pill in header
- Clicking opens UpdateDialog with instructions + download link
- AboutDialog shows changelog (edit `CHANGELOG` array in `AboutDialog.tsx`)

## Common Tasks

### Adding a new IPC channel:
1. Add channel name to `IPC` in `shared/types.ts`
2. Add method to `ElectronAPI` interface in `shared/types.ts`
3. Add handler in `src/main/index.ts`
4. Add to preload `src/preload/index.ts`
5. Add to bridge `src/ipc/bridge.ts`

### Adding a new dialog:
1. Create component using `useDialogTransition(open)` for enter/exit animations
2. Use `mounted`/`visible` pattern (see SettingsDialog, PackageDialog, UpdateDialog)
3. Close via `close(onClose)` to trigger exit transition before unmount

### Adding a new store:
1. Create in `src/store/` using `create<State>((set) => ({...}))`
2. Use stable selector references (module-level constants for defaults)
3. Add tests in `src/store/__tests__/`

### Bumping version for release:
1. Update `version` in `package.json`
2. Update header version in `Header.tsx`
3. Add changelog entry in `AboutDialog.tsx` CHANGELOG array
4. `git tag vX.Y.Z && git push --tags`
5. `pnpm run dist` → create GitHub Release with artifacts

## UI/UX Conventions

These are established patterns from the design process. Follow them for consistency.

- **Icon-only toolbar buttons.** 28x28px `.toolbar-btn`, tooltip via `title`. No text labels in toolbars.
- **Consistent spacing/sizing.** All items in a row must have identical dimensions. Use shared style constants.
- **Unselectable metadata.** "Output", duration badge, type tags (`Object {3}`), key labels, `<-` arrows — all `userSelect: 'none'`.
- **Text wrapping, not horizontal scroll.** Output/errors use `wordBreak: 'break-word'`, `whiteSpace: 'pre-wrap'`, `overflowWrap: 'anywhere'`.
- **Fixed toolbar heights.** Set `height`, `minHeight`, and `flex-shrink: 0` on all toolbars. They must not change during window resize.
- **Dialog transitions.** All modals use `useDialogTransition(open)` for enter AND exit animations. Never `if (!open) return null` without transition.
- **Same layout for sidebar items.** Files, Packages, Settings use identical padding (`5px 8px`), gap (`7px`), icon size (`13px`), and hover behavior.
- **System font for UI, monospace for code only.** `-apple-system` for UI text, JetBrains Mono only in editor/output.
- **Warm neutral dark theme.** Not blue-tinted, not sci-fi. Reference aesthetic: Codex/OpenAI UI.

## Monaco Type Definitions — How IntelliSense Works

Loading type definitions into Monaco for installed npm packages is non-trivial. Here's how it works and the pitfalls.

### Architecture

```
User installs lodash + @types/lodash
        ↓
getTypeDefinitions() in package-manager.ts
        ↓
Scans ALL .d.ts files in package dir + includes package.json
Returns each file with its path relative to node_modules
        ↓
EditorPane useEffect → addExtraLib() for each file
at file:///node_modules/<relative-path>
        ↓
TS Node resolution: import "lodash" → @types/lodash → IntelliSense works
        ↓
Custom CompletionItemProvider → import path suggestions ("lodash/join")
```

### Compiler Options (Critical)

These must ALL be set in `handleBeforeMount`. `setCompilerOptions` **replaces** (not merges) Monaco's defaults — omitting any option loses it.

- **`moduleResolution: NodeJs`** — Without it, TypeScript won't look in `@types/` directories.
- **`allowNonTsExtensions: true`** — Without it, TS reports "Type annotations can only be used in TypeScript files" because `@monaco-editor/react` model URIs don't always have `.ts` extensions.
- **`esModuleInterop: true`** + **`allowSyntheticDefaultImports: true`** — Required for `import _ from "lodash"` syntax.

### URI Scheme Consistency (Root Cause of Many Failures)

The editor model URI and `addExtraLib` paths must share the same scheme for module resolution to work.

- Editor model: `path="file:///src/${tab.id}.ts"` on the `<Editor>` component
- Extra libs: `file:///node_modules/@types/lodash/index.d.ts`
- TypeScript resolves `import "lodash"` from `file:///src/...` → walks up to `file:///node_modules/...` → matches extraLib paths

If the model has no `file:///` scheme (e.g., bare `abc123.ts`), TypeScript generates candidate paths without `file:///` and nothing matches. **This was the hardest bug to find.**

### Type Loading Rules

1. **Use `addExtraLib` (not `createModel`).** `createModel` triggers per-file validation — with 300+ files in `@types/lodash`, it's extremely slow. `addExtraLib` is lightweight and designed for type definitions.

2. **Keep `@types/` prefix in paths.** Never strip it. TypeScript's Node resolution checks `@types/` automatically. Aliasing `@types/lodash/...` to `lodash/...` creates split module identity — `declare module "../index"` augments the `@types/` module but `import _ from "lodash"` resolves to the alias (different module), so augmentations don't apply.

3. **Each .d.ts file is a separate `addExtraLib` at its correct virtual path.** Packages like `@types/lodash` use module augmentation across files:
   ```ts
   // @types/lodash/common/array.d.ts
   import _ = require("../index");
   declare module "../index" { interface LoDashStatic { join(...): string; } }
   ```
   The `"../index"` resolves relative to the file's virtual path. If the file isn't at the right path, augmentation silently fails.

4. **Include the real `package.json` from disk.** TypeScript's resolver probes `package.json` for the `types` field. `getTypeDefinitions()` includes each package's actual `package.json`.

5. **Scan ALL `.d.ts` files, not just the reference tree.** `collectAllDtsFiles()` scans the entire package directory. This picks up both `common/*.d.ts` (module augmentation) and per-method files like `join.d.ts` (for `import join from "lodash/join"`).

6. **Type loading `useEffect` must depend on `editorVersion`.** Monaco loads asynchronously. If `packages` stabilizes before Monaco is ready, `monacoRef.current` is null and types never load. `editorVersion` (set in `handleMount`) ensures re-run.

### Why Concatenation Doesn't Work

Tempting to concat all `.d.ts` files into one string. Fails because:
- `import _ = require("../index")` is a relative import needing correct file location
- `declare module "../index"` augments by resolved path — wrong path = wrong module
- `/// <reference path>` directives try to resolve external files that don't exist

### Import Path Completion

Monaco's built-in TypeScript service does NOT support import path completion. The TS worker is missing `readDirectory()`, `getDirectories()`, and `directoryExists()` (needed by TypeScript's `stringCompletions.ts`). The `SuggestAdapter` only triggers on `"."`, not `"/"`.

Solution: a custom `CompletionItemProvider` registered in `handleBeforeMount` that:
- Triggers on `/`, `"`, `'`
- Detects cursor inside `import`/`require` string via regex
- Scans `typePathsRef.current` (populated when type defs load) for matching submodules
- Strips `@types/` prefix and `.d.ts`/`/index` suffixes to produce clean module names

Also requires `quickSuggestions: { strings: true }` in editor options.

### Suppressed Diagnostic Codes

These are suppressed because packages resolve at runtime via `require()`:
- **2792** — Cannot find module (import)
- **2307** — Cannot find module (require)
- **1259** — Can only be default-imported with esModuleInterop
- **1471** — Module can only be default-imported using allowSyntheticDefaultImports
- **7016** — Could not find declaration file

## Key Design Decisions

- **Manual update via GitHub Releases** — no auto-update (requires paid code signing)
- **Import statements → require()** at instrumentation time, not at transpilation
- **Async drain** via global setTimeout/setInterval interception + Promise.allSettled for expr results
- **Tagged delimiter stack** in instrumenter for class/object/switch/enum/template contexts
- **Buffered atomic output swap** — entries buffer during execution, flush on done (prevents flash)
- **No `format: 'esm'` in esbuild** — allows require() from import transforms
- **Monaco diagnostic suppression** — codes 2792, 2307 suppressed (packages resolve at runtime via require)
