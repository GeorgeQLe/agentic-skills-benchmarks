import { readFileSync, rmSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  DEFAULT_MODEL_MATRIX,
  selectModelTargets,
} from "../harness/dashboard/model-matrix.js";
import type { ModelTarget } from "../harness/dashboard/model-matrix.js";
import {
  runLiveDashboardWithRuntime,
  type LiveDashboardRuntime,
} from "../harness/dashboard/live.js";
import { runDashboard } from "../harness/dashboard/orchestrator.js";
import { passRate, type BenchTargetSpec } from "../harness/dashboard/state.js";
import type { SingleRunResult, SkillBenchSetup } from "../harness/bench-types.js";
import { persistDashboardSummary } from "../harness/cli/dashboard-command.js";
import { loadBenchmarkCatalogMetadata } from "../harness/skills-catalog.js";

// Mock mode never invokes the setup, so a bare stub is sufficient.
function stubTarget(name: string): BenchTargetSpec {
  const setup = {
    skill: name,
    prompt: "",
    perRunBudgetUsd: 0.05,
    timeoutMs: 1000,
    setupProject() {},
    assertResult() {
      return [];
    },
  } as unknown as SkillBenchSetup;
  return { name, kind: "skill", setup };
}

function fakeRunResult(index: number, status: "pass" | "fail" | "blocked"): SingleRunResult {
  const blocked = status === "blocked";
  const passed = status === "pass";
  return {
    index,
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:01.000Z",
    durationMs: 900 + index * 500,
    exitCode: passed ? 0 : 1,
    assertions: [{ description: "fake assertion", pass: passed }],
    passed,
    stdout: "",
    stderr: blocked ? "rate limit" : "",
    files: [],
    estimatedCostUsd: 0.05,
    infrastructureBlocked: blocked,
    infrastructureReason: blocked ? "fake rate limit" : undefined,
  };
}

type ScriptCellStatus = "pending" | "running" | "pass" | "fail" | "blocked";

function scriptedState(
  statuses: Record<string, ScriptCellStatus>,
  opts: {
    now: number;
    startedAt?: number;
    finished?: boolean;
    haltedByBudget?: boolean;
    activity?: {
      modelLabel: string;
      targetName: string;
      runIndex: number;
      status: ScriptCellStatus;
      durationMs: number;
    }[];
  },
) {
  const models: ModelTarget[] = [
    { id: "gpt-5-codex", label: "GPT-5 Codex With Very Long Label", cli: "codex", model: "gpt-5-codex" },
    { id: "claude-opus", label: "Claude Opus", cli: "claude", model: "opus" },
  ];
  const targets = [
    stubTarget("investigation-variant-with-very-long-name"),
    stubTarget("ship-end"),
    stubTarget("blocked-skill"),
    stubTarget("pending-skill"),
  ];
  const cells = new Map();
  const aggregates = new Map();
  let completedTasks = 0;
  let totalCostUsd = 0;

  for (const model of models) {
    let done = 0;
    let passed = 0;
    let evaluated = 0;
    let blocked = 0;
    const durationsMs: number[] = [];
    let current: string | undefined;

    for (const [targetIndex, target] of targets.entries()) {
      const status = statuses[`${model.id}:${target.name}`] ?? "pending";
      const running = status === "running" ? 1 : 0;
      const results =
        status === "pending" || status === "running"
          ? []
          : [fakeRunResult(targetIndex, status)];
      cells.set(`${model.id}::${target.name}`, {
        modelId: model.id,
        targetName: target.name,
        total: 1,
        running,
        results,
      });

      if (running) current = target.name;
      if (results.length > 0) {
        done++;
        completedTasks++;
        durationsMs.push(results[0].durationMs);
        totalCostUsd += results[0].estimatedCostUsd;
        if (results[0].infrastructureBlocked) blocked++;
        else {
          evaluated++;
          if (results[0].passed) passed++;
        }
      }
    }

    aggregates.set(model.id, {
      target: model,
      total: targets.length,
      done,
      passed,
      evaluated,
      blocked,
      costUsd: Number((done * 0.05).toFixed(2)),
      durationsMs,
      current,
    });
  }

  return {
    startedAt: opts.startedAt ?? 1_000_000,
    now: opts.now,
    models,
    targets,
    cells,
    aggregates,
    activity: (opts.activity ?? []).map((entry, index) => ({
      ts: opts.now - index,
      modelLabel: entry.modelLabel,
      targetName: entry.targetName,
      runIndex: entry.runIndex,
      status: entry.status,
      durationMs: entry.durationMs,
    })),
    totalTasks: models.length * targets.length,
    completedTasks,
    totalCostUsd: Number(totalCostUsd.toFixed(2)),
    budgetUsd: 0.25,
    runsPerCell: 1,
    haltedByBudget: opts.haltedByBudget ?? false,
    finished: opts.finished ?? false,
    mock: true,
    catalogMetadata: {
      skillsCatalogRef: "test",
      skillsCatalogVersion: "test",
      sourceCommit: "test",
      releaseChannel: "unknown" as const,
    },
  };
}

function normalizeLiveOutput(output: string): string {
  return output.replace(/\x1b\[/g, "<ESC>[").replace(/ +$/gm, "");
}

function createLiveRuntime(
  runDashboardImpl: LiveDashboardRuntime["runDashboard"],
): LiveDashboardRuntime & {
  output(): string;
  tick(): void;
  clearedIntervals: unknown[];
  signals: Map<NodeJS.Signals, Set<() => void>>;
} {
  let output = "";
  const intervals: (() => void)[] = [];
  const clearedIntervals: unknown[] = [];
  const signals = new Map<NodeJS.Signals, Set<() => void>>();
  return {
    stdout: {
      isTTY: true,
      columns: 80,
      write: (chunk) => {
        output += chunk;
        return true;
      },
    },
    setInterval: (handler) => {
      intervals.push(handler);
      return handler;
    },
    clearInterval: (handle) => {
      clearedIntervals.push(handle);
    },
    onSignal: (signal, handler) => {
      const handlers = signals.get(signal) ?? new Set();
      handlers.add(handler);
      signals.set(signal, handlers);
    },
    offSignal: (signal, handler) => {
      signals.get(signal)?.delete(handler);
    },
    exit: (code) => {
      throw new Error(`exit ${code}`);
    },
    runDashboard: runDashboardImpl,
    output: () => output,
    tick: () => intervals.forEach((handler) => handler()),
    clearedIntervals,
    signals,
  };
}

describe("selectModelTargets", () => {
  it("returns the full matrix by default", () => {
    expect(selectModelTargets(undefined)).toEqual(DEFAULT_MODEL_MATRIX);
    expect(selectModelTargets("all")).toEqual(DEFAULT_MODEL_MATRIX);
  });

  it("resolves a comma-separated subset, case-insensitively and in order", () => {
    const selected = selectModelTargets("GPT-5,claude-opus");
    expect(selected.map((t) => t.id)).toEqual(["gpt-5", "claude-opus"]);
  });

  it("does not include Fable 5 by default", () => {
    expect(DEFAULT_MODEL_MATRIX.map((t) => t.id)).not.toContain("fable-5");
  });

  it("throws when Fable 5 is explicitly selected", () => {
    expect(() => selectModelTargets("fable-5")).toThrow(/banned/);
  });

  it("throws on an unknown id rather than silently dropping it", () => {
    expect(() => selectModelTargets("claude-opus,made-up")).toThrow(/made-up/);
  });
});

describe("runDashboard (mock)", () => {
  it("completes every cell and keeps aggregates internally consistent", async () => {
    const models = selectModelTargets("claude-opus,gpt-5");
    const targets = [stubTarget("a"), stubTarget("b")];
    const state = await runDashboard({
      models,
      targets,
      runsPerCell: 3,
      concurrency: 4,
      budgetUsd: 1000,
      mock: true,
    });

    expect(state.finished).toBe(true);
    expect(state.haltedByBudget).toBe(false);
    expect(state.totalTasks).toBe(2 * 2 * 3);
    expect(state.completedTasks).toBe(state.totalTasks);

    for (const model of models) {
      const agg = state.aggregates.get(model.id)!;
      expect(agg.done).toBe(agg.total);
      // Every completed run is either evaluated (pass/fail) or infra-blocked.
      expect(agg.evaluated + agg.blocked).toBe(agg.done);
      expect(agg.passed).toBeLessThanOrEqual(agg.evaluated);
      expect(passRate(agg)).toBeGreaterThanOrEqual(0);
      expect(passRate(agg)).toBeLessThanOrEqual(1);
    }
  });

  it("stops spending once the budget ceiling is hit", async () => {
    const models = selectModelTargets("claude-opus");
    const targets = [stubTarget("a")];
    const state = await runDashboard({
      models,
      targets,
      runsPerCell: 10,
      concurrency: 1,
      budgetUsd: 0.05, // room for exactly 1 mock run at $0.05/run
      mock: true,
    });

    // Reserve-before-dispatch: the gate reserves the per-run estimate ($0.05)
    // synchronously, so with room for exactly one run precisely one task runs and
    // the rest are drained unspent. Cost is reserved, not merely counted, so the
    // realized total never overshoots the ceiling.
    expect(state.haltedByBudget).toBe(true);
    expect(state.completedTasks).toBe(1);
    expect(state.totalTasks).toBe(10);
    expect(state.totalCostUsd).toBeLessThanOrEqual(state.budgetUsd);
  });

  it("holds the ceiling under concurrency > 1", async () => {
    const models = selectModelTargets("claude-opus");
    const targets = [stubTarget("a")];
    const state = await runDashboard({
      models,
      targets,
      runsPerCell: 20,
      concurrency: 4, // four workers share one un-reserved counter under the old code
      budgetUsd: 0.1, // room for exactly 2 mock runs at $0.05/run
      mock: true,
    });

    // The reservation is atomic against the single-threaded loop, so even with
    // four concurrent workers no in-flight spend escapes the gate: the ceiling
    // holds and the number of admitted runs is bounded by the budget.
    expect(state.haltedByBudget).toBe(true);
    expect(state.totalCostUsd).toBeLessThanOrEqual(state.budgetUsd);
    expect(state.completedTasks).toBe(2);
  });

  it("persists catalog metadata in the dashboard summary", async () => {
    const metadata = loadBenchmarkCatalogMetadata("canary");
    const state = await runDashboard({
      models: selectModelTargets("gpt-5"),
      targets: [stubTarget("a")],
      runsPerCell: 1,
      concurrency: 1,
      budgetUsd: 1,
      mock: true,
      catalogMetadata: metadata,
    });
    const path = persistDashboardSummary(state, {
      stdout: { write: () => true },
      stderr: { write: () => true },
    });

    try {
      const summary = JSON.parse(readFileSync(path, "utf8"));
      expect(summary.skillsCatalogRef).toBe(metadata.skillsCatalogRef);
      expect(summary.skillsCatalogVersion).toBe(metadata.skillsCatalogVersion);
      expect(summary.sourceCommit).toBe(metadata.sourceCommit);
      expect(summary.releaseChannel).toBe("canary");
    } finally {
      rmSync(path, { force: true });
    }
  });
});

describe("runLiveDashboardWithRuntime", () => {
  it("captures deterministic live repaint output", async () => {
    const pending = scriptedState({}, { now: 1_000_000 });
    const running = scriptedState(
      {
        "gpt-5-codex:investigation-variant-with-very-long-name": "running",
        "claude-opus:blocked-skill": "blocked",
      },
      {
        now: 1_003_000,
        activity: [
          {
            modelLabel: "Claude Opus",
            targetName: "blocked-skill",
            runIndex: 0,
            status: "blocked",
            durationMs: 1400,
          },
          {
            modelLabel: "GPT-5 Codex With Very Long Label",
            targetName: "investigation-variant-with-very-long-name",
            runIndex: 0,
            status: "running",
            durationMs: 300,
          },
        ],
        haltedByBudget: true,
      },
    );
    const final = scriptedState(
      {
        "gpt-5-codex:investigation-variant-with-very-long-name": "pass",
        "gpt-5-codex:ship-end": "fail",
        "gpt-5-codex:blocked-skill": "blocked",
        "gpt-5-codex:pending-skill": "pass",
        "claude-opus:investigation-variant-with-very-long-name": "pass",
        "claude-opus:ship-end": "pass",
        "claude-opus:blocked-skill": "blocked",
        "claude-opus:pending-skill": "fail",
      },
      {
        now: 1_006_000,
        finished: true,
        haltedByBudget: true,
        activity: [
          {
            modelLabel: "GPT-5 Codex With Very Long Label",
            targetName: "pending-skill",
            runIndex: 0,
            status: "pass",
            durationMs: 1900,
          },
          {
            modelLabel: "Claude Opus",
            targetName: "pending-skill",
            runIndex: 0,
            status: "fail",
            durationMs: 2400,
          },
          {
            modelLabel: "Claude Opus",
            targetName: "blocked-skill",
            runIndex: 0,
            status: "blocked",
            durationMs: 1400,
          },
        ],
      },
    );

    let runtime: ReturnType<typeof createLiveRuntime>;
    runtime = createLiveRuntime(async (opts) => {
      opts.onUpdate?.(pending);
      runtime.tick();
      opts.onUpdate?.(running);
      runtime.tick();
      opts.onUpdate?.(final);
      return final;
    });

    await runLiveDashboardWithRuntime(
      {
        models: final.models,
        targets: final.targets,
        runsPerCell: 1,
        concurrency: 1,
        budgetUsd: 0.25,
        mock: true,
        live: true,
        color: false,
      },
      runtime,
    );

    const normalized = normalizeLiveOutput(runtime.output());
    expect(normalized).toMatchInlineSnapshot(`
      "<ESC>[?25l<ESC>[2J<ESC>[H<ESC>[HSkillBench [mock]  ⠙  00:00  ░░░░░░░░░░░░░░░░░░░░░░░░   0%  0/8  $0.00/$0.25<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
        GPT-5 Codex With Very Long Label  0/4     ░░░░░░░░░░ —     —        $0.00    queued<ESC>[K
        Claude Opus                       0/4     ░░░░░░░░░░ —     —        $0.00    queued<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ·    ·    ·    ·   <ESC>[K
        Claude Opus                       ·    ·    ·    ·   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          (waiting for first result…)<ESC>[K
      <ESC>[K
        running… Ctrl-C to stop<ESC>[K<ESC>[0J<ESC>[HSkillBench [mock]  ⠙  00:00  ░░░░░░░░░░░░░░░░░░░░░░░░   0%  0/8  $0.00/$0.25<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
        GPT-5 Codex With Very Long Label  0/4     ░░░░░░░░░░ —     —        $0.00    queued<ESC>[K
        Claude Opus                       0/4     ░░░░░░░░░░ —     —        $0.00    queued<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ·    ·    ·    ·   <ESC>[K
        Claude Opus                       ·    ·    ·    ·   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          (waiting for first result…)<ESC>[K
      <ESC>[K
        running… Ctrl-C to stop<ESC>[K<ESC>[0J<ESC>[HSkillBench [mock]  ⠼  00:03  ███░░░░░░░░░░░░░░░░░░░░░  13%  1/8  $0.05/$0.25  ⚠ budget reached<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
        GPT-5 Codex With Very Long Label  0/4     ░░░░░░░░░░ —     —        $0.00    ● investigation-variant-with-very-long-name<ESC>[K
        Claude Opus                       1/4     ░░░░░░░░░░ —     1.9s     $0.05    queued (1 blk)<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ●    ·    ·    ·   <ESC>[K
        Claude Opus                       ·    ·    ▨    ·   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          ▨ Claude Opus                      · blocked-skill            #0  1.4s<ESC>[K
          ● GPT-5 Codex With Very Long Label · investigation-variant-wi #0  300ms<ESC>[K
      <ESC>[K
        running… Ctrl-C to stop<ESC>[K<ESC>[0J<ESC>[HSkillBench [mock]  ⠼  00:03  ███░░░░░░░░░░░░░░░░░░░░░  13%  1/8  $0.05/$0.25  ⚠ budget reached<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
        GPT-5 Codex With Very Long Label  0/4     ░░░░░░░░░░ —     —        $0.00    ● investigation-variant-with-very-long-name<ESC>[K
        Claude Opus                       1/4     ░░░░░░░░░░ —     1.9s     $0.05    queued (1 blk)<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ●    ·    ·    ·   <ESC>[K
        Claude Opus                       ·    ·    ▨    ·   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          ▨ Claude Opus                      · blocked-skill            #0  1.4s<ESC>[K
          ● GPT-5 Codex With Very Long Label · investigation-variant-wi #0  300ms<ESC>[K
      <ESC>[K
        running… Ctrl-C to stop<ESC>[K<ESC>[0J<ESC>[HSkillBench [mock]  done  00:06  ████████████████████████ 100%  8/8  $0.40/$0.25  ⚠ budget reached<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
      ★ GPT-5 Codex With Very Long Label  4/4     ███████░░░ 67%   1.4s     $0.20    done (1 blk)<ESC>[K
        Claude Opus                       4/4     ███████░░░ 67%   1.4s     $0.20    done (1 blk)<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ✓    ✗    ▨    ✓   <ESC>[K
        Claude Opus                       ✓    ✓    ▨    ✗   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          ✓ GPT-5 Codex With Very Long Label · pending-skill            #0  1.9s<ESC>[K
          ✗ Claude Opus                      · pending-skill            #0  2.4s<ESC>[K
          ▨ Claude Opus                      · blocked-skill            #0  1.4s<ESC>[K
      <ESC>[K
        finished — press Ctrl-C to exit<ESC>[K<ESC>[0J<ESC>[HSkillBench [mock]  done  00:06  ████████████████████████ 100%  8/8  $0.40/$0.25  ⚠ budget reached<ESC>[K
      <ESC>[K
        MODEL                             DONE    PASS RATE            p50      COST     STATUS<ESC>[K
      ★ GPT-5 Codex With Very Long Label  4/4     ███████░░░ 67%   1.4s     $0.20    done (1 blk)<ESC>[K
        Claude Opus                       4/4     ███████░░░ 67%   1.4s     $0.20    done (1 blk)<ESC>[K
      <ESC>[K
                                          inve ship bloc pend<ESC>[K
        GPT-5 Codex With Very Long Label  ✓    ✗    ▨    ✓   <ESC>[K
        Claude Opus                       ✓    ✓    ▨    ✗   <ESC>[K
        legend: ✓ pass  ✗ fail  ● running  ▨ infra-blocked  · pending<ESC>[K
      <ESC>[K
        recent<ESC>[K
          ✓ GPT-5 Codex With Very Long Label · pending-skill            #0  1.9s<ESC>[K
          ✗ Claude Opus                      · pending-skill            #0  2.4s<ESC>[K
          ▨ Claude Opus                      · blocked-skill            #0  1.4s<ESC>[K
      <ESC>[K
        finished — press Ctrl-C to exit<ESC>[K<ESC>[0J<ESC>[?25h"
    `);
    expect(normalized).not.toContain("[  ");
    expect(normalized).toContain("<ESC>[?25l");
    expect(normalized).toContain("<ESC>[2J<ESC>[H");
    expect(normalized).toContain("<ESC>[K<ESC>[0J");
    expect(normalized.endsWith("<ESC>[?25h")).toBe(true);
  });

  it("cleans up timers, signals, and cursor restore after success", async () => {
    const final = scriptedState({}, { now: 1_000_000, finished: true });
    const runtime = createLiveRuntime(async (opts) => {
      opts.onUpdate?.(final);
      return final;
    });

    await runLiveDashboardWithRuntime(
      {
        models: final.models,
        targets: final.targets,
        runsPerCell: 1,
        concurrency: 1,
        budgetUsd: 1,
        mock: true,
        live: true,
        color: false,
      },
      runtime,
    );

    expect(runtime.clearedIntervals).toHaveLength(1);
    expect(runtime.signals.get("SIGINT")?.size ?? 0).toBe(0);
    expect(runtime.signals.get("SIGTERM")?.size ?? 0).toBe(0);
    expect(normalizeLiveOutput(runtime.output()).endsWith("<ESC>[?25h")).toBe(true);
  });

  it("cleans up timers, signals, and cursor restore after runner errors", async () => {
    const running = scriptedState(
      { "gpt-5-codex:investigation-variant-with-very-long-name": "running" },
      { now: 1_001_000 },
    );
    const runtime = createLiveRuntime(async (opts) => {
      opts.onUpdate?.(running);
      throw new Error("runner exploded");
    });

    await expect(
      runLiveDashboardWithRuntime(
        {
          models: running.models,
          targets: running.targets,
          runsPerCell: 1,
          concurrency: 1,
          budgetUsd: 1,
          mock: true,
          live: true,
          color: false,
        },
        runtime,
      ),
    ).rejects.toThrow("runner exploded");

    expect(runtime.clearedIntervals).toHaveLength(1);
    expect(runtime.signals.get("SIGINT")?.size ?? 0).toBe(0);
    expect(runtime.signals.get("SIGTERM")?.size ?? 0).toBe(0);
    expect(normalizeLiveOutput(runtime.output()).endsWith("<ESC>[?25h")).toBe(true);
  });
});
