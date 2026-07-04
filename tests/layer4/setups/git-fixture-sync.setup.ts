import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";

// See git-fixture-commit-and-push.setup.ts for the bare-origin-under-workDir rationale.
const ORIGIN_DIR = ".bench-origin.git";
const UPSTREAM_SUBJECT = "feat: add utils and extend index";
const CONFLICT_MARKER = /^(<{7}|={7}|>{7})/m;
const UPSTREAM_MARKER_FILE = "src/utils.ts";

const SEED_FILES: Record<string, string> = {
  "README.md": [
    "# Sync Fixture Project",
    "",
    "A disposable test project for benchmarking `sync`.",
  ].join("\n"),
  "src/index.ts": [
    'export function greet(name: string): string {',
    '  return `Hello, ${name}!`;',
    '}',
  ].join("\n"),
  "package.json": JSON.stringify(
    { name: "sync-fixture", version: "0.1.0", private: true },
    null,
    2,
  ),
};

const UPSTREAM_FILES: Record<string, string> = {
  "src/utils.ts": [
    'export function capitalize(s: string): string {',
    '  return s.charAt(0).toUpperCase() + s.slice(1);',
    '}',
  ].join("\n"),
  "src/index.ts": [
    'export function greet(name: string): string {',
    '  return `Hello, ${name}!`;',
    '}',
    '',
    'export function farewell(name: string): string {',
    '  return `Goodbye, ${name}!`;',
    '}',
  ].join("\n"),
};

function git(cwd: string, cmd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
}

function configureIdentity(cwd: string): void {
  git(cwd, 'git config user.email "bench@example.com"');
  git(cwd, 'git config user.name "Bench Fixture"');
  git(cwd, "git config commit.gpgsign false");
}

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }
}

function isAncestor(cwd: string, ancestor: string, descendant: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${ancestor} ${descendant}`, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

const setup: SkillBenchSetup = {
  skill: "sync",
  prompt: [
    "This repository's local branch is behind origin.",
    "There is one uncommitted local change in NOTES.md.",
    "Pull the latest changes from the remote, handle the local change, and report sync status.",
    "The primary branch is `main`.",
  ].join(" "),
  perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  timeoutMs: BENCH_TIMEOUTS_MS.standard,

  setupProject(workDir: string): void {
    configureIdentity(workDir);
    appendFileSync(join(workDir, ".git", "info", "exclude"), `\n/${ORIGIN_DIR}/\n`);

    // Offline bare remote + baseline history pushed to origin/main.
    git(workDir, `git init --bare "${ORIGIN_DIR}"`);
    git(workDir, `git remote add origin "${ORIGIN_DIR}"`);
    writeFiles(workDir, SEED_FILES);
    git(workDir, "git add -A");
    git(workDir, 'git commit -m "seed: initial files"');
    git(workDir, "git branch -M main");
    git(workDir, "git push -u origin main");

    // Advance the remote past the local branch via a throwaway clone, so the
    // local branch is genuinely "behind origin". The clone is offline (local
    // path) and is discarded once it has pushed.
    const cloneRoot = mkdtempSync(join(tmpdir(), "sync-upstream-"));
    try {
      const originPath = join(workDir, ORIGIN_DIR);
      git(cloneRoot, `git clone "${originPath}" upstream`);
      const upstreamPath = join(cloneRoot, "upstream");
      configureIdentity(upstreamPath);
      writeFiles(upstreamPath, UPSTREAM_FILES);
      git(upstreamPath, "git add -A");
      git(upstreamPath, `git commit -m "${UPSTREAM_SUBJECT}"`);
      git(upstreamPath, "git push origin HEAD:main");
    } finally {
      rmSync(cloneRoot, { recursive: true, force: true });
    }

    // The uncommitted local change the agent must preserve while syncing.
    writeFileSync(
      join(workDir, "NOTES.md"),
      "# Local Notes\n\nUncommitted local work.\n",
      "utf-8",
    );
  },

  assertResult(result: RunResult, _context?: { agent: BenchAgent }): Assertion[] {
    const workDir = result.workDir;
    const read = (cmd: string) => git(workDir, cmd).trim();

    try {
      const upstreamTip = read(`git --git-dir="${join(workDir, ORIGIN_DIR)}" rev-parse refs/heads/main`);
      const localHasUpstream = isAncestor(workDir, upstreamTip, "HEAD");
      const notesSurvived = existsSync(join(workDir, "NOTES.md"));

      const scanTargets = [
        "src/index.ts",
        "src/utils.ts",
        "README.md",
        "NOTES.md",
      ];
      const conflicted = scanTargets.filter((rel) => {
        const path = join(workDir, rel);
        if (!existsSync(path)) return false;
        return CONFLICT_MARKER.test(readFileSync(path, "utf-8"));
      });

      const midMerge =
        existsSync(join(workDir, ".git", "MERGE_HEAD")) ||
        existsSync(join(workDir, ".git", "rebase-merge")) ||
        existsSync(join(workDir, ".git", "rebase-apply"));

      return [
        {
          description: "Local branch now contains the upstream commits",
          pass: localHasUpstream,
          detail: `upstream tip ${upstreamTip.slice(0, 12)} ancestor of HEAD: ${localHasUpstream}`,
        },
        {
          description: "Upstream-added file is present in the working tree",
          pass: existsSync(join(workDir, UPSTREAM_MARKER_FILE)),
          detail: UPSTREAM_MARKER_FILE,
        },
        {
          description: "Local NOTES.md change survived the sync",
          pass: notesSurvived,
        },
        {
          description: "No unresolved merge-conflict markers on disk",
          pass: conflicted.length === 0,
          detail: conflicted.join(", ") || "none",
        },
        {
          description: "Tree reconciled (not mid-merge/rebase)",
          pass: !midMerge,
        },
      ];
    } catch (err) {
      return [
        {
          description: "git state is inspectable in the work directory",
          pass: false,
          detail: err instanceof Error ? err.message : String(err),
        },
      ];
    }
  },
};

export default setup;
