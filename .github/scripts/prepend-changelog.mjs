#!/usr/bin/env node
// Prepend a release block to apps/desktop/CHANGELOG.md, right under the `# ` title.
// Runs in the build job (the app bundles CHANGELOG.md at build time, for the About
// dialog) and again in the release job, which commits it.
//
// Env:
//   TAG      e.g. v2.3.0
//   DATE     YYYY-MM-DD — from the prepare job, so every job writes the same block
//   ENTRIES  changelog lines from generate-changelog.mjs

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { TAG, DATE, ENTRIES } = process.env;
if (!TAG || !DATE || !ENTRIES) {
  console.error("TAG, DATE and ENTRIES are required");
  process.exit(1);
}

const file = join(dirname(fileURLToPath(import.meta.url)), "../../apps/desktop/CHANGELOG.md");
const block = `## ${TAG} (${DATE})\n\n${ENTRIES}`;
const changelog = existsSync(file) ? readFileSync(file, "utf8") : "# Changelog\n";
const lines = changelog.split("\n");
const titleIdx = lines.findIndex((l) => l.startsWith("# "));
if (titleIdx >= 0) {
  lines.splice(titleIdx + 1, 0, "", block);
} else {
  lines.unshift(block, "");
}
writeFileSync(file, lines.join("\n"));
