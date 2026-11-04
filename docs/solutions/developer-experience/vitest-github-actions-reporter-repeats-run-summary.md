---
title: Vitest's implicit github-actions reporter repeats a report in the run summary
date: 2026-11-04
problem_type: developer_experience
module: .github/workflows/release.yml
severity: low
tags: [vitest, github-actions, ci, release, run-summary, reporter]
---

The Release run page showed one "Vitest Test Report" block per test step: one from `prepare`, plus one for each job in the `build` matrix.

Vitest 4 adds its `github-actions` reporter when `GITHUB_ACTIONS` is set and no reporter is configured, and that reporter appends to `GITHUB_STEP_SUMMARY` on every run. Nothing in `apps/desktop/vitest.config.ts` asks for it, so the config gives no hint.

Both test steps in `release.yml` now run `pnpm run test --reporter=default`. Any explicit reporter replaces the implicit one.

The trade-off is that the same reporter also writes the inline failure annotations, so those are gone from the run page too. Failures still show in the job log and still fail the job.

Two things to watch when changing or checking this:

- pnpm has its own `--reporter` option, but after the script name the flag goes to the script. The pnpm banner confirms it: `vitest run --reporter\=default`. The steps run in `apps/desktop`, where `test` is plain `vitest run`.
- To reproduce it, set `GITHUB_ACTIONS=true` and point `GITHUB_STEP_SUMMARY` at a temp file. Run once without the flag as a control: it should give 1 block. A count of 0 proves nothing unless the control produced one.
