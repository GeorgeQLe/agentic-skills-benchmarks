import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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

const FIXTURE_FILES: Record<string, string> = {
  "src/auth/login.ts": [
    'export function login(user: string, pass: string): boolean {',
    '  if (!user || !pass) return false;',
    '  return authenticate(user, pass);',
    '}',
    '',
    'function authenticate(user: string, pass: string): boolean {',
    '  return user === "admin" && pass === "secret";',
    '}',
  ].join("\n"),
  "src/auth/logout.ts": [
    'export function logout(sessionId: string): void {',
    '  clearSession(sessionId);',
    '}',
    '',
    'function clearSession(_id: string): void {}',
  ].join("\n"),
  "src/ui/button.css": [
    '.btn { padding: 8px 16px; border-radius: 4px; cursor: pointer; }',
    '.btn-primary { background: #0066cc; color: white; }',
    '.btn-danger { background: #cc0000; color: white; }',
  ].join("\n"),
  "src/ui/card.css": [
    '.card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }',
    '.card-header { font-weight: bold; margin-bottom: 8px; }',
  ].join("\n"),
  "tests/auth.test.ts": [
    'import { login } from "../src/auth/login";',
    'describe("login", () => {',
    '  it("rejects empty credentials", () => {',
    '    expect(login("", "")).toBe(false);',
    '  });',
    '  it("accepts valid credentials", () => {',
    '    expect(login("admin", "secret")).toBe(true);',
    '  });',
    '});',
  ].join("\n"),
  "README.md": [
    "# Test Fixture Project",
    "",
    "A disposable test project for benchmarking `commit-and-push-by-feature`.",
    "",
    "## Features",
    "- Auth module with login/logout",
    "- UI components with CSS styles",
    "- Test coverage for auth",
  ].join("\n"),
};

function autoConfirm(action: string): Promise<boolean> {
  return Promise.resolve(true);
}

const setup: SkillBenchSetup = {
  skill: "commit-and-push-by-feature",
  prompt: [
    "All changes in this repository are staged but not committed.",
    "Group them into logical feature commits with conventional commit messages and push to origin.",
    "The primary branch is `main`.",
  ].join(" "),
  perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  timeoutMs: BENCH_TIMEOUTS_MS.standard,

  setupProject(workDir: string): void {
    for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
      const fullPath = join(workDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }

    execSync("git add -A", { cwd: workDir, stdio: "pipe" });
  },

  assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[] {
    const assertions: Assertion[] = [];
    const output = (result.stdout ?? "") + (result.stderr ?? "");

    const commitPattern = /\b(feat|fix|refactor|test|docs|chore)\(/;
    assertions.push({
      name: "conventional-commit-messages",
      passed: commitPattern.test(output),
      expected: "Output contains conventional commit messages (feat/fix/refactor/test/docs/chore)",
      actual: commitPattern.test(output)
        ? "Found conventional commit pattern"
        : "No conventional commit pattern found in output",
    });

    const multipleCommits = (output.match(/\b[0-9a-f]{7,40}\b/g) ?? []).length >= 2;
    assertions.push({
      name: "multiple-commits",
      passed: multipleCommits,
      expected: "At least 2 separate commits (changes grouped by feature)",
      actual: multipleCommits
        ? "Found multiple commit hashes"
        : "Fewer than 2 commit hashes found — changes may not be grouped",
    });

    const mentionsPush = /push/i.test(output);
    assertions.push({
      name: "push-performed",
      passed: mentionsPush,
      expected: "Output confirms push was performed",
      actual: mentionsPush
        ? "Push mentioned in output"
        : "No mention of push in output",
    });

    const cleanTree = /clean/i.test(output);
    assertions.push({
      name: "clean-working-tree",
      passed: cleanTree,
      expected: "Working tree is clean after commits",
      actual: cleanTree
        ? "Working tree reported as clean"
        : "No confirmation of clean working tree",
    });

    return assertions;
  },
};

export default setup;
