#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { benchmarkCoverageMatrix, validateBenchmarkCoverage } from "./harness/bench-coverage.js";
import { supportedBenchScenarios } from "./harness/bench-setups.js";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

function valueFor(name: string, fallback?: string): string | undefined {
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : fallback;
}

function run(command: string, args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (args.has("--list-skills")) {
  for (const row of benchmarkCoverageMatrix()) {
    console.log(`${row.skill}\t${row.coverage_status}\t${row.setup_path ?? ""}`);
  }
  process.exit(0);
}

if (args.has("--list-scenarios")) {
  for (const scenario of supportedBenchScenarios()) {
    console.log(scenario);
  }
  process.exit(0);
}

const result = validateBenchmarkCoverage();
if (!result.ok) {
  for (const error of result.errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

if (args.has("--verify")) {
  run("pnpm", ["catalog:check"]);
  run("pnpm", ["bench:coverage"]);
  run("pnpm", ["test"]);
  process.exit(0);
}

const skill = valueFor("--skill");
const scenario = valueFor("--scenario");
if (!skill && !scenario) {
  console.log(`Benchmark coverage matrix valid (${benchmarkCoverageMatrix().length} skills).`);
  console.log("Pass --skill <name> or --scenario <name> to run the benchmark harness.");
  process.exit(0);
}

const agent = valueFor("--agent", "both")!;
const agents = agent === "both" ? ["claude", "codex"] : [agent];
const runs = valueFor("--runs", "3")!;
const chunkSize = valueFor("--chunk-size", runs)!;

for (const selectedAgent of agents) {
  if (selectedAgent !== "claude" && selectedAgent !== "codex") {
    console.error(`unknown agent "${selectedAgent}" (expected claude, codex, or both)`);
    process.exit(1);
  }
  run("pnpm", ["exec", "vitest", "run", "tests/layer4/bench.test.ts"], {
    BENCH_AGENT: selectedAgent,
    BENCH_RUNS: runs,
    BENCH_CHUNK_SIZE: chunkSize,
    ...(skill ? { BENCH_SKILL: skill } : {}),
    ...(scenario ? { BENCH_SCENARIO: scenario } : {}),
  });
}
