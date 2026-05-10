import { describe, it, expect } from "vitest";
import { designSystemSetup } from "./setups/design-system.setup.js";
import { designSystemDraftstonkSetup } from "./setups/design-system-draftstonk.setup.js";
import type { SkillBenchSetup, BenchConfig } from "../harness/bench-types.js";
import { startOrResumeSession, runChunk } from "../harness/bench-runner.js";
import { writeReport } from "../harness/bench-report.js";

const SETUPS: Record<string, SkillBenchSetup> = {
  "design-system": designSystemSetup,
  "design-system-draftstonk": designSystemDraftstonkSetup,
};

const skill = process.env.BENCH_SKILL ?? "design-system";
const runs = parseInt(process.env.BENCH_RUNS ?? "5", 10);
const chunkSize = parseInt(process.env.BENCH_CHUNK_SIZE ?? "5", 10);

describe(`bench: ${skill}`, () => {
  it(`runs ${runs} iterations and generates a report`, async () => {
    const setup = SETUPS[skill];
    expect(setup, `Unknown skill: ${skill}`).toBeDefined();

    const config: BenchConfig = {
      skill,
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
        `(${Math.round(report.passRate * report.totalRuns)}/${report.totalRuns})`,
    );
    console.log(
      `Latency p50=${(report.latency.p50 / 1000).toFixed(1)}s ` +
        `p95=${(report.latency.p95 / 1000).toFixed(1)}s`,
    );
    console.log(`Cost: $${report.totalEstimatedCostUsd.toFixed(2)}`);
  });
});
