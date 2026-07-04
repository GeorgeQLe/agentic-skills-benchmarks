import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";

// The bare "origin" lives inside the workDir so the harness's workDir cleanup
// (bench-runner rmSync) reclaims it. It is excluded from the working tree via
// .git/info/exclude so it never gets staged/committed by the fixture or agent.
const ORIGIN_DIR = ".bench-origin.git";
const BASELINE_TAG = "bench-baseline";
const CONVENTIONAL_SUBJECT = /^(feat|fix|refactor|test|docs|chore|perf|build|ci|style)(\([^)]*\))?!?:\s+\S/;

// The staged-but-uncommitted "feature work" the agent must group into commits.
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
};

function git(cwd: string, cmd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
}

function configureIdentity(cwd: string): void {
  git(cwd, 'git config user.email "bench@example.com"');
  git(cwd, 'git config user.name "Bench Fixture"');
  git(cwd, "git config commit.gpgsign false");
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
    configureIdentity(workDir);

    // Keep the bare origin out of the working tree the agent operates on.
    appendFileSync(join(workDir, ".git", "info", "exclude"), `\n/${ORIGIN_DIR}/\n`);

    // A local, offline bare remote — no network, no gh.
    git(workDir, `git init --bare "${ORIGIN_DIR}"`);
    git(workDir, `git remote add origin "${ORIGIN_DIR}"`);

    // Baseline commit so origin/main exists and there is a real history to
    // extend. The BASELINE_TAG marks it so assertResult can count only the
    // agent's new commits.
    writeFileSync(
      join(workDir, "README.md"),
      [
        "# Test Fixture Project",
        "",
        "A disposable test project for benchmarking `commit-and-push-by-feature`.",
      ].join("\n"),
      "utf-8",
    );
    git(workDir, "git add -A");
    git(workDir, 'git commit -m "chore: baseline project scaffold"');
    git(workDir, "git branch -M main");
    git(workDir, "git push -u origin main");
    git(workDir, `git tag ${BASELINE_TAG}`);

    // The uncommitted feature work the agent must group + push.
    for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
      const fullPath = join(workDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }
    git(workDir, "git add -A");
  },

  assertResult(result: RunResult, _context?: { agent: BenchAgent }): Assertion[] {
    const workDir = result.workDir;
    const read = (cmd: string) => git(workDir, cmd).trim();

    try {
      const newSubjects = read(`git log ${BASELINE_TAG}..HEAD --format=%s`)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const porcelain = read("git status --porcelain");
      const headSha = read("git rev-parse HEAD");
      const originSha = read(`git --git-dir="${join(workDir, ORIGIN_DIR)}" rev-parse refs/heads/main`);

      return [
        {
          description: "At least 2 feature commits created on top of baseline",
          pass: newSubjects.length >= 2,
          detail: `new commits: ${newSubjects.length} (${newSubjects.join(" | ") || "none"})`,
        },
        {
          description: "All new commit subjects are conventional commits",
          pass: newSubjects.length > 0 && newSubjects.every((s) => CONVENTIONAL_SUBJECT.test(s)),
          detail: newSubjects.join(" | ") || "no new commits",
        },
        {
          description: "Working tree is clean after commits",
          pass: porcelain.length === 0,
          detail: porcelain || "clean",
        },
        {
          description: "origin/main advanced to the local HEAD (push performed)",
          pass: originSha === headSha && headSha.length > 0,
          detail: `HEAD=${headSha.slice(0, 12)} origin=${originSha.slice(0, 12)}`,
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
