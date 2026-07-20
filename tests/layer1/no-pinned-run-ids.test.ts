import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Class 2 guardrail — the benchmark regression comparator matches run
// directories with a shape regex, so no rotating run ID should be hardcoded in
// source ever again. A pinned ID like `<skill>-claude-a1b2c3d4` in code would
// silently scope the comparator to a single stale session. This lint greps
// tests/** and scripts/** for that literal shape and fails on any hit.
//
// Exempt: benchmark/** docs (historical run evidence), comment lines, and this
// test file itself.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const selfPath = fileURLToPath(import.meta.url);

// Assembled from parts so the lint's own source never contains the literal
// pinned shape it hunts for.
const PINNED_RUN_ID = new RegExp("-(?:claude|codex)-[0-9a-f]{6,}");

const SCAN_ROOTS = ["tests", "scripts"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "benchmark"]);
const SOURCE_EXTS = new Set([".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".tsx", ".jsx"]);

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("#");
}

function walk(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (SOURCE_EXTS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
}

describe("no pinned rotating run IDs in source", () => {
  it("finds no hardcoded <skill>-<agent>-<id> pins in tests/** or scripts/**", () => {
    const files: string[] = [];
    for (const root of SCAN_ROOTS) {
      walk(path.join(repoRoot, root), files);
    }

    const offenders: string[] = [];
    for (const file of files) {
      if (file === selfPath) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        if (PINNED_RUN_ID.test(line)) {
          offenders.push(`${path.relative(repoRoot, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders, `hardcoded rotating run IDs found:\n${offenders.join("\n")}`).toEqual([]);
  });
});
