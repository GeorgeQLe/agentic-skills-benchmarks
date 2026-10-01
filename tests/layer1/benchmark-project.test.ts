import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PINNED_SKILLPACKS_VERSION,
  prepareBenchmarkProject,
  validateBenchmarkSkillPackage,
} from "../harness/benchmark-project.js";
import { runChunk } from "../harness/bench-runner.js";
import { runDashboard } from "../harness/dashboard/orchestrator.js";
import type { BenchAgent, SessionManifest, SkillBenchSetup } from "../harness/bench-types.js";

const scratch: string[] = [];
const catalogManifest = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../data/skills-catalog/v1/manifest.json"), "utf8"));
const expectedFingerprint = catalogManifest.manifest.source_fingerprint as string;

afterEach(() => {
  for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(path);
  return path;
}

function fakePackage(options: {
  version?: string;
  fingerprint?: string;
  includeCodex?: boolean;
  includeSkillFile?: boolean;
} = {}): string {
  const root = temp("skillpacks-fixture-");
  const version = options.version ?? PINNED_SKILLPACKS_VERSION;
  const skills = [
    {
      name: "assumption-tracker",
      platform: "claude",
      pack: "business-ops",
      path: "packs/business-ops/claude/assumption-tracker/SKILL.md",
      installable: true,
    },
    ...(options.includeCodex === false ? [] : [{
      name: "assumption-tracker",
      platform: "codex",
      pack: "business-ops",
      path: "packs/business-ops/codex/assumption-tracker/SKILL.md",
      installable: true,
    }]),
  ];
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "skillpacks", version }));
  writeFileSync(join(root, "dist", "skillpacks-manifest.json"), JSON.stringify({
    package: { name: "skillpacks", version },
    source_fingerprint: options.fingerprint ?? expectedFingerprint,
    skills,
  }));
  if (options.includeSkillFile !== false) {
    for (const entry of skills) {
      const skillPath = join(root, entry.path);
      mkdirSync(resolve(skillPath, ".."), { recursive: true });
      writeFileSync(skillPath, `---\nname: assumption-tracker\n---\n\n${entry.platform} instructions\n`);
      mkdirSync(join(resolve(skillPath, ".."), "archive", "v0.0"), { recursive: true });
      writeFileSync(join(resolve(skillPath, ".."), "archive", "v0.0", "SKILL.md"), "old version");
    }
  }
  return root;
}

function setup(): SkillBenchSetup {
  return {
    skill: "assumption-tracker",
    prompt: "write output",
    perRunBudgetUsd: 0.1,
    timeoutMs: 1_000,
    setupProject(workDir) {
      writeFileSync(join(workDir, "fixture.md"), "fixture evidence");
      mkdirSync(join(workDir, ".agents"), { recursive: true });
      writeFileSync(join(workDir, ".agents", "project.json"), JSON.stringify({ name: "fixture-project" }));
    },
    assertResult() {
      return [{ description: "completed", pass: true }];
    },
  };
}

describe("benchmark project preparation", () => {
  it("installs only the selected agent skill root and ignores user-home skills", () => {
    const packageRoot = fakePackage();
    const userHome = temp("benchmark-user-home-");
    mkdirSync(join(userHome, ".codex", "skills", "home-only"), { recursive: true });
    writeFileSync(join(userHome, ".codex", "skills", "home-only", "SKILL.md"), "must not be copied");
    const previousHome = process.env.HOME;
    process.env.HOME = userHome;
    try {
      const workDir = prepareBenchmarkProject(setup(), { index: 0, agent: "codex" }, {
        packageRoot,
        createProject: () => temp("benchmark-project-"),
      });
      expect(readFileSync(join(workDir, ".codex", "skills", "assumption-tracker", "SKILL.md"), "utf8"))
        .toContain("codex instructions");
      expect(existsSync(join(workDir, ".claude", "skills", "assumption-tracker", "SKILL.md"))).toBe(false);
      expect(existsSync(join(workDir, ".codex", "skills", "home-only", "SKILL.md"))).toBe(false);
      expect(existsSync(join(workDir, ".codex", "skills", "assumption-tracker", "archive"))).toBe(false);
      const project = JSON.parse(readFileSync(join(workDir, ".agents", "project.json"), "utf8"));
      expect(project.agent_mode).toBe("codex-only");
      expect(project.name).toBe("fixture-project");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it.each([
    ["missing package", () => join(temp("missing-package-"), "absent"), /missing pinned skillpacks package/],
    ["wrong version", () => fakePackage({ version: "0.1.18" }), /package version mismatch/],
    ["wrong fingerprint", () => fakePackage({ fingerprint: "wrong" }), /fingerprint mismatch/],
    ["missing skill file", () => fakePackage({ includeSkillFile: false }), /missing declared skill/],
    ["missing platform mirror", () => fakePackage({ includeCodex: false }), /missing codex platform mirror/],
  ])("rejects %s during preflight", (_label, packageRoot, pattern) => {
    expect(() => validateBenchmarkSkillPackage("assumption-tracker", "codex", packageRoot())).toThrow(pattern);
  });

  it("stops the standard runner before the model runner is invoked", async () => {
    const runAgent = vi.fn();
    const manifest = {
      skill: "assumption-tracker",
      sessionId: "preflight-test",
      skillsCatalogRef: "test",
      skillsCatalogVersion: PINNED_SKILLPACKS_VERSION,
      sourceCommit: "test",
      releaseChannel: "release",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "running",
      config: {
        skill: "assumption-tracker",
        agent: "codex" as BenchAgent,
        runs: 1,
        chunkSize: 1,
        pauseSeconds: 0,
        maxBudgetUsd: 1,
        perRunBudgetUsd: 0.1,
        timeoutMs: 1_000,
      },
      completedRuns: 0,
      totalEstimatedCostUsd: 0,
      chunks: [],
    } satisfies SessionManifest;

    await expect(runChunk(
      setup(),
      manifest,
      0,
      1,
      runAgent,
      () => temp("unused-project-"),
      () => { throw new Error("package fingerprint preflight failed"); },
    )).rejects.toThrow("preflight failed");
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("uses the same preparation boundary for concurrent dashboard fixtures", async () => {
    const packageRoot = fakePackage();
    const prepared: string[] = [];
    const targetSetup = setup();
    const runAgent = vi.fn(async (_agent, options) => {
      expect(existsSync(join(options.workDir, ".codex", "skills", "assumption-tracker", "SKILL.md"))).toBe(true);
      expect(existsSync(join(options.workDir, "fixture.md"))).toBe(true);
      prepared.push(options.workDir);
      return { stdout: "ok", stderr: "", exitCode: 0, workDir: options.workDir, files: ["fixture.md"] };
    });

    const state = await runDashboard({
      models: [{ id: "codex-test", label: "Codex test", cli: "codex", model: "test" }],
      targets: [{ name: "assumption-tracker", kind: "skill", setup: targetSetup }],
      runsPerCell: 2,
      concurrency: 2,
      budgetUsd: 1,
      mock: false,
      prepareProject(selectedSetup, context) {
        return prepareBenchmarkProject(selectedSetup, context, {
          packageRoot,
          createProject: () => temp("dashboard-fixture-"),
        });
      },
      runAgent,
    });

    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(new Set(prepared).size).toBe(2);
    expect(state.completedTasks).toBe(2);
  });

  it("stops the dashboard before its model runner on preparation failure", async () => {
    const runAgent = vi.fn();
    await expect(runDashboard({
      models: [{ id: "codex-test", label: "Codex test", cli: "codex", model: "test" }],
      targets: [{ name: "assumption-tracker", kind: "skill", setup: setup() }],
      runsPerCell: 1,
      concurrency: 1,
      budgetUsd: 1,
      mock: false,
      prepareProject() { throw new Error("missing platform mirror"); },
      runAgent,
    })).rejects.toThrow("missing platform mirror");
    expect(runAgent).not.toHaveBeenCalled();
  });
});
