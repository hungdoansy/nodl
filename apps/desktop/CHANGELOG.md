# Changelog

## v2.1.0 (2026-04-13)

- Save shortcut (Cmd+S) with an inline "Saved" indicator next to the Auto-run button
- Clear output (Cmd+L), open packages (Cmd+P), and copy output (Cmd+Shift+C) from the keyboard
- Toggle output mode (Cmd+Shift+M) and auto-run (Cmd+Shift+A) from the keyboard
- Hold Cmd (or Ctrl on Windows) for one second to reveal a panel listing every available shortcut
- Button tooltips now describe the action and show its keyboard shortcut, platform-aware
- Faster first-time dialog opening — removed the expensive backdrop blur over the editor
- AboutDialog: GitHub and issue reporting links moved above the changelog
- Welcome example rewritten so it no longer triggers a TypeScript ASI false-positive error

## v2.0.1 (2026-04-12)

- release script missing last line from git log and draft
- copy esbuild platform binary into packaged app

## v2.0.0 (2026-04-12)

- AST-based code instrumenter replacing the regex-based implementation
- Infinite loop detection via instrumented loop guards
- Auto-detect JSX and retry zombie process cleanup
- Promise rejection reporting, auto-clear intervals, and timeout race fixes
- Re-export statement transformation to require()
- Full Monaco IntelliSense for installed npm packages with import path completion
- Type definitions load after Monaco finishes async initialization
- Line-aligned output tracks multi-line overflow into subsequent blank lines
- Output panel scroll syncs past last line to match editor
- Expression arrow aligned to first line of multi-line output
- Error line highlighting uses execution-time line tracking instead of stack trace parsing
- Error string args render plain without quotes or type color
- Theme-aware type colors for primitives, bigint, functions, and symbols in output
- ObjectTree collection pagination and inline rendering for correct line height
- Preserve undefined through IPC with V8 structured clone
- Resolve npm/pnpm binary in packaged Electron app with nvm and Windows fallbacks
- Install packages at exact pinned versions
- Show update button when a newer package version is available
- Show npm path and packages directory in Settings

## v1.0.0 (2025-04-08)

- Monaco editor with TypeScript support
- Line-aligned and console output modes
- Inline expression evaluation
- npm package management
- Async code support (setTimeout, Promises, async/await)
- ESM import support (auto-converted to require)
- Multi-tab workspace with persistence
- Dark and light themes
- Scroll-synced editor and output panels
- Update checker via GitHub Releases
