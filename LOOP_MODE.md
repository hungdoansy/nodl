# How to Run Claude Code in Loop Mode

This guide explains how to have Claude Code autonomously implement, test, review, and iterate on the nodl project.

---

## Option 1: The `/loop` Slash Command (Recommended)

Claude Code has a built-in `/loop` command that runs a prompt repeatedly on an interval.

### Usage

```
/loop 5m Implement the next incomplete task from PLAN.md, write tests, run them, and fix any failures. After each cycle, update PLAN.md with progress.
```

- `5m` = interval (default is 10m if omitted)
- The rest is the prompt that runs each cycle

### Example workflow prompt

```
/loop 5m Review PLAN.md and TESTS.md. Pick the next unfinished phase/task. Implement it, write the corresponding tests from TESTS.md, run `pnpm test` and `pnpm build`, fix any failures, then mark the task done in PLAN.md. If all tasks are done, report completion and stop.
```

---

## Option 2: Single Comprehensive Prompt (Let Claude Loop Internally)

Give Claude Code one big prompt and let it work through everything in a single session:

```
You are implementing "nodl" — an Electron desktop app that clones RunJS (a JS/TS
scratchpad). Read PLAN.md for the full implementation plan and TESTS.md for all
test cases.

Key constraints:
- **pnpm only** (no npm/yarn) — all commands must use pnpm
- **Node.js v22** — set in engines field, use .npmrc engine-strict=true
- Electron app with React renderer (Vite)
- Code executes in a forked Node.js child process (not in the renderer)
- IPC bridge between renderer ↔ main process ↔ child process
- Native esbuild for TS transpilation (not WASM)
- electron-store for persistence (JSON on disk)
- Real packages installed via `pnpm add` to a shared node_modules directory

Work through each phase sequentially (Phase 1 → 5). For each phase:
1. Implement all tasks described in PLAN.md
2. Write corresponding tests from TESTS.md (Vitest for unit/component, Playwright for E2E)
3. Run `pnpm test` — iterate until all tests pass
4. Run `pnpm build` — fix any type/build errors
5. Verify the Electron app launches and works manually
6. Commit the phase with a descriptive message
7. Proceed to the next phase

If you encounter a blocker, document it in PLAN.md and move on to the next task.
Start now with Phase 1.
```

---

## Option 3: Plan Mode → Execute

```
# Step 1: Enter plan mode for alignment
/plan

# Step 2: Tell Claude to plan from PLAN.md
Create an implementation plan from PLAN.md, breaking it into tracked tasks.

# Step 3: Exit plan mode — Claude executes with task tracking
# It will check off items as it goes
```

---

## Tips for Best Results

### Electron-specific gotchas
- The dev workflow needs both Vite (renderer) and Electron (main) running
- Tests for main process code run in Node.js, not in a browser
- E2E tests use Playwright's Electron support: `const app = await _electron.launch({...})`
- Monaco Editor needs special Vite config (workers)

### Checkpoint with git
Add this to your prompt:
```
After completing each phase, create a git commit with a descriptive message.
```

### Monitor progress
- PLAN.md gets updated with completion status
- Check in anytime and redirect

### If Claude gets stuck on Electron setup
Electron + Vite + React setup has known friction. If Phase 1 scaffold takes too long:
```
Use electron-vite (pnpm package) for the project scaffold — it handles the
Vite + Electron integration out of the box. Then customize from there.
```

### Recommended first prompt to kick off implementation
```
Read PLAN.md and TESTS.md. Start implementing Phase 1. Use electron-vite for
the scaffold if it simplifies setup. Focus on getting a working Electron window
with Monaco editor + basic JS execution via child process first. Write tests
as you go. Commit when Phase 1 is complete.
```
