import type { SingleRunResult, SkillBenchSetup } from "../bench-types.js";
import type { ModelTarget } from "./model-matrix.js";

/** A bench target (skill or scenario) resolved to its runnable setup. */
export interface BenchTargetSpec {
  name: string;
  kind: "skill" | "scenario";
  setup: SkillBenchSetup;
}

export type CellStatus = "pending" | "running" | "pass" | "fail" | "blocked";

/** Aggregated state for one (model × target) grid cell. */
export interface CellState {
  modelId: string;
  targetName: string;
  total: number;
  running: number;
  results: SingleRunResult[];
}

/** Rolled-up state for one model row across all its targets. */
export interface ModelAggregate {
  target: ModelTarget;
  total: number;
  done: number;
  passed: number;
  evaluated: number;
  blocked: number;
  costUsd: number;
  durationsMs: number[];
  current?: string;
}

export interface ActivityEntry {
  ts: number;
  modelLabel: string;
  targetName: string;
  runIndex: number;
  status: CellStatus;
  durationMs: number;
}

export interface DashboardState {
  startedAt: number;
  now: number;
  models: ModelTarget[];
  targets: BenchTargetSpec[];
  cells: Map<string, CellState>;
  aggregates: Map<string, ModelAggregate>;
  activity: ActivityEntry[];
  totalTasks: number;
  completedTasks: number;
  totalCostUsd: number;
  budgetUsd: number;
  runsPerCell: number;
  haltedByBudget: boolean;
  finished: boolean;
  mock: boolean;
}

export function cellKey(modelId: string, targetName: string): string {
  return `${modelId}::${targetName}`;
}

export function passRate(agg: ModelAggregate): number {
  return agg.evaluated > 0 ? agg.passed / agg.evaluated : 0;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(rank, 0), sorted.length - 1)];
}

/** Derive the current status of a grid cell from its accumulated runs. */
export function cellStatus(cell: CellState): CellStatus {
  if (cell.running > 0) return "running";
  if (cell.results.length === 0) return "pending";
  const evaluated = cell.results.filter((r) => !r.infrastructureBlocked);
  if (evaluated.length === 0) return "blocked";
  return evaluated.every((r) => r.passed) ? "pass" : "fail";
}
