import { describe, it, expect } from "vitest";
import {
  DEFAULT_MODEL_MATRIX,
  selectModelTargets,
} from "../harness/dashboard/model-matrix.js";
import { runDashboard } from "../harness/dashboard/orchestrator.js";
import { passRate, type BenchTargetSpec } from "../harness/dashboard/state.js";
import type { SkillBenchSetup } from "../harness/bench-types.js";

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
});
