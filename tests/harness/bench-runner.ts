import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createTempProject, runClaude, runCodex, runGrok } from "./runner.js";
import type { RunOptions } from "./runner.js";
import type { BenchAgent, SkillBenchSetup, SingleRunResult, SessionManifest, BenchConfig, BenchmarkCatalogMetadata } from "./bench-types.js";
import type { RunResult } from "./types.js";
import {
  createSession,
  saveRunResult,
  updateManifestStatus,
  findResumeableSession,
} from "./bench-persistence.js";

const MAX_ARTIFACT_BYTES = 24_000;

// Opt-in quality gating, mirroring LIVE_AGENT_TESTS. When enabled, a run must
// clear its qualityEvaluator rubric in addition to its assertions. Default
// (unset) preserves assertion-only pass/fail, so rubric false-fails can be
// fixed before anyone flips this on.
export function qualityGatingEnabled(): boolean {
  return process.env.BENCH_GATE_ON_QUALITY === "1";
}

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
    setup.setupProject(workDir, { index, agent: manifest.config.agent });

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    const result = await runAgent(manifest.config.agent, {
      prompt: setup.prompt,
      workDir,
      maxBudgetUsd: setup.perRunBudgetUsd,
      timeoutMs: setup.timeoutMs,
    });

    const durationMs = Date.now() - t0;
    const runResult = buildRunResult(setup, manifest.config.agent, result, {
      index,
      startedAt,
      durationMs,
    });

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

/**
 * Evaluate a single completed agent run into a persisted `SingleRunResult`.
 * Extracted from `runChunk` so the live dashboard orchestrator scores runs
 * through the exact same assertion + quality-gate logic (single source of
 * truth for pass/fail), rather than reimplementing it.
 */
export function buildRunResult(
  setup: SkillBenchSetup,
  agent: BenchAgent,
  result: RunResult,
  meta: { index: number; startedAt: string; durationMs: number },
): SingleRunResult {
  const infrastructureReason = classifyInfrastructureBlock(result);
  const infrastructureBlocked = Boolean(infrastructureReason);
  const assertions = infrastructureBlocked ? [] : setup.assertResult(result, { agent });
  const output = collectQualityOutput(setup, result);
  const artifacts = collectRunArtifacts(setup, result);
  const qualityResult = !infrastructureBlocked && setup.qualityEvaluator
    ? setup.qualityEvaluator.evaluate(output)
    : undefined;
  // An empty (non-infra-blocked) assertions array must NOT vacuously pass —
  // [].every(...) is true. A setup that produced no assertions is a defect.
  const assertionsPassed = !infrastructureBlocked && assertions.length > 0 && assertions.every((a) => a.pass);
  const qualityGatePassed = !qualityGatingEnabled() || (qualityResult?.passed ?? true);
  const passed = assertionsPassed && qualityGatePassed;

  return {
    index: meta.index,
    startedAt: meta.startedAt,
    completedAt: new Date().toISOString(),
    durationMs: meta.durationMs,
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
}

function collectRunArtifacts(
  setup: SkillBenchSetup,
  result: RunResult,
): Record<string, string> | undefined {
  const paths = qualityOutputPaths(setup)
    ?? result.files.filter((file) => /\.(md|txt|json|ya?ml|html?)$/i.test(file)).slice(0, 8);

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
  const paths = qualityOutputPaths(setup);
  if (paths) {
    const fileOutput = paths.map((path) => {
      try {
        return [
          `\n--- BEGIN ${path} ---`,
          readFileSync(join(result.workDir, path), "utf8"),
          `--- END ${path} ---`,
        ].join("\n");
      } catch {
        return "";
      }
    }).filter(Boolean);

    // A declared qualityOutputPath that produced no file means the agent never
    // wrote the required artifact. Score against an empty string rather than
    // stdout+stderr, so agent chatter can never satisfy fact/pattern criteria.
    return fileOutput.length > 0 ? fileOutput.join("\n") : "";
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

function qualityOutputPaths(setup: SkillBenchSetup): string[] | undefined {
  const paths = [
    setup.qualityOutputPath,
    ...(setup.qualityOutputPaths ?? []),
  ].filter((path): path is string => Boolean(path));
  return paths.length > 0 ? [...new Set(paths)] : undefined;
}

export function startOrResumeSession(
  setup: SkillBenchSetup,
  config: BenchConfig,
  metadata: BenchmarkCatalogMetadata,
  resume = false,
): SessionManifest {
  if (!resume) {
    return createSession(config, metadata);
  }

  const existing = findResumeableSession(config.skill, config.agent);
  if (existing && canResumeSession(existing, config)) {
    updateManifestStatus(existing, "running");
    return existing;
  }
  return createSession(config, metadata);
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
  if (agent === "claude") return runClaude(opts);
  if (agent === "codex") return runCodex(opts);
  return runGrok(opts);
}

export function classifyInfrastructureBlock(result: RunResult): string | undefined {
  // Only a non-zero exit can be an infrastructure block. Scan STDERR (and the
  // runner-injected timeout sentinel) rather than combined output: a genuine
  // failure whose STDOUT merely discusses "rate limit"/"connection closed"
  // must not be silently dropped from evaluatedRuns (which inflates passRate).
  if (result.exitCode === 0) return undefined;
  const stderr = (result.stderr ?? "").toLowerCase();
  const has = (...needles: string[]) => needles.some((needle) => stderr.includes(needle));

  if (has("hit your limit", "rate limit", "rate_limit", "quota exceeded", "too many requests")) {
    return "agent runner rate limit";
  }
  if (has("exceeded usd budget")) {
    return "agent runner budget exceeded";
  }
  if (has("could not process image")) {
    return "agent runner image processing error";
  }
  if (has("agent runner timed out") || (result.exitCode === 143 && !result.stdout.trim())) {
    return "agent runner timeout";
  }
  if (has(
    "connectionrefused",
    "unable to connect to api",
    "failed to connect to websocket",
    "failed to lookup address information",
    "socket connection was closed unexpectedly",
    "connection closed mid-response",
    "stream disconnected before completion",
    "http/request failed",
    "transport channel closed",
  )) {
    return "agent runner connection failure";
  }
  return undefined;
}
