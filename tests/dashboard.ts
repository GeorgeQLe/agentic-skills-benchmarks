#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveBenchTarget,
  resolveBenchScenarioTarget,
} from "./harness/bench-setups.js";
import {
  DEFAULT_MODEL_MATRIX,
  selectModelTargets,
} from "./harness/dashboard/model-matrix.js";
import { runLiveDashboard } from "./harness/dashboard/live.js";
import { passRate, type BenchTargetSpec, type DashboardState } from "./harness/dashboard/state.js";

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs);

function valueFor(name: string, fallback?: string): string | undefined {
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : fallback;
}

const DEFAULT_SKILLS = [
  "investigate",
  "plan-phase",
  "session-triage",
  "ship",
  "design-system",
];

function printHelp(): void {
  console.log(`SkillBench dashboard — run the benchmark suite across GPT & Claude models.

Usage:
  pnpm bench:dashboard [options]

Options:
  --models <ids>       Comma-separated model ids (default: all). See --list-models.
  --skills <names>     Comma-separated skills   (default: ${DEFAULT_SKILLS.join(",")})
  --scenarios <names>  Comma-separated scenarios (optional)
  --runs <n>           Runs per (model × target) cell (default: 2)
  --concurrency <n>    Max simultaneous agent runs (default: 4)
  --budget <usd>       Hard USD ceiling for the whole matrix (default: 25)
  --mock               Simulate runs (no live agents) to preview the dashboard
  --no-live            Plain line log instead of an in-place TUI (CI / piping)
  --list-models        Print the model matrix and exit
  --help

Examples:
  pnpm bench:dashboard --mock
  pnpm bench:dashboard --models claude-opus,gpt-5-codex --skills investigate,ship --runs 3
`);
}

function listModels(): void {
  for (const m of DEFAULT_MODEL_MATRIX) {
    console.log(`${m.id.padEnd(16)} ${m.cli.padEnd(7)} ${m.model.padEnd(14)} ${m.label}`);
  }
}

function resolveTargets(): BenchTargetSpec[] {
  const specs: BenchTargetSpec[] = [];
  const skills = (valueFor("--skills") ?? DEFAULT_SKILLS.join(","))
    .split(",").map((s) => s.trim()).filter(Boolean);
  const scenarios = (valueFor("--scenarios") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  for (const skill of skills) {
    const resolved = resolveBenchTarget(skill);
    if (!resolved?.setup) {
      console.error(`skill "${skill}" is not runnable (${resolved?.coverageStatus ?? "unknown"}); skipping`);
      continue;
    }
    specs.push({ name: skill, kind: "skill", setup: resolved.setup });
  }
  for (const scenario of scenarios) {
    const resolved = resolveBenchScenarioTarget(scenario);
    if (!resolved?.setup) {
      console.error(`scenario "${scenario}" is not runnable; skipping`);
      continue;
    }
    specs.push({ name: scenario, kind: "scenario", setup: resolved.setup });
  }
  return specs;
}

function persistSummary(state: DashboardState): void {
  const dir = resolve(import.meta.dirname, "benchmarks/dashboard");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const summary = {
    generatedAt: new Date().toISOString(),
    mock: state.mock,
    durationMs: state.now - state.startedAt,
    totalTasks: state.totalTasks,
    completedTasks: state.completedTasks,
    totalCostUsd: Number(state.totalCostUsd.toFixed(4)),
    haltedByBudget: state.haltedByBudget,
    targets: state.targets.map((t) => t.name),
    models: state.models.map((m) => {
      const agg = state.aggregates.get(m.id)!;
      return {
        id: m.id,
        label: m.label,
        cli: m.cli,
        model: m.model,
        done: agg.done,
        total: agg.total,
        passed: agg.passed,
        evaluated: agg.evaluated,
        blocked: agg.blocked,
        passRate: Number(passRate(agg).toFixed(4)),
        costUsd: Number(agg.costUsd.toFixed(4)),
      };
    }),
  };
  const path = resolve(dir, `dashboard-${stamp}.json`);
  writeFileSync(path, JSON.stringify(summary, null, 2));
  console.log(`\nsummary written to ${path}`);
}

async function main(): Promise<void> {
  if (flags.has("--help")) return printHelp();
  if (flags.has("--list-models")) return listModels();

  const mock = flags.has("--mock");
  let models;
  try {
    models = selectModelTargets(valueFor("--models"));
  } catch (err) {
    console.error(String((err as Error).message));
    process.exit(1);
  }

  const targets = resolveTargets();
  if (targets.length === 0) {
    console.error("no runnable targets selected (see --skills / --scenarios)");
    process.exit(1);
  }

  const runsPerCell = Number(valueFor("--runs", "2"));
  const concurrency = Number(valueFor("--concurrency", "4"));
  const budgetUsd = Number(valueFor("--budget", "25"));

  if (!mock && process.env.LIVE_AGENT_TESTS !== "1") {
    console.error(
      "Live agent runs are disabled. Set LIVE_AGENT_TESTS=1 to spend on real\n" +
        "claude/codex runs, or pass --mock to preview the dashboard.",
    );
    process.exit(1);
  }

  const state = await runLiveDashboard({
    models,
    targets,
    runsPerCell,
    concurrency,
    budgetUsd,
    mock,
    live: flags.has("--no-live") ? false : undefined,
  });

  persistSummary(state);
}

main().catch((err) => {
  process.stdout.write("\x1b[?25h");
  console.error(err);
  process.exit(1);
});
