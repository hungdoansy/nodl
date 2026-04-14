# Development

Technical details for contributors and anyone curious about how nodl works under the hood.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) (v9+)

## Setup

```bash
git clone https://github.com/hungdoansy/nodl.git
cd nodl
pnpm install
pnpm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev mode (hot reload) |
| `pnpm run build` | Production build |
| `pnpm run pack` | Build + package to `.app` / `.exe` (unpacked, for local testing) |
| `pnpm run dist` | Build + package to DMG/installer/AppImage (for distribution) |
| `pnpm run test` | Run unit tests (vitest) |
| `pnpm run test:e2e` | Run E2E tests against packaged app (Playwright) |
| `pnpm run lint` | Type check with TypeScript |

## Architecture

```
User code → instrumentCode() → transpile() → worker (child_process.fork)
                ↓                    ↓              ↓
         Add line tracking      Strip TS types    Execute in sandboxed
         + expr wrapping        via esbuild       AsyncFunction
                                                       ↓
                                              IPC messages → renderer
```

- **Main process** — window management, IPC, code pipeline (instrument → transpile → fork worker)
- **Worker** — forked child process that executes user code in isolation
- **Renderer** — React 19 + Monaco Editor + Zustand state management
- **Preload** — bridges IPC to renderer via `contextBridge`

## Project structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Window, IPC, menu
│   └── executor/
│       ├── instrument.ts    # Code instrumentation
│       ├── transpiler.ts    # esbuild TS → JS
│       ├── runner.ts        # Worker lifecycle
│       ├── worker.ts        # Code execution sandbox
│       └── package-manager.ts
├── preload/index.ts         # contextBridge
├── renderer/main.tsx        # React entry
├── components/              # UI components
├── store/                   # Zustand stores
├── hooks/                   # React hooks
└── ipc/bridge.ts            # Typed IPC wrapper
shared/types.ts              # Shared types + IPC channels
```

## Testing

- **Unit tests** — 243 tests across 11 files (vitest)
- **E2E tests** — 100 tests against the packaged app (Playwright + Electron)
- **Pipeline tests** — full `instrumentCode() → transpile()` chain to catch syntax-breaking instrumentation bugs

## Building for distribution

```bash
# macOS (both architectures)
pnpm run dist

# Output:
# dist/nodl-1.0.0-mac-arm64.dmg
# dist/nodl-1.0.0-mac-x64.dmg
# dist/nodl-1.0.0-mac-arm64.zip
# dist/nodl-1.0.0-mac-x64.zip
```

For local testing without creating installers:

```bash
pnpm run pack
cp -r dist/mac-arm64/nodl.app /Applications/
xattr -cr /Applications/nodl.app
open /Applications/nodl.app
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 41 |
| Build | electron-vite + Vite 7 |
| Frontend | React 19 |
| Editor | Monaco Editor |
| State | Zustand 5 |
| Styling | Tailwind CSS 3 |
| Transpiler | esbuild |
| Icons | Lucide React |
| Packaging | electron-builder |
| Testing | Vitest + Playwright |
