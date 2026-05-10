import { rmSync } from "node:fs";
import { createTempProject, runClaude } from "./runner.js";
import type { SkillBenchSetup, SingleRunResult, SessionManifest, BenchConfig } from "./bench-types.js";
import {
  createSession,
  saveRunResult,
  updateManifestStatus,
  findResumeableSession,
} from "./bench-persistence.js";

export interface ChunkResult {
  manifest: SessionManifest;
  runs: SingleRunResult[];
  haltedByBudget: boolean;
}

export async function runChunk(
  setup: SkillBenchSetup,
  manifest: SessionManifest,
  startIndex: number,
  count: number,
): Promise<ChunkResult> {
  const runs: SingleRunResult[] = [];
  let haltedByBudget = false;

  const chunkRecord = {
    chunkIndex: manifest.chunks.length,
    startedAt: new Date().toISOString(),
    completedAt: "",
    runIndices: [] as number[],
  };

  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    if (index >= manifest.config.runs) break;

    const projected =
      manifest.totalEstimatedCostUsd + setup.perRunBudgetUsd;
    if (projected > manifest.config.maxBudgetUsd) {
      haltedByBudget = true;
      break;
    }

    const workDir = createTempProject();
    setup.setupProject(workDir);

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    const result = await runClaude({
      prompt: setup.prompt,
      workDir,
      maxBudgetUsd: setup.perRunBudgetUsd,
      timeoutMs: setup.timeoutMs,
    });

    const durationMs = Date.now() - t0;
    const assertions = setup.assertResult(result);
    const passed = assertions.every((a) => a.pass);

    const runResult: SingleRunResult = {
      index,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      exitCode: result.exitCode,
      assertions,
      passed,
      stdout: result.stdout,
      files: result.files,
      estimatedCostUsd: setup.perRunBudgetUsd,
    };

    saveRunResult(manifest, runResult);
    runs.push(runResult);
    chunkRecord.runIndices.push(index);

    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }

  chunkRecord.completedAt = new Date().toISOString();
  manifest.chunks.push(chunkRecord);

  if (manifest.completedRuns >= manifest.config.runs || haltedByBudget) {
    updateManifestStatus(manifest, haltedByBudget ? "aborted" : "completed");
  } else {
    updateManifestStatus(manifest, "paused");
  }

  return { manifest, runs, haltedByBudget };
}

export function startOrResumeSession(
  setup: SkillBenchSetup,
  config: BenchConfig,
): SessionManifest {
  const existing = findResumeableSession(config.skill);
  if (existing) {
    updateManifestStatus(existing, "running");
    return existing;
  }
  return createSession(config);
}
