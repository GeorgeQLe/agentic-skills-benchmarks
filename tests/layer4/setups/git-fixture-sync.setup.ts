import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";
import type {
  ConfirmationGate,
  CreateResult,
  DisposableRepo,
} from "../helpers/disposable-repo.js";
import {
  createDisposableRepo,
  seedRepo,
} from "../helpers/disposable-repo.js";

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

function autoConfirm(action: string): Promise<boolean> {
  return Promise.resolve(true);
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
    for (const [relativePath, content] of Object.entries(SEED_FILES)) {
      const fullPath = join(workDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }

    execSync("git add -A && git commit -m 'seed: initial files'", {
      cwd: workDir,
      stdio: "pipe",
    });
    execSync("git push origin HEAD", { cwd: workDir, stdio: "pipe" });

    const upstreamClone = mkdtempSync(join(tmpdir(), "sync-upstream-"));
    const remoteUrl = execSync("git remote get-url origin", {
      cwd: workDir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    execSync(`git clone ${remoteUrl} upstream`, {
      cwd: upstreamClone,
      stdio: "pipe",
    });
    const upstreamPath = join(upstreamClone, "upstream");

    for (const [relativePath, content] of Object.entries(UPSTREAM_FILES)) {
      const fullPath = join(upstreamPath, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }

    execSync(
      "git add -A && git commit -m 'feat: add utils and extend index' && git push origin HEAD",
      { cwd: upstreamPath, stdio: "pipe" },
    );

    // The upstream clone exists only to push divergent history to the remote;
    // it is never read again, so reclaim it rather than leaking a temp dir per run.
    rmSync(upstreamClone, { recursive: true, force: true });

    writeFileSync(
      join(workDir, "NOTES.md"),
      "# Local Notes\n\nUncommitted local work.\n",
      "utf-8",
    );
  },

  assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[] {
    const assertions: Assertion[] = [];
    const output = (result.stdout ?? "") + (result.stderr ?? "");

    const mentionsPull = /pull|rebase|fetch|fast-forward|up.to.date/i.test(output);
    assertions.push({
      name: "pull-performed",
      passed: mentionsPull,
      expected: "Output confirms pull/rebase/fetch was performed",
      actual: mentionsPull
        ? "Pull/sync operation mentioned in output"
        : "No mention of pull/sync operation in output",
    });

    const mentionsBranch = /main|branch/i.test(output);
    assertions.push({
      name: "branch-reported",
      passed: mentionsBranch,
      expected: "Output reports branch name or branch status",
      actual: mentionsBranch
        ? "Branch information reported"
        : "No branch information in output",
    });

    const mentionsStash = /stash|uncommitted|local change|unstaged/i.test(output);
    assertions.push({
      name: "stash-handling",
      passed: mentionsStash,
      expected: "Output addresses uncommitted local changes (stash/restore)",
      actual: mentionsStash
        ? "Stash or uncommitted change handling mentioned"
        : "No mention of stash or uncommitted change handling",
    });

    const mentionsSync = /sync|up.to.date|updated|pulled|merged|rebased/i.test(output);
    assertions.push({
      name: "sync-status-reported",
      passed: mentionsSync,
      expected: "Output reports sync completion status",
      actual: mentionsSync
        ? "Sync status reported"
        : "No sync status in output",
    });

    return assertions;
  },
};

export default setup;
