import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveBenchScenarioTarget, resolveBenchTarget } from "../bench-setups.js";
import { DEFAULT_MODEL_MATRIX, selectModelTargets } from "../dashboard/model-matrix.js";
import { runLiveDashboard } from "../dashboard/live.js";
import { passRate, type BenchTargetSpec, type DashboardState } from "../dashboard/state.js";
import { loadBenchmarkCatalogMetadata, parseReleaseChannel } from "../skills-catalog.js";
import { csvFlag, helpText, parseNonNegativeUsdFlag, parsePositiveIntegerFlag, valueFor } from "./args.js";
import type { CommandIo } from "./bench-command.js";

export const DEFAULT_DASHBOARD_SKILLS = [
  "investigate",
  "plan-phase",
  "session-triage",
  "ship",
  "design-system",
];

export interface DashboardCommandOptions {
  io?: CommandIo;
  runDashboard?: typeof runLiveDashboard;
  persistSummary?: typeof persistDashboardSummary;
}

function defaultIo(): CommandIo {
  return { stdout: process.stdout, stderr: process.stderr };
}

function writeLine(stream: Pick<NodeJS.WriteStream, "write">, text = ""): void {
  stream.write(`${text}\n`);
}

export function dashboardHelpText(command = "pnpm bench:dashboard"): string {
  return helpText(
    "SkillBench dashboard - run the benchmark suite across GPT, Claude & Grok models.",
    `  ${command} [options]`,
    [
      "  --models <ids>       Comma-separated model ids (default: all). See --list-models.",
      `  --skills <names>     Comma-separated skills   (default: ${DEFAULT_DASHBOARD_SKILLS.join(",")})`,
      "  --scenarios <names>  Comma-separated scenarios (optional)",
      "  --runs <n>           Runs per (model x target) cell (default: 2)",
      "  --concurrency <n>    Max simultaneous agent runs (default: 4)",
      "  --budget <usd>       Hard USD ceiling for the whole matrix (default: 25)",
      "  --release-channel <release|canary>  Catalog release channel (default: release; env: SKILLBENCH_RELEASE_CHANNEL)",
      "  --mock               Simulate runs (no live agents) to preview the dashboard",
      "  --no-live            Plain line log instead of an in-place TUI (CI / piping)",
      "  --list-models        Print the model matrix and exit",
      "  --help",
    ],
    [
      `  ${command} --mock`,
      `  ${command} --models claude-opus,gpt-5-codex --skills investigate,ship --runs 3`,
    ],
  );
}

export function listModels(io: CommandIo = defaultIo()): void {
  for (const m of DEFAULT_MODEL_MATRIX) {
    writeLine(io.stdout, `${m.id.padEnd(16)} ${m.cli.padEnd(7)} ${m.model.padEnd(14)} ${m.label}`);
  }
}

export function resolveDashboardTargets(rawArgs: string[], io: CommandIo = defaultIo()): BenchTargetSpec[] {
  const specs: BenchTargetSpec[] = [];
  const skills = csvFlag(rawArgs, "--skills");
  const selectedSkills = skills.length > 0 ? skills : DEFAULT_DASHBOARD_SKILLS;
  const scenarios = csvFlag(rawArgs, "--scenarios");

  for (const skill of selectedSkills) {
    const resolved = resolveBenchTarget(skill);
    if (!resolved?.setup) {
      writeLine(io.stderr, `skill "${skill}" is not runnable (${resolved?.coverageStatus ?? "unknown"}); skipping`);
      continue;
    }
    specs.push({ name: skill, kind: "skill", setup: resolved.setup });
  }
  for (const scenario of scenarios) {
    const resolved = resolveBenchScenarioTarget(scenario);
    if (!resolved?.setup) {
      writeLine(io.stderr, `scenario "${scenario}" is not runnable; skipping`);
      continue;
    }
    specs.push({ name: scenario, kind: "scenario", setup: resolved.setup });
  }
  return specs;
}

export function persistDashboardSummary(state: DashboardState, io: CommandIo = defaultIo()): string {
  const dir = resolve(import.meta.dirname, "../../benchmarks/dashboard");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const summary = {
    generatedAt: new Date().toISOString(),
    ...state.catalogMetadata,
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
  writeLine(io.stdout, `\nsummary written to ${path}`);
  return path;
}

export async function runDashboardCommand(
  rawArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
  opts: DashboardCommandOptions = {},
): Promise<number> {
  const io = opts.io ?? defaultIo();
  const runDashboard = opts.runDashboard ?? runLiveDashboard;
  const persistSummary = opts.persistSummary ?? persistDashboardSummary;
  const flags = new Set(rawArgs);

  try {
    if (flags.has("--help")) {
      writeLine(io.stdout, dashboardHelpText());
      return 0;
    }
    if (flags.has("--list-models")) {
      listModels(io);
      return 0;
    }

    const models = selectModelTargets(valueFor(rawArgs, "--models"));
    const targets = resolveDashboardTargets(rawArgs, io);
    if (targets.length === 0) {
      writeLine(io.stderr, "no runnable targets selected (see --skills / --scenarios)");
      return 1;
    }

    const runsPerCell = parsePositiveIntegerFlag(rawArgs, "--runs", "2");
    const concurrency = parsePositiveIntegerFlag(rawArgs, "--concurrency", "4");
    const budgetUsd = parseNonNegativeUsdFlag(rawArgs, "--budget", "25");
    const releaseChannel = parseReleaseChannel(
      valueFor(rawArgs, "--release-channel", env.SKILLBENCH_RELEASE_CHANNEL),
      "--release-channel",
    );
    const catalogMetadata = loadBenchmarkCatalogMetadata(releaseChannel);
    const mock = flags.has("--mock");

    if (!mock && env.LIVE_AGENT_TESTS !== "1") {
      writeLine(
        io.stderr,
        "Live agent runs are disabled. Set LIVE_AGENT_TESTS=1 to spend on real\n" +
          "claude/codex/grok runs, or pass --mock to preview the dashboard.",
      );
      return 1;
    }

    const state = await runDashboard({
      models,
      targets,
      runsPerCell,
      concurrency,
      budgetUsd,
      mock,
      catalogMetadata,
      live: flags.has("--no-live") ? false : undefined,
    });
    persistSummary(state, io);
    return 0;
  } catch (err) {
    io.stdout.write("\x1b[?25h");
    writeLine(io.stderr, (err as Error).message);
    return 1;
  }
}
