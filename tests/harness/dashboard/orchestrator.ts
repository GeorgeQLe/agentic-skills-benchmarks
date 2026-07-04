import { rmSync } from "node:fs";
import { createTempProject, runClaude, runCodex } from "../runner.js";
import type { RunOptions } from "../runner.js";
import { buildRunResult } from "../bench-runner.js";
import type { RunResult } from "../types.js";
import type { SingleRunResult } from "../bench-types.js";
import type { ModelTarget } from "./model-matrix.js";
import {
  cellKey,
  type BenchTargetSpec,
  type CellStatus,
  type DashboardState,
} from "./state.js";

export interface OrchestratorOptions {
  models: ModelTarget[];
  targets: BenchTargetSpec[];
  runsPerCell: number;
  concurrency: number;
  budgetUsd: number;
  mock: boolean;
  /** Fired after every state mutation so a renderer can repaint. */
  onUpdate?: (state: DashboardState) => void;
}

interface Task {
  model: ModelTarget;
  target: BenchTargetSpec;
  runIndex: number;
}

/** Drive an agent run for one task, real or simulated, into a SingleRunResult. */
async function executeTask(task: Task, mock: boolean): Promise<SingleRunResult> {
  const { model, target, runIndex } = task;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  if (mock) {
    return simulateRun(task);
  }

  const workDir = createTempProject();
  try {
    target.setup.setupProject(workDir, { index: runIndex, agent: model.cli });
    const opts: RunOptions = {
      prompt: target.setup.prompt,
      workDir,
      maxBudgetUsd: target.setup.perRunBudgetUsd,
      timeoutMs: target.setup.timeoutMs,
      model: model.model,
    };
    const result: RunResult =
      model.cli === "claude" ? await runClaude(opts) : await runCodex(opts);
    return buildRunResult(target.setup, model.cli, result, {
      index: runIndex,
      startedAt,
      durationMs: Date.now() - t0,
    });
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

/**
 * Fabricate a plausible run result for `--mock` mode so the dashboard can be
 * demoed without spending on live agents. Pass likelihood is skewed per model
 * tier purely so the leaderboard looks alive; it implies nothing real.
 */
async function simulateRun(task: Task): Promise<SingleRunResult> {
  const startedAt = new Date().toISOString();
  const bias =
    task.model.id.includes("opus") || task.model.id.includes("gpt-5-codex")
      ? 0.85
      : task.model.id.includes("sonnet")
        ? 0.72
        : 0.6;
  const durationMs = Math.round(1500 + Math.random() * 12_000);
  await sleep(Math.min(durationMs, 400 + Math.random() * 900));

  const blocked = Math.random() < 0.04;
  const passed = !blocked && Math.random() < bias;
  return {
    index: task.runIndex,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs,
    exitCode: blocked ? 1 : 0,
    assertions: [{ description: "simulated", pass: passed }],
    passed,
    stdout: "",
    stderr: blocked ? "rate limit (simulated)" : "",
    files: [],
    // Deterministic so projection == realized: the budget gate reserves a fixed
    // per-run estimate ($0.05 in mock), so the mock must realize exactly that or
    // reconciliation would reintroduce overshoot. Duration stays varied for the TUI.
    estimatedCostUsd: 0.05,
    infrastructureBlocked: blocked,
    infrastructureReason: blocked ? "agent runner rate limit" : undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initState(opts: OrchestratorOptions): DashboardState {
  const now = Date.now();
  const cells = new Map();
  const aggregates = new Map();
  for (const model of opts.models) {
    aggregates.set(model.id, {
      target: model,
      total: opts.targets.length * opts.runsPerCell,
      done: 0,
      passed: 0,
      evaluated: 0,
      blocked: 0,
      costUsd: 0,
      durationsMs: [],
    });
    for (const target of opts.targets) {
      cells.set(cellKey(model.id, target.name), {
        modelId: model.id,
        targetName: target.name,
        total: opts.runsPerCell,
        running: 0,
        results: [],
      });
    }
  }
  return {
    startedAt: now,
    now,
    models: opts.models,
    targets: opts.targets,
    cells,
    aggregates,
    activity: [],
    totalTasks: opts.models.length * opts.targets.length * opts.runsPerCell,
    completedTasks: 0,
    totalCostUsd: 0,
    budgetUsd: opts.budgetUsd,
    runsPerCell: opts.runsPerCell,
    haltedByBudget: false,
    finished: false,
    mock: opts.mock,
  };
}

/**
 * Run the full model × target × run matrix through a fixed-size worker pool,
 * mutating `state` in place and invoking `onUpdate` after each transition.
 * Returns the terminal state.
 */
export async function runDashboard(opts: OrchestratorOptions): Promise<DashboardState> {
  const state = initState(opts);
  const ping = () => {
    state.now = Date.now();
    opts.onUpdate?.(state);
  };

  const queue: Task[] = [];
  for (const model of opts.models) {
    for (const target of opts.targets) {
      for (let runIndex = 0; runIndex < opts.runsPerCell; runIndex++) {
        queue.push({ model, target, runIndex });
      }
    }
  }

  ping();

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < queue.length) {
      const task = queue[cursor++];
      const perRun = opts.mock ? 0.05 : task.target.setup.perRunBudgetUsd;

      if (state.totalCostUsd + perRun > state.budgetUsd) {
        state.haltedByBudget = true;
        continue; // drain the queue without spending past budget
      }
      // Reserve the projected cost synchronously — check + reserve run with no
      // intervening await, so they are atomic in the single-threaded loop and no
      // two workers can pass the gate on the same stale total. This makes
      // totalCostUsd <= budgetUsd hold for any concurrency. Reconciled to the
      // realized cost after the task completes (below).
      state.totalCostUsd += perRun;

      const cell = state.cells.get(cellKey(task.model.id, task.target.name))!;
      const agg = state.aggregates.get(task.model.id)!;
      cell.running++;
      agg.current = task.target.name;
      ping();

      const result = await executeTask(task, opts.mock);

      cell.running--;
      cell.results.push(result);
      agg.done++;
      agg.costUsd += result.estimatedCostUsd;
      agg.durationsMs.push(result.durationMs);
      if (result.infrastructureBlocked) {
        agg.blocked++;
      } else {
        agg.evaluated++;
        if (result.passed) agg.passed++;
      }
      if (agg.done >= agg.total) agg.current = undefined;

      state.totalCostUsd += result.estimatedCostUsd - perRun; // reconcile reserve to actual
      state.completedTasks++;
      const runStatus: CellStatus = result.infrastructureBlocked
        ? "blocked"
        : result.passed
          ? "pass"
          : "fail";
      state.activity.unshift({
        ts: Date.now(),
        modelLabel: task.model.label,
        targetName: task.target.name,
        runIndex: task.runIndex,
        status: runStatus,
        durationMs: result.durationMs,
      });
      if (state.activity.length > 50) state.activity.length = 50;
      ping();
    }
  };

  const pool = Math.max(1, Math.min(opts.concurrency, queue.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));

  state.finished = true;
  ping();
  return state;
}
