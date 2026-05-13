import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createTempProject, runClaude, runCodex } from "./runner.js";
import type { RunOptions } from "./runner.js";
import type { BenchAgent, SkillBenchSetup, SingleRunResult, SessionManifest, BenchConfig } from "./bench-types.js";
import type { RunResult } from "./types.js";
import {
  createSession,
  saveRunResult,
  updateManifestStatus,
  findResumeableSession,
} from "./bench-persistence.js";

const MAX_ARTIFACT_BYTES = 24_000;

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
  runAgent = runBenchAgent,
  createProject = createTempProject,
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

    const workDir = createProject();
    setup.setupProject(workDir);

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    const result = await runAgent(manifest.config.agent, {
      prompt: setup.prompt,
      workDir,
      maxBudgetUsd: setup.perRunBudgetUsd,
      timeoutMs: setup.timeoutMs,
    });

    const durationMs = Date.now() - t0;
    const infrastructureReason = classifyInfrastructureBlock(result);
    const infrastructureBlocked = Boolean(infrastructureReason);
    const assertions = infrastructureBlocked ? [] : setup.assertResult(result, { agent: manifest.config.agent });
    const output = collectQualityOutput(setup, result);
    const artifacts = collectRunArtifacts(setup, result);
    const qualityResult = !infrastructureBlocked && setup.qualityEvaluator
      ? setup.qualityEvaluator.evaluate(output)
      : undefined;
    const passed = !infrastructureBlocked && assertions.every((a) => a.pass);

    const runResult: SingleRunResult = {
      index,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      exitCode: result.exitCode,
      assertions,
      passed,
      stdout: result.stdout,
      stderr: result.stderr,
      files: result.files,
      artifacts,
      estimatedCostUsd: setup.perRunBudgetUsd,
      infrastructureBlocked,
      infrastructureReason,
      qualityResult,
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

function collectRunArtifacts(
  setup: SkillBenchSetup,
  result: RunResult,
): Record<string, string> | undefined {
  const paths = setup.qualityOutputPath
    ? [setup.qualityOutputPath]
    : result.files.filter((file) => /\.(md|txt|json|ya?ml)$/i.test(file)).slice(0, 5);

  const artifacts: Record<string, string> = {};
  for (const path of paths) {
    try {
      const content = readFileSync(join(result.workDir, path), "utf8");
      artifacts[path] = truncateArtifact(content);
    } catch {
      // Missing artifacts are already covered by setup assertions.
    }
  }

  return Object.keys(artifacts).length > 0 ? artifacts : undefined;
}

function truncateArtifact(content: string): string {
  if (Buffer.byteLength(content, "utf8") <= MAX_ARTIFACT_BYTES) return content;

  const suffix = "\n\n[artifact truncated for benchmark persistence]\n";
  return `${content.slice(0, MAX_ARTIFACT_BYTES - suffix.length)}${suffix}`;
}

function collectQualityOutput(setup: SkillBenchSetup, result: RunResult): string {
  if (setup.qualityOutputPath) {
    try {
      return readFileSync(join(result.workDir, setup.qualityOutputPath), "utf8");
    } catch {
      return `${result.stdout}\n${result.stderr}`;
    }
  }

  const fileOutput = result.files.map((file) => {
    try {
      return readFileSync(join(result.workDir, file), "utf8");
    } catch {
      return "";
    }
  });

  return [result.stdout, result.stderr, ...fileOutput].filter(Boolean).join("\n");
}

export function startOrResumeSession(
  setup: SkillBenchSetup,
  config: BenchConfig,
  resume = false,
): SessionManifest {
  if (!resume) {
    return createSession(config);
  }

  const existing = findResumeableSession(config.skill, config.agent);
  if (existing && canResumeSession(existing, config)) {
    updateManifestStatus(existing, "running");
    return existing;
  }
  return createSession(config);
}

export function canResumeSession(
  existing: SessionManifest,
  config: BenchConfig,
): boolean {
  return (
    existing.config.skill === config.skill &&
    existing.config.agent === config.agent &&
    existing.config.runs === config.runs &&
    existing.config.chunkSize === config.chunkSize &&
    existing.config.pauseSeconds === config.pauseSeconds &&
    existing.config.maxBudgetUsd === config.maxBudgetUsd &&
    existing.config.perRunBudgetUsd === config.perRunBudgetUsd &&
    existing.config.timeoutMs === config.timeoutMs
  );
}

function runBenchAgent(agent: BenchAgent, opts: RunOptions): Promise<RunResult> {
  return agent === "claude" ? runClaude(opts) : runCodex(opts);
}

function classifyInfrastructureBlock(result: RunResult): string | undefined {
  if (result.exitCode === 0) return undefined;

  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (
    output.includes("hit your limit") ||
    output.includes("rate limit") ||
    output.includes("rate_limit") ||
    output.includes("quota exceeded") ||
    output.includes("too many requests")
  ) {
    return "agent runner rate limit";
  }
  if (output.includes("exceeded usd budget")) {
    return "agent runner budget exceeded";
  }
  return undefined;
}
