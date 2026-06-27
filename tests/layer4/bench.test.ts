import { describe, it, expect } from "vitest";
import type { BenchConfig } from "../harness/bench-types.js";
import { startOrResumeSession, runChunk } from "../harness/bench-runner.js";
import { writeReport } from "../harness/bench-report.js";
import {
  resolveBenchScenarioSetup,
  resolveBenchSetup,
  supportedBenchScenarios,
  supportedBenchSkills,
} from "../harness/bench-setups.js";

const scenario = process.env.BENCH_SCENARIO;
const skill = scenario ?? process.env.BENCH_SKILL ?? "design-system";
const agent = process.env.BENCH_AGENT === "codex" ? "codex" : "claude";
const runs = parseInt(process.env.BENCH_RUNS ?? "5", 10);
const chunkSize = parseInt(process.env.BENCH_CHUNK_SIZE ?? "5", 10);

describe(`bench: ${skill}`, () => {
  it(`runs ${runs} iterations and generates a report`, async () => {
    const setup = scenario ? resolveBenchScenarioSetup(scenario) : resolveBenchSetup(skill);
    const supported = scenario ? supportedBenchScenarios() : supportedBenchSkills();
    const label = scenario ? "scenario" : "skill";
    expect(setup, `Unknown ${label}: ${skill}. Supported ${label}s: ${supported.join(", ")}`).toBeDefined();

    const config: BenchConfig = {
      skill,
      agent,
      runs,
      chunkSize,
      pauseSeconds: 0,
      maxBudgetUsd: runs * setup.perRunBudgetUsd,
      perRunBudgetUsd: setup.perRunBudgetUsd,
      timeoutMs: setup.timeoutMs,
    };

    const manifest = startOrResumeSession(setup, config);
    const startIndex = manifest.completedRuns;

    const { manifest: updated, haltedByBudget } = await runChunk(
      setup,
      manifest,
      startIndex,
      Math.min(chunkSize, runs - startIndex),
    );

    const report = writeReport(updated);

    expect(report.totalRuns).toBeGreaterThan(0);
    expect(report.passRate).toBeGreaterThanOrEqual(0);
    expect(report.latency.p50).toBeGreaterThan(0);

    if (haltedByBudget) {
      console.log("Halted early due to budget cap.");
    }

    console.log(
      `Pass rate: ${(report.passRate * 100).toFixed(1)}% ` +
        `(${Math.round(report.passRate * report.evaluatedRuns)}/${report.evaluatedRuns} evaluated)`,
    );
    console.log(
      `Latency p50=${(report.latency.p50 / 1000).toFixed(1)}s ` +
        `p95=${(report.latency.p95 / 1000).toFixed(1)}s`,
    );
    console.log(`Cost: $${report.totalEstimatedCostUsd.toFixed(2)}`);
  });
});
