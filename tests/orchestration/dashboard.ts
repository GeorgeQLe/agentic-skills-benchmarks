import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AllowanceState } from "./budget.js";
import { snapshotDisplay } from "./budget.js";
import type { CampaignState } from "./campaign.js";
import type { CampaignReport } from "./report.js";
import { campaignRoot } from "./paths.js";
import type { PublisherState } from "./publisher.js";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function duration(ms: number): string {
  return ms >= 60_000 ? `${(ms / 60_000).toFixed(1)}m` : `${(ms / 1000).toFixed(1)}s`;
}

export function renderOrchestrationDashboard(
  state: CampaignState,
  report: CampaignReport,
  allowance?: AllowanceState,
  width = 120,
): string {
  const line = "─".repeat(Math.max(40, Math.min(width, 160)));
  const top = report.leaderboard.slice(0, 10).map((row, index) =>
    `${String(index + 1).padStart(2)} ${row.assignmentId.padEnd(26)} pass ${pct(row.passRate).padStart(6)} score ${row.averageScore.toFixed(1).padStart(5)} latency ${duration(row.averageLatencyMs).padStart(7)} tokens ${String(row.totalTokens).padStart(8)} ${row.paretoEfficient ? "◆" : " "}`,
  );
  const factors = Object.entries(report.factors).flatMap(([factor, rows]) => [
    `${factor}: ${rows.slice(0, 4).map((row) => `${row.level} ${pct(row.passRate)}/${row.averageScore.toFixed(1)}`).join(" | ")}`,
  ]);
  const taskGrid = Object.entries(report.tasks).slice(0, 12).map(([task, metrics]) =>
    `${task.padEnd(38)} ${String(metrics.runs).padStart(5)} ${pct(metrics.passRate).padStart(7)} ${metrics.averageScore.toFixed(1).padStart(6)}`,
  );
  const statuses = Object.values(state.runs).reduce<Record<string, number>>((counts, run) => {
    counts[run.status] = (counts[run.status] ?? 0) + 1;
    return counts;
  }, {});
  const active = Object.values(state.runs).filter((run) => run.status === "running" || run.status === "reserved").slice(0, 12);
  const chunks = Object.values(state.chunks).sort((a, b) => a.ordinal - b.ordinal).slice(0, 12);
  let publisher: PublisherState | undefined;
  try { publisher = JSON.parse(readFileSync(resolve(campaignRoot(state.id), "publisher", "state.json"), "utf8")) as PublisherState; }
  catch { publisher = undefined; }
  const remaining = allowance
    ? `Reserved OpenAI ${allowance.reservations.filter((entry) => entry.state === "reserved").reduce((sum, entry) => sum + entry.openaiUnits, 0).toFixed(2)} / Anthropic ${allowance.reservations.filter((entry) => entry.state === "reserved").reduce((sum, entry) => sum + entry.anthropicUnits, 0).toFixed(2)} estimated units`
    : "Allowance ledger not initialized";
  return [
    `SOL ORCHESTRATION BENCHMARK  ${state.id}  ${report.completedRuns}/${report.expectedRuns}`,
    line,
    "RANKED CONFIGURATION LEADERBOARD  ◆ Pareto-efficient",
    ...(top.length ? top : ["No judged runs yet."]),
    line,
    "FACTOR & MODEL MATRICES",
    ...(factors.length ? factors : ["No factor observations yet."]),
    line,
    "TASK × CONFIGURATION COMPLETION GRID (task aggregate)",
    "task                                    runs    pass  score",
    ...(taskGrid.length ? taskGrid : ["No completed task cells yet."]),
    line,
    `ACTIVE SOL & WORKERS  concurrency ${state.concurrency} / worker pool ${state.workerConcurrency}`,
    ...(active.length ? active.map((run) => `${run.run.id} ${run.status} attempt ${run.attempts}`) : ["No active processes."]),
    `State: ${Object.entries(statuses).map(([status, count]) => `${status}=${count}`).join(" ") || "empty"}`,
    line,
    "SUBSCRIPTION CONSUMPTION & RESERVATIONS",
    snapshotDisplay(state.snapshot),
    remaining,
    `Estimated subscription allowance consumed ${report.totals.allowanceUnits.toFixed(3)} units. Not API spend or exact USD cost.`,
    line,
    "QUALITY, LATENCY & TOKEN EFFICIENCY",
    `input ${report.totals.inputTokens} cached ${report.totals.cachedInputTokens} output ${report.totals.outputTokens} reasoning ${report.totals.reasoningTokens} wall ${duration(report.totals.latencyMs)}`,
    line,
    "JUDGE AGREEMENT & TIE-BREAK ACTIVITY",
    `agreement ${pct(report.judges.observedAgreement)} kappa ${report.judges.kappa.toFixed(3)} tie-breaks ${pct(report.judges.tieBreakRate)} GPT avg ${report.judges.gptAverageScore.toFixed(1)} Claude avg ${report.judges.claudeAverageScore.toFixed(1)}`,
    line,
    "INFRASTRUCTURE FAILURES, RETRIES & BLOCKED CELLS",
    `blocked ${statuses.blocked ?? 0} pending ${statuses.pending ?? 0} halted ${state.haltedReason ?? "no"}`,
    line,
    "CHUNK UPLOAD, REMOTE VERIFICATION & CLEANUP",
    ...(chunks.length ? chunks.map((chunk) => {
      const progress = publisher?.chunks[chunk.chunkId];
      const retry = progress?.nextRetryAt ? ` retry ${progress.nextRetryAt}` : "";
      return `${String(chunk.ordinal).padStart(4)} ${chunk.chunkId} ${chunk.completedRuns}/${chunk.expectedRuns} ${progress?.state ?? chunk.archiveState}${retry}`;
    }) : ["No chunk archive state yet."]),
    line,
    "DRILL-DOWN",
    "pnpm bench:orchestration report --campaign <id> --run <run-id>",
    "Shows prompts, patch, tests, worker traces, judge evidence; archived chunks are fetched lazily after cleanup.",
  ].join("\n");
}

export function loadAllowanceState(campaignRoot: string): AllowanceState | undefined {
  try { return JSON.parse(readFileSync(resolve(campaignRoot, "allowance-ledger.json"), "utf8")) as AllowanceState; }
  catch { return undefined; }
}
