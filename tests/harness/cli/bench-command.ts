import { spawnSync } from "node:child_process";
import { reserveBenchmarkBudgets } from "../bench-budget.js";
import { benchmarkCoverageMatrix, validateBenchmarkCoverage } from "../bench-coverage.js";
import {
  resolveBenchScenarioTarget,
  resolveBenchTarget,
  supportedBenchScenarios,
} from "../bench-setups.js";
import { isBenchAgent, type BenchAgent, type SkillBenchSetup } from "../bench-types.js";
import { parseReleaseChannel } from "../skills-catalog.js";
import {
  csvFlag,
  helpText,
  parseNonNegativeUsdFlag,
  parsePositiveIntegerFlag,
  valueFor,
} from "./args.js";

export interface CommandIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export interface SpawnInvocation {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export type SpawnRunner = (command: string, args: string[], env?: Record<string, string>) => number;

export interface BenchCommandOptions {
  io?: CommandIo;
  spawn?: SpawnRunner;
}

function defaultIo(): CommandIo {
  return { stdout: process.stdout, stderr: process.stderr };
}

function writeLine(stream: Pick<NodeJS.WriteStream, "write">, text = ""): void {
  stream.write(`${text}\n`);
}

export function benchHelpText(command = "pnpm bench"): string {
  return helpText("SkillBench runner", `  ${command} --skill <name> [options]\n  ${command} --skills <a,b,c> [options]\n  ${command} --scenario <name> [options]`, [
    "  --agent <agent>       claude, codex, or both (default: both)",
    "  --runs <n>            Runs per selected target/agent (default: 3)",
    "  --chunk-size <n>      Runs per child invocation (default: --runs)",
    "  --budget <usd>        Hard USD ceiling for this invocation (default: 5; env: BENCH_BUDGET_USD)",
    "  --release-channel <release|canary>  Catalog release channel (default: release; env: SKILLBENCH_RELEASE_CHANNEL)",
    "  --list-skills         Print benchmark coverage matrix",
    "  --list-scenarios      Print benchmark scenarios",
    "  --verify              Run catalog, coverage, and layer1 tests",
    "  --help",
  ]);
}

function defaultSpawn(command: string, args: string[], env: Record<string, string> = {}): number {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

export function runBenchCommand(
  rawArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
  opts: BenchCommandOptions = {},
): number {
  const io = opts.io ?? defaultIo();
  const spawn = opts.spawn ?? defaultSpawn;
  const flags = new Set(rawArgs);

  try {
    if (flags.has("--help")) {
      writeLine(io.stdout, benchHelpText());
      return 0;
    }

    if (flags.has("--list-skills")) {
      for (const row of benchmarkCoverageMatrix()) {
        writeLine(io.stdout, `${row.skill}\t${row.coverage_status}\t${row.setup_path ?? ""}`);
      }
      return 0;
    }

    if (flags.has("--list-scenarios")) {
      for (const scenario of supportedBenchScenarios()) writeLine(io.stdout, scenario);
      return 0;
    }

    const result = validateBenchmarkCoverage();
    if (!result.ok) {
      for (const error of result.errors) writeLine(io.stderr, `ERROR: ${error}`);
      return 1;
    }

    if (flags.has("--verify")) {
      for (const [command, args] of [
        ["pnpm", ["catalog:check"]],
        ["pnpm", ["bench:coverage"]],
        ["pnpm", ["test"]],
      ] as const) {
        const code = spawn(command, [...args]);
        if (code !== 0) return code;
      }
      return 0;
    }

    const selectedSkills = [
      ...csvFlag(rawArgs, "--skills"),
      ...(valueFor(rawArgs, "--skill") ? [valueFor(rawArgs, "--skill")!] : []),
    ];
    const selectedScenarios = [
      ...csvFlag(rawArgs, "--scenarios"),
      ...(valueFor(rawArgs, "--scenario") ? [valueFor(rawArgs, "--scenario")!] : []),
    ];

    if (selectedSkills.length === 0 && selectedScenarios.length === 0) {
      writeLine(io.stdout, `Benchmark coverage matrix valid (${benchmarkCoverageMatrix().length} skills).`);
      writeLine(
        io.stdout,
        "Pass --skill <name>, --skills <a,b>, --scenario <name>, or --scenarios <a,b> to run the benchmark harness.",
      );
      return 0;
    }

    const agent = valueFor(rawArgs, "--agent", "both")!;
    const agents = (agent === "both" ? ["claude", "codex"] : [agent]) as BenchAgent[];
    const runs = parsePositiveIntegerFlag(rawArgs, "--runs", "3");
    const chunkSize = parsePositiveIntegerFlag(rawArgs, "--chunk-size", String(runs));
    const budgetUsd = parseNonNegativeUsdFlag(rawArgs, "--budget", env.BENCH_BUDGET_USD ?? "5");
    const releaseChannel = parseReleaseChannel(
      valueFor(rawArgs, "--release-channel", env.SKILLBENCH_RELEASE_CHANNEL),
      "--release-channel",
    );

    for (const selectedAgent of agents) {
      if (!isBenchAgent(selectedAgent)) {
        writeLine(io.stderr, `unknown agent "${selectedAgent}" (expected claude, codex, or both)`);
        return 1;
      }
    }

    interface SelectedTarget {
      kind: "skill" | "scenario";
      name: string;
      setup: SkillBenchSetup;
    }

    const targets: SelectedTarget[] = [];
    for (const skill of selectedSkills) {
      const resolved = resolveBenchTarget(skill);
      if (!resolved?.setup) {
        writeLine(io.stderr, `skill "${skill}" is not runnable (${resolved?.coverageStatus ?? "unknown"})`);
        return 1;
      }
      targets.push({ kind: "skill", name: skill, setup: resolved.setup });
    }
    for (const scenario of selectedScenarios) {
      const resolved = resolveBenchScenarioTarget(scenario);
      if (!resolved?.setup) {
        writeLine(io.stderr, `scenario "${scenario}" is not runnable`);
        return 1;
      }
      targets.push({ kind: "scenario", name: scenario, setup: resolved.setup });
    }

    const candidates = targets.flatMap((target) =>
      agents.map((selectedAgent) => ({
        label: `${target.kind}:${target.name}:${selectedAgent}`,
        runs,
        perRunBudgetUsd: target.setup.perRunBudgetUsd,
      })),
    );
    const budgetPlan = reserveBenchmarkBudgets(candidates, budgetUsd);

    if (budgetPlan.reservations.length === 0) {
      writeLine(
        io.stderr,
        `Budget $${budgetUsd.toFixed(2)} cannot pay for one selected run. ` +
          `Smallest selected per-run budget is $${Math.min(...candidates.map((c) => c.perRunBudgetUsd)).toFixed(2)}.`,
      );
      return 1;
    }

    writeLine(
      io.stdout,
      `Benchmark budget: reserved $${budgetPlan.reservedBudgetUsd.toFixed(2)} / ` +
        `$${budgetUsd.toFixed(2)} across ${budgetPlan.reservations.length} target-agent invocation(s).`,
    );
    if (budgetPlan.skipped.length > 0) {
      writeLine(
        io.stdout,
        `Budget skipped ${budgetPlan.skipped.length} target-agent invocation(s): ` +
          budgetPlan.skipped.map((candidate) => candidate.label).join(", "),
      );
    }

    const reservationByLabel = new Map(budgetPlan.reservations.map((reservation) => [reservation.label, reservation]));
    for (const target of targets) {
      for (const selectedAgent of agents) {
        const label = `${target.kind}:${target.name}:${selectedAgent}`;
        const reservation = reservationByLabel.get(label);
        if (!reservation) continue;

        const code = spawn("pnpm", ["exec", "vitest", "run", "tests/layer4/bench.test.ts"], {
          BENCH_AGENT: selectedAgent,
          BENCH_RUNS: String(reservation.reservedRuns),
          BENCH_CHUNK_SIZE: String(Math.min(chunkSize, reservation.reservedRuns)),
          BENCH_MAX_BUDGET_USD: String(reservation.maxBudgetUsd),
          SKILLBENCH_RELEASE_CHANNEL: releaseChannel,
          ...(target.kind === "skill" ? { BENCH_SKILL: target.name } : { BENCH_SCENARIO: target.name }),
        });
        if (code !== 0) return code;
      }
    }

    return 0;
  } catch (err) {
    writeLine(io.stderr, (err as Error).message);
    return 1;
  }
}
