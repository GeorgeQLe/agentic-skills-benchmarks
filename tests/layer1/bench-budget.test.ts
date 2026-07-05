import { describe, expect, it } from "vitest";
import { reserveBenchmarkBudgets } from "../harness/bench-budget.js";

describe("reserveBenchmarkBudgets", () => {
  it("reserves whole run slots without exceeding the suite budget", () => {
    const plan = reserveBenchmarkBudgets(
      [
        { label: "skill:a:claude", runs: 3, perRunBudgetUsd: 1 },
        { label: "skill:b:claude", runs: 3, perRunBudgetUsd: 1 },
      ],
      4,
    );

    expect(plan.reservedBudgetUsd).toBe(4);
    expect(plan.remainingBudgetUsd).toBe(0);
    expect(plan.reservations).toEqual([
      { label: "skill:a:claude", runs: 3, perRunBudgetUsd: 1, reservedRuns: 3, maxBudgetUsd: 3 },
      { label: "skill:b:claude", runs: 3, perRunBudgetUsd: 1, reservedRuns: 1, maxBudgetUsd: 1 },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it("skips target-agent invocations when the remaining budget cannot pay for one run", () => {
    const plan = reserveBenchmarkBudgets(
      [
        { label: "skill:a:claude", runs: 2, perRunBudgetUsd: 1 },
        { label: "skill:b:claude", runs: 2, perRunBudgetUsd: 1 },
      ],
      1.5,
    );

    expect(plan.reservedBudgetUsd).toBe(1);
    expect(plan.remainingBudgetUsd).toBe(0.5);
    expect(plan.reservations.map((reservation) => reservation.label)).toEqual(["skill:a:claude"]);
    expect(plan.skipped.map((candidate) => candidate.label)).toEqual(["skill:b:claude"]);
  });

  it("rejects invalid budgets", () => {
    expect(() => reserveBenchmarkBudgets([], -1)).toThrow(/non-negative/);
    expect(() =>
      reserveBenchmarkBudgets([{ label: "bad", runs: 1, perRunBudgetUsd: 0 }], 1),
    ).toThrow(/invalid per-run budget/);
  });
});
