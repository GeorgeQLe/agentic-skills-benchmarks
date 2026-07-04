import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createTempProject } from "../harness/runner.js";
import commitAndPushSetup from "../layer4/setups/git-fixture-commit-and-push.setup.js";
import syncSetup from "../layer4/setups/git-fixture-sync.setup.js";
import type { RunResult } from "../harness/types.js";

function git(cwd: string, cmd: string): void {
  execSync(cmd, { cwd, stdio: ["pipe", "pipe", "pipe"] });
}

function makeResult(workDir: string): RunResult {
  return { stdout: "", stderr: "", exitCode: 0, workDir, files: [] };
}

const created: string[] = [];
function project(): string {
  const dir = createTempProject();
  created.push(dir);
  return dir;
}

afterEach(() => {
  while (created.length) {
    try {
      rmSync(created.pop()!, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

describe("git-fixture commit-and-push assertResult", () => {
  it("passes when the agent groups commits and pushes", () => {
    const workDir = project();
    commitAndPushSetup.setupProject(workDir);

    // A "good" agent: two conventional feature commits, then push.
    git(workDir, "git reset -q");
    git(workDir, "git add src/auth tests");
    git(workDir, 'git commit -q -m "feat(auth): add login and logout with tests"');
    git(workDir, "git add -A");
    git(workDir, 'git commit -q -m "feat(ui): add button and card styles"');
    git(workDir, "git push -q origin main");

    const assertions = commitAndPushSetup.assertResult(makeResult(workDir), { agent: "claude" });
    const failed = assertions.filter((a) => !a.pass);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  });

  it("fails when the agent only narrates and does not commit", () => {
    const workDir = project();
    commitAndPushSetup.setupProject(workDir);

    const assertions = commitAndPushSetup.assertResult(makeResult(workDir), { agent: "claude" });
    expect(assertions.some((a) => !a.pass)).toBe(true);
  });
});

describe("git-fixture sync assertResult", () => {
  it("passes when the agent pulls upstream and preserves NOTES.md", () => {
    const workDir = project();
    syncSetup.setupProject(workDir);

    // A "good" agent: fetch + merge upstream; untracked NOTES.md is preserved.
    git(workDir, "git pull -q --no-rebase --no-edit origin main");

    const assertions = syncSetup.assertResult(makeResult(workDir), { agent: "claude" });
    const failed = assertions.filter((a) => !a.pass);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  });

  it("fails when the agent does not sync with upstream", () => {
    const workDir = project();
    syncSetup.setupProject(workDir);

    const assertions = syncSetup.assertResult(makeResult(workDir), { agent: "claude" });
    expect(assertions.some((a) => !a.pass)).toBe(true);
  });
});
