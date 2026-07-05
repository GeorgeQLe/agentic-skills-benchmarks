export interface BenchBudgetCandidate {
  label: string;
  runs: number;
  perRunBudgetUsd: number;
}

export interface BenchBudgetReservation extends BenchBudgetCandidate {
  reservedRuns: number;
  maxBudgetUsd: number;
}

export interface BenchBudgetPlan {
  reservations: BenchBudgetReservation[];
  skipped: BenchBudgetCandidate[];
  reservedBudgetUsd: number;
  remainingBudgetUsd: number;
}

const MONEY_PRECISION = 6;

function roundMoney(value: number): number {
  return Number(value.toFixed(MONEY_PRECISION));
}

export function reserveBenchmarkBudgets(
  candidates: BenchBudgetCandidate[],
  budgetUsd: number,
): BenchBudgetPlan {
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0) {
    throw new Error(`benchmark budget must be a non-negative number, got ${budgetUsd}`);
  }

  let remaining = budgetUsd;
  let reservedBudgetUsd = 0;
  const reservations: BenchBudgetReservation[] = [];
  const skipped: BenchBudgetCandidate[] = [];

  for (const candidate of candidates) {
    const runs = Math.max(0, Math.floor(candidate.runs));
    const perRunBudgetUsd = candidate.perRunBudgetUsd;

    if (!Number.isFinite(perRunBudgetUsd) || perRunBudgetUsd <= 0) {
      throw new Error(`${candidate.label} has invalid per-run budget ${perRunBudgetUsd}`);
    }

    const affordableRuns = Math.min(runs, Math.floor((remaining + 1e-9) / perRunBudgetUsd));
    if (affordableRuns <= 0) {
      skipped.push(candidate);
      continue;
    }

    const maxBudgetUsd = roundMoney(affordableRuns * perRunBudgetUsd);
    reservations.push({
      ...candidate,
      runs,
      reservedRuns: affordableRuns,
      maxBudgetUsd,
    });
    remaining = roundMoney(remaining - maxBudgetUsd);
    reservedBudgetUsd = roundMoney(reservedBudgetUsd + maxBudgetUsd);
  }

  return {
    reservations,
    skipped,
    reservedBudgetUsd,
    remainingBudgetUsd: roundMoney(remaining),
  };
}
