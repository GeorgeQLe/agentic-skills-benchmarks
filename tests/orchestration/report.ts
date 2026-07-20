import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CampaignState } from "./campaign.js";
import type { ExecutionResult } from "./runner.js";
import type { Assignment } from "./types.js";
import { agreement, scoreTotal } from "./judges.js";
import { loadAssignments, loadPilotRows } from "./scheduler.js";
import { REFERENCE_FACTORS } from "./design.js";

export interface ConfigurationAggregate {
  assignmentId: string;
  runs: number;
  passed: number;
  passRate: number;
  averageScore: number;
  averageLatencyMs: number;
  totalTokens: number;
  tokenEfficiency: number;
  estimatedAllowanceUnits: number;
  tieBreaks: number;
  infrastructureFailures: number;
  paretoEfficient: boolean;
  status: "ranked" | "screened";
}

export interface CampaignReport {
  schemaVersion: 1 | 2;
  generatedAt: string;
  campaignId: string;
  completedRuns: number;
  expectedRuns: number;
  leaderboard: ConfigurationAggregate[];
  stage1?: { metrics: CampaignState["shortlistDecision"] extends infer T ? T : never; selectedIds: string[]; eliminatedIds: string[] };
  factors: Record<string, Array<{ level: string; runs: number; passRate: number; averageScore: number }>>;
  tasks: Record<string, { runs: number; passRate: number; averageScore: number }>;
  judges: {
    comparedRuns: number;
    observedAgreement: number;
    kappa: number;
    tieBreakRate: number;
    gptAverageScore: number;
    claudeAverageScore: number;
  };
  totals: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    allowanceUnits: number;
    latencyMs: number;
  };
}

export function loadExecutionResults(campaignRoot: string): ExecutionResult[] {
  const byId = new Map<string, ExecutionResult>();
  const compactPath = resolve(campaignRoot, "compact-results.jsonl");
  if (existsSync(compactPath)) {
    for (const line of readFileSync(compactPath, "utf8").split("\n").filter(Boolean)) {
      const result = JSON.parse(line) as ExecutionResult;
      byId.set(result.run.id, result);
    }
  }
  const runsRoot = resolve(campaignRoot, "runs");
  if (!existsSync(runsRoot)) return [...byId.values()];
  for (const runId of readdirSync(runsRoot).sort()) {
    const path = resolve(runsRoot, runId, "result.json");
    if (!existsSync(path) || !statSync(path).isFile()) continue;
    const result = JSON.parse(readFileSync(path, "utf8")) as ExecutionResult;
    if (result.run.id !== runId) throw new Error(`result ownership mismatch in ${runId}`);
    byId.set(result.run.id, result);
  }
  return [...byId.values()].sort((a, b) => a.run.id.localeCompare(b.run.id));
}

export function persistCompactResults(campaignRoot: string, results: ExecutionResult[]): string {
  const path = resolve(campaignRoot, "compact-results.jsonl");
  const compact = results.map((result) => ({
    schemaVersion: result.schemaVersion,
    run: result.run,
    assignmentId: result.assignmentId,
    scenarioId: result.scenarioId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    passed: result.passed,
    score: result.score,
    tieBreakUsed: result.tieBreakUsed,
    workerCalls: result.workerCalls,
    candidateCalls: result.candidateCalls,
    judgeCalls: result.judgeCalls,
    usage: result.usage,
    judges: result.judges,
    attemptRoot: result.attemptRoot,
  }));
  writeFileSync(path, `${compact.map((result) => JSON.stringify(result)).join("\n")}\n`);
  return path;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resultTokens(result: ExecutionResult): number {
  return result.usage.openai.inputTokens + result.usage.openai.outputTokens + result.usage.openai.reasoningTokens
    + result.usage.anthropic.inputTokens + result.usage.anthropic.outputTokens + result.usage.anthropic.reasoningTokens;
}

function resultAllowance(result: ExecutionResult): number {
  return result.usage.openaiUnits + result.usage.anthropicUnits;
}

function markPareto(rows: ConfigurationAggregate[]): void {
  for (const candidate of rows) {
    candidate.paretoEfficient = !rows.some((other) =>
      other.assignmentId !== candidate.assignmentId
      && other.passRate >= candidate.passRate
      && other.averageScore >= candidate.averageScore
      && other.averageLatencyMs <= candidate.averageLatencyMs
      && other.totalTokens <= candidate.totalTokens
      && (
        other.passRate > candidate.passRate
        || other.averageScore > candidate.averageScore
        || other.averageLatencyMs < candidate.averageLatencyMs
        || other.totalTokens < candidate.totalTokens
      ),
    );
  }
}

export function buildCampaignReport(state: CampaignState, results: ExecutionResult[]): CampaignReport {
  const analysisResults = results.filter((result) => !result.run.planFirst);
  const groups = new Map<string, ExecutionResult[]>();
  for (const result of analysisResults) {
    const group = groups.get(result.assignmentId) ?? [];
    group.push(result);
    groups.set(result.assignmentId, group);
  }
  const leaderboard: ConfigurationAggregate[] = [...groups.entries()].map(([assignmentId, runs]) => {
    const totalTokens = runs.reduce((sum, result) => sum + resultTokens(result), 0);
    const averageScore = average(runs.map((result) => result.score));
    return {
      assignmentId,
      runs: runs.length,
      passed: runs.filter((result) => result.passed).length,
      passRate: runs.filter((result) => result.passed).length / runs.length,
      averageScore,
      averageLatencyMs: average(runs.map((result) => result.durationMs)),
      totalTokens,
      tokenEfficiency: totalTokens === 0 ? 0 : averageScore / totalTokens * 1_000,
      estimatedAllowanceUnits: runs.reduce((sum, result) => sum + resultAllowance(result), 0),
      tieBreaks: runs.filter((result) => result.tieBreakUsed).length,
      infrastructureFailures: 0,
      paretoEfficient: false,
      status: (state.designVersion === 2 && state.kind === "pilot" && state.shortlistDecision && !state.shortlistDecision.selectedIds.includes(assignmentId) ? "screened" : "ranked") as "screened" | "ranked",
    };
  }).sort((left, right) => right.passRate - left.passRate || right.averageScore - left.averageScore || left.averageLatencyMs - right.averageLatencyMs);
  markPareto(leaderboard.filter((row) => row.status === "ranked"));
  leaderboard.sort((a, b) => (a.status === "ranked" ? 0 : 1) - (b.status === "ranked" ? 0 : 1) || b.passRate - a.passRate || b.averageScore - a.averageScore);

  const assignmentMap = new Map(loadAssignments().map((assignment) => [assignment.id, assignment]));
  for (const row of loadPilotRows()) {
    assignmentMap.set(row.id, { schemaVersion: 1, id: row.id, ordinal: row.ordinal, ...(row.factors ?? REFERENCE_FACTORS) });
  }
  const factorKeys: Array<keyof Pick<Assignment, "roster" | "topology" | "agents" | "skills" | "solEffort" | "workerEffort">> = [
    "roster", "topology", "agents", "skills", "solEffort", "workerEffort",
  ];
  const factors: CampaignReport["factors"] = {};
  for (const key of factorKeys) {
    const levels = new Map<string, ExecutionResult[]>();
    for (const result of results) {
      const assignment = assignmentMap.get(result.assignmentId);
      if (!assignment) continue;
      const level = Array.isArray(assignment[key]) ? (assignment[key] as string[]).join("+") : String(assignment[key]);
      const group = levels.get(level) ?? [];
      group.push(result);
      levels.set(level, group);
    }
    factors[key] = [...levels.entries()].map(([level, runs]) => ({
      level,
      runs: runs.length,
      passRate: runs.filter((result) => result.passed).length / runs.length,
      averageScore: average(runs.map((result) => result.score)),
    })).sort((a, b) => b.passRate - a.passRate || b.averageScore - a.averageScore);
  }

  const taskGroups = new Map<string, ExecutionResult[]>();
  for (const result of results) {
    const group = taskGroups.get(result.scenarioId) ?? [];
    group.push(result);
    taskGroups.set(result.scenarioId, group);
  }
  const tasks = Object.fromEntries([...taskGroups.entries()].map(([task, runs]) => [task, {
    runs: runs.length,
    passRate: runs.filter((result) => result.passed).length / runs.length,
    averageScore: average(runs.map((result) => result.score)),
  }]));
  const compared = results.filter((result) => result.judges.length >= 2);
  const agreementResult = compared.length > 0
    ? agreement(compared.map((result) => result.judges[0].pass), compared.map((result) => result.judges[1].pass))
    : { observed: 0, kappa: 0 };
  const totals = results.reduce((sum, result) => ({
    inputTokens: sum.inputTokens + result.usage.openai.inputTokens + result.usage.anthropic.inputTokens,
    cachedInputTokens: sum.cachedInputTokens + result.usage.openai.cachedInputTokens + result.usage.anthropic.cachedInputTokens,
    outputTokens: sum.outputTokens + result.usage.openai.outputTokens + result.usage.anthropic.outputTokens,
    reasoningTokens: sum.reasoningTokens + result.usage.openai.reasoningTokens + result.usage.anthropic.reasoningTokens,
    allowanceUnits: sum.allowanceUnits + resultAllowance(result),
    latencyMs: sum.latencyMs + result.durationMs,
  }), { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, allowanceUnits: 0, latencyMs: 0 });
  return {
    schemaVersion: state.designVersion === 2 ? 2 : 1,
    generatedAt: new Date().toISOString(),
    campaignId: state.id,
    completedRuns: results.length,
    expectedRuns: Object.keys(state.runs).length,
    leaderboard,
    stage1: state.shortlistDecision ? { metrics: state.shortlistDecision, selectedIds: state.shortlistDecision.selectedIds, eliminatedIds: state.shortlistDecision.eliminatedIds } : undefined,
    factors,
    tasks,
    judges: {
      comparedRuns: compared.length,
      observedAgreement: agreementResult.observed,
      kappa: agreementResult.kappa,
      tieBreakRate: results.length === 0 ? 0 : results.filter((result) => result.tieBreakUsed).length / results.length,
      gptAverageScore: average(compared.map((result) => scoreTotal(result.judges[0]))),
      claudeAverageScore: average(compared.map((result) => scoreTotal(result.judges[1]))),
    },
    totals,
  };
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeCampaignReport(root: string, report: CampaignReport): { json: string; csv: string; markdown: string } {
  const dir = resolve(root, "reports");
  mkdirSync(dir, { recursive: true });
  const json = resolve(dir, "aggregate.json");
  const csv = resolve(dir, "leaderboard.csv");
  const markdown = resolve(dir, "report.md");
  writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
  const headers = ["rank", "assignmentId", "runs", "passed", "passRate", "averageScore", "averageLatencyMs", "totalTokens", "tokenEfficiency", "estimatedAllowanceUnits", "tieBreaks", "paretoEfficient"];
  writeFileSync(csv, `${headers.join(",")}\n${report.leaderboard.map((row, index) => [index + 1, ...headers.slice(1).map((key) => row[key as keyof ConfigurationAggregate])].map(csvCell).join(",")).join("\n")}\n`);
  const table = report.leaderboard.slice(0, 20).map((row, index) =>
    `| ${index + 1} | ${row.assignmentId} | ${(row.passRate * 100).toFixed(1)}% | ${row.averageScore.toFixed(1)} | ${(row.averageLatencyMs / 1000).toFixed(1)}s | ${row.totalTokens} | ${row.paretoEfficient ? "yes" : ""} |`,
  );
  writeFileSync(markdown, [
    `# Sol orchestration campaign ${report.campaignId}`,
    "",
    `Completed ${report.completedRuns} / ${report.expectedRuns} immutable candidate executions.`,
    "",
    "Allowance consumption is an estimated subscription allowance measure, not API spend or exact USD cost.",
    "",
    "| Rank | Configuration | Pass rate | Score | Latency | Tokens | Pareto |",
    "|---:|---|---:|---:|---:|---:|:---:|",
    ...table,
    "",
    `Mandatory-judge observed agreement: ${(report.judges.observedAgreement * 100).toFixed(1)}%; kappa ${report.judges.kappa.toFixed(3)}; tie-break rate ${(report.judges.tieBreakRate * 100).toFixed(1)}%.`,
    "",
  ].join("\n"));
  return { json, csv, markdown };
}
