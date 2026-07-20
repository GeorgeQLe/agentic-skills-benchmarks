import { describe, expect, it } from "vitest";
import { runBenchCommand } from "../harness/cli/bench-command.js";
import { runDashboardCommand } from "../harness/cli/dashboard-command.js";
import { listCommand } from "../harness/cli/list-command.js";
import { runSkillbenchCommand } from "../harness/cli/skillbench-command.js";
import type { DashboardState, BenchTargetSpec } from "../harness/dashboard/state.js";
import type { ModelTarget } from "../harness/dashboard/model-matrix.js";
import { UNKNOWN_BENCHMARK_CATALOG_METADATA } from "../harness/skills-catalog.js";

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (chunk: string) => { stdout += chunk; return true; } },
      stderr: { write: (chunk: string) => { stderr += chunk; return true; } },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function dashboardState(models: ModelTarget[], targets: BenchTargetSpec[], mock: boolean, budgetUsd: number): DashboardState {
  const aggregates = new Map();
  for (const model of models) {
    aggregates.set(model.id, {
      target: model,
      total: targets.length,
      done: targets.length,
      passed: targets.length,
      evaluated: targets.length,
      blocked: 0,
      costUsd: 0,
      durationsMs: [],
    });
  }
  return {
    startedAt: 1,
    now: 2,
    models,
    targets,
    cells: new Map(),
    aggregates,
    activity: [],
    totalTasks: models.length * targets.length,
    completedTasks: models.length * targets.length,
    totalCostUsd: 0,
    budgetUsd,
    runsPerCell: 1,
    haltedByBudget: false,
    finished: true,
    mock,
    catalogMetadata: UNKNOWN_BENCHMARK_CATALOG_METADATA,
  };
}

describe("skillbench CLI", () => {
  it("routes `skillbench run` to the benchmark command", async () => {
    const calls: string[][] = [];
    const code = await runSkillbenchCommand(["run", "--skill", "investigate", "--runs", "1"], process.env, {
      runBench: (args) => {
        calls.push(args);
        return 0;
      },
    });

    expect(code).toBe(0);
    expect(calls).toEqual([["--skill", "investigate", "--runs", "1"]]);
  });

  it("launches the interactive shell path for no args without starting work", async () => {
    let launched = false;
    const code = await runSkillbenchCommand([], process.env, {
      interactive: async () => {
        launched = true;
        return 0;
      },
    });

    expect(code).toBe(0);
    expect(launched).toBe(true);
  });

  it("routes `skillbench stress` to the fake-data stress suite", async () => {
    const calls: string[][] = [];
    const code = await runSkillbenchCommand(["stress", "--json"], process.env, {
      stress: async (args) => {
        calls.push(args ?? []);
        return 0;
      },
    });

    expect(code).toBe(0);
    expect(calls).toEqual([["--json"]]);
  });

  it("preserves dashboard flag parsing", async () => {
    const capture = captureIo();
    const seen: Array<{ models: string[]; runs: number; budget: number; mock: boolean; live: boolean | undefined; releaseChannel: string }> = [];
    const code = await runDashboardCommand(
      ["--mock", "--models", "gpt-5", "--skills", "investigate", "--runs", "1", "--budget", "1", "--no-live", "--release-channel", "canary"],
      process.env,
      {
        io: capture.io,
        runDashboard: async (opts) => {
          seen.push({
            models: opts.models.map((model) => model.id),
            runs: opts.runsPerCell,
            budget: opts.budgetUsd,
            mock: opts.mock,
            live: opts.live,
            releaseChannel: opts.catalogMetadata?.releaseChannel ?? "missing",
          });
          return dashboardState(opts.models, opts.targets, opts.mock, opts.budgetUsd);
        },
        persistSummary: () => "stubbed-summary.json",
      },
    );

    expect(code).toBe(0);
    expect(seen).toEqual([{ models: ["gpt-5"], runs: 1, budget: 1, mock: true, live: false, releaseChannel: "canary" }]);
  });

  it("lists GPT-5 models and rejects Fable 5 selection", async () => {
    const listed = captureIo();
    expect(listCommand(["models"], listed.io)).toBe(0);
    expect(listed.stdout()).toContain("gpt-5");
    expect(listed.stdout()).not.toContain("fable-5");

    const rejected = captureIo();
    const code = await runDashboardCommand(["--mock", "--models", "fable-5", "--skills", "investigate"], process.env, {
      io: rejected.io,
    });
    expect(code).toBe(1);
    expect(rejected.stderr()).toMatch(/banned/);
  });

  it("fails invalid numeric flags with clear messages", () => {
    const capture = captureIo();
    const code = runBenchCommand(["--skill", "investigate", "--runs", "0"], process.env, {
      io: capture.io,
      spawn: () => 0,
    });

    expect(code).toBe(1);
    expect(capture.stderr()).toContain('--runs must be a positive integer, got "0"');
  });

  it("rejects the removed Grok agent before spawning work", () => {
    const capture = captureIo();
    let spawned = false;
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "grok", "--runs", "1", "--budget", "1"],
      process.env,
      {
        io: capture.io,
        spawn: () => {
          spawned = true;
          return 0;
        },
      },
    );

    expect(code).toBe(1);
    expect(spawned).toBe(false);
    expect(capture.stderr()).toContain('unknown agent "grok" (expected claude, codex, or both)');
  });

  it("accepts --release-channel canary and propagates it to bench workers", () => {
    const capture = captureIo();
    const envs: Record<string, string>[] = [];
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "claude", "--runs", "1", "--budget", "1", "--release-channel", "canary"],
      process.env,
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          envs.push(env);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(envs).toHaveLength(1);
    expect(envs[0].SKILLBENCH_RELEASE_CHANNEL).toBe("canary");
  });

  it("spawns only the reserved run count when the suite budget partially funds a target", () => {
    const capture = captureIo();
    const envs: Record<string, string>[] = [];
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "claude", "--runs", "3", "--chunk-size", "3", "--budget", "1.5"],
      process.env,
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          envs.push(env);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(envs).toHaveLength(1);
    expect(envs[0].BENCH_RUNS).toBe("1");
    expect(envs[0].BENCH_CHUNK_SIZE).toBe("1");
    expect(envs[0].BENCH_MAX_BUDGET_USD).toBe("1");
  });

  it("uses SKILLBENCH_RELEASE_CHANNEL when the release-channel flag is absent", () => {
    const capture = captureIo();
    const envs: Record<string, string>[] = [];
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "claude", "--runs", "1", "--budget", "1"],
      { ...process.env, SKILLBENCH_RELEASE_CHANNEL: "canary" },
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          envs.push(env);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(envs[0].SKILLBENCH_RELEASE_CHANNEL).toBe("canary");
  });

  it("lets --release-channel win over SKILLBENCH_RELEASE_CHANNEL", () => {
    const capture = captureIo();
    const envs: Record<string, string>[] = [];
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "claude", "--runs", "1", "--budget", "1", "--release-channel", "release"],
      { ...process.env, SKILLBENCH_RELEASE_CHANNEL: "canary" },
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          envs.push(env);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(envs[0].SKILLBENCH_RELEASE_CHANNEL).toBe("release");
  });

  it("rejects invalid release-channel values before spawning work", () => {
    const capture = captureIo();
    let spawned = false;
    const code = runBenchCommand(
      ["--skill", "investigate", "--agent", "claude", "--runs", "1", "--budget", "1", "--release-channel", "nightly"],
      process.env,
      {
        io: capture.io,
        spawn: () => {
          spawned = true;
          return 0;
        },
      },
    );

    expect(code).toBe(1);
    expect(spawned).toBe(false);
    expect(capture.stderr()).toContain('--release-channel must be "release" or "canary", got "nightly"');
  });

  it("rejects invalid dashboard release-channel values before running the dashboard", async () => {
    const capture = captureIo();
    let ranDashboard = false;
    const code = await runDashboardCommand(
      ["--mock", "--models", "gpt-5", "--skills", "investigate", "--release-channel", "nightly"],
      process.env,
      {
        io: capture.io,
        runDashboard: async (opts) => {
          ranDashboard = true;
          return dashboardState(opts.models, opts.targets, opts.mock, opts.budgetUsd);
        },
        persistSummary: () => "stubbed-summary.json",
      },
    );

    expect(code).toBe(1);
    expect(ranDashboard).toBe(false);
    expect(capture.stderr()).toContain('--release-channel must be "release" or "canary", got "nightly"');
  });
});
