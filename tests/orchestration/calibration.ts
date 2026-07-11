import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CANDIDATE_OUTPUT_SCHEMA, JUDGE_OUTPUT_SCHEMA, WORKER_OUTPUT_SCHEMA, claudeWorkerSpec, codexCandidateSpec, codexWorkerSpec, createDenyShimDirectory, judgeSpec, type ProviderCommandSpec } from "./adapters.js";
import { enforceCalibrationAllowanceCap, readUsageSnapshot, validatePercentageSnapshot, type CalibrationProfile } from "./budget.js";
import { hashFile } from "./canonical.js";
import { materializeFixture } from "./corpus.js";
import { loadScenarios, MODEL_PINS } from "./design.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { executeProvider, hasQuotaWarning, type ParsedUsage, type ProviderExecution } from "./process.js";
import type { AllowanceSnapshotProvider } from "./pitwall.js";
import { PITWALL_PROVIDER_WINDOWS, PITWALL_SOURCE_KIND } from "./types.js";
import type { Effort, UsageEstimate } from "./types.js";

export interface CalibrationSample {
  provider: "openai" | "anthropic";
  model: string;
  effort: Effort;
  role: "orchestrator" | "worker" | "judge";
  taskClass: string;
  rawWeight: number;
  allowanceUnits?: number;
}

export interface CalibrationObservations {
  schemaVersion: 2;
  candidateExecutions: 3;
  workerCalls: 12;
  judgeCalls: 6;
  samples: CalibrationSample[];
}

interface CollectionCheckpoint {
  schemaVersion: 1;
  status: "collecting" | "complete" | "invalid";
  beforeSnapshotHash: string;
  startedAt: string;
  updatedAt: string;
  samples: CalibrationSample[];
  error?: string;
  failure?: CalibrationFailureDiagnostic;
}

export type CalibrationFailureKind = "nonzero_exit" | "signal" | "timeout" | "output_limit" | "direct_model_violation" | "quota_warning" | "malformed_usage" | "missing_output";

export interface CalibrationFailureDiagnostic {
  kind: CalibrationFailureKind;
  provider: ProviderCommandSpec["provider"];
  role: ProviderCommandSpec["role"];
  model: string;
  exitCode: number;
  signal: NodeJS.Signals | null;
  durationMs: number;
  guardFlags: { timedOut: boolean; outputLimited: boolean; directModelViolation: boolean; quotaWarning: boolean };
  stderrTail: string;
}

export class CalibrationExecutionError extends Error {
  constructor(public readonly diagnostic: CalibrationFailureDiagnostic) {
    super(`calibration ${diagnostic.kind} for ${diagnostic.provider}/${diagnostic.role}/${diagnostic.model}`);
    this.name = "CalibrationExecutionError";
  }
}

export type CalibrationExecutor = (spec: ProviderCommandSpec) => Promise<ProviderExecution>;

export interface CandidateDiagnosticResult {
  schemaVersion: 1;
  status: "complete" | "invalid";
  outputPath: string;
  failure?: CalibrationFailureDiagnostic;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = resolve(dirname(path), `.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  renameSync(temp, path);
}

function rawWeight(usage: ParsedUsage): number {
  for (const value of Object.values(usage)) if (!Number.isFinite(value) || value < 0) throw new Error("provider returned malformed usage");
  if (usage.calls < 1) throw new Error("provider returned malformed usage without a call record");
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const value = (uncached + usage.cachedInputTokens * 0.25 + usage.outputTokens * 2 + usage.reasoningTokens) / 1_000 + usage.calls * 0.001;
  if (!Number.isFinite(value) || value <= 0) throw new Error("provider returned zero or malformed usage");
  return Number(value.toFixed(6));
}

function schema(path: string, value: object): string {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  return path;
}

export function sanitizeDiagnosticText(value: string, limit = 4096): string {
  const redacted = value
    .replace(/\b(?:sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,})\b/g, "[REDACTED]")
    .replace(/((?:api[-_]?key|authorization|token|secret|password)\s*[:=]\s*)(?:bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]");
  return redacted.length <= limit ? redacted : redacted.slice(-limit);
}

export function classifyExecutionFailure(spec: ProviderCommandSpec, result: ProviderExecution): CalibrationFailureDiagnostic | undefined {
  const quota = hasQuotaWarning(result);
  const kind: CalibrationFailureKind | undefined = quota ? "quota_warning"
    : result.timedOut ? "timeout"
      : result.outputLimited ? "output_limit"
        : result.directModelViolation ? "direct_model_violation"
          : result.signal ? "signal"
            : result.exitCode !== 0 ? "nonzero_exit"
              : undefined;
  if (!kind) return undefined;
  return { kind, provider: spec.provider, role: spec.role, model: spec.model, exitCode: result.exitCode, signal: result.signal, durationMs: result.durationMs, guardFlags: { timedOut: result.timedOut, outputLimited: result.outputLimited, directModelViolation: result.directModelViolation === true, quotaWarning: quota }, stderrTail: sanitizeDiagnosticText(result.stderr) };
}

function assertExecution(spec: ProviderCommandSpec, result: ProviderExecution): void {
  const diagnostic = classifyExecutionFailure(spec, result);
  if (diagnostic) throw new CalibrationExecutionError(diagnostic);
}

function anthropicStructuredReport(stdout: string): string {
  try {
    const value = JSON.parse(stdout) as { structured_output?: unknown };
    if (value.structured_output === undefined) throw new Error();
    return `${JSON.stringify(value.structured_output, null, 2)}\n`;
  } catch { throw new Error("Anthropic worker returned no structured report"); }
}

/** Runs exactly one candidate with calibration-identical boundaries and synthetic worker evidence. */
export async function diagnoseCalibrationCandidate(input: { workRoot: string; reportPath: string; execute?: CalibrationExecutor }): Promise<CandidateDiagnosticResult> {
  if (existsSync(input.reportPath)) throw new Error("candidate diagnostic report already exists; use a fresh path");
  const scenario = loadScenarios().find((row) => row.variant === "challenge" && row.language === "typescript" && row.capability === "debugging");
  if (!scenario) throw new Error("representative calibration scenario is missing");
  const fixture = resolve(input.workRoot, "fixture");
  const artifacts = resolve(input.workRoot, "artifacts");
  mkdirSync(artifacts, { recursive: true });
  materializeFixture(resolve(EXPERIMENT_ROOT, scenario.fixture), fixture, "seed", false);
  const deny = createDenyShimDirectory(input.workRoot);
  const candidateSchema = schema(resolve(artifacts, "candidate.schema.json"), CANDIDATE_OUTPUT_SCHEMA);
  const outputPath = resolve(artifacts, "candidate.json");
  const reports = ["sol", "terra", "luna", "opus-4.8"].map((worker, index) => JSON.stringify({ facts: [`Representative ${worker} report for isolated boundary validation.`], inferences: [], risks: [], recommendations: ["Inspect the fixture and solve the task directly."], verification: [`worker evidence ${index + 1}`] }));
  const prompt = `${scenario.prompt}\n\nUse all four independent worker reports:\n${reports.map((item, index) => `WORKER ${index + 1}:\n${item}`).join("\n\n")}`;
  const spec = codexCandidateSpec({ cwd: fixture, prompt, effort: "xhigh", schemaPath: candidateSchema, outputPath, denyShimDir: deny });
  const execution = await (input.execute ?? executeProvider)(spec);
  let failure = classifyExecutionFailure(spec, execution);
  if (!failure) {
    try { rawWeight(execution.usage); }
    catch { failure = { kind: "malformed_usage", provider: spec.provider, role: spec.role, model: spec.model, exitCode: execution.exitCode, signal: execution.signal, durationMs: execution.durationMs, guardFlags: { timedOut: execution.timedOut, outputLimited: execution.outputLimited, directModelViolation: execution.directModelViolation === true, quotaWarning: false }, stderrTail: sanitizeDiagnosticText(execution.stderr) }; }
  }
  if (!failure && !existsSync(outputPath)) {
    failure = { kind: "missing_output", provider: spec.provider, role: spec.role, model: spec.model, exitCode: execution.exitCode, signal: execution.signal, durationMs: execution.durationMs, guardFlags: { timedOut: execution.timedOut, outputLimited: execution.outputLimited, directModelViolation: execution.directModelViolation === true, quotaWarning: false }, stderrTail: sanitizeDiagnosticText(execution.stderr) };
  }
  const result: CandidateDiagnosticResult = { schemaVersion: 1, status: failure ? "invalid" : "complete", outputPath, ...(failure ? { failure } : {}) };
  atomicJson(input.reportPath, result);
  if (failure) throw new CalibrationExecutionError(failure);
  return result;
}

export async function collectCalibration(input: {
  beforePath: string;
  afterPath: string;
  observationsPath: string;
  checkpointPath: string;
  workRoot: string;
  outputPath: string;
  snapshotProvider: AllowanceSnapshotProvider;
  execute?: CalibrationExecutor;
  now?: () => number;
}): Promise<CalibrationProfile> {
  const now = input.now ?? Date.now;
  if (existsSync(input.checkpointPath)) {
    const prior = JSON.parse(readFileSync(input.checkpointPath, "utf8")) as CollectionCheckpoint;
    if (prior.status === "collecting" || (prior.status === "complete" && !existsSync(input.outputPath))) {
      prior.status = "invalid";
      prior.error = "previous collection was interrupted";
      prior.updatedAt = new Date(now()).toISOString();
      atomicJson(input.checkpointPath, prior);
    }
    throw new Error("calibration checkpoint already exists; use a new attempt path so allowance windows cannot be mixed");
  }
  const before = await input.snapshotProvider.snapshot();
  validatePercentageSnapshot(before, { now: now(), maxAgeMs: 5 * 60_000, minimumResetLeadMs: 2 * 60 * 60_000, requirePitwall: true });
  atomicJson(input.beforePath, before);
  const checkpoint: CollectionCheckpoint = { schemaVersion: 1, status: "collecting", beforeSnapshotHash: hashFile(input.beforePath), startedAt: new Date(now()).toISOString(), updatedAt: new Date(now()).toISOString(), samples: [] };
  atomicJson(input.checkpointPath, checkpoint);
  const execute = input.execute ?? executeProvider;
  try {
    const scenarios = loadScenarios();
    const selected = [
      scenarios.find((row) => row.variant === "challenge" && row.language === "typescript" && row.capability === "debugging"),
      scenarios.find((row) => row.variant === "challenge" && row.language === "python" && row.capability === "ambiguous-intent"),
      scenarios.find((row) => row.variant === "challenge" && row.language === "go" && row.capability === "pushback"),
    ];
    if (selected.some((row) => !row)) throw new Error("representative calibration scenarios are missing");
    for (const [taskOrdinal, scenario] of selected.entries()) {
      const taskRoot = resolve(input.workRoot, `task-${taskOrdinal}`);
      const fixture = resolve(taskRoot, "fixture");
      const artifacts = resolve(taskRoot, "artifacts");
      mkdirSync(artifacts, { recursive: true });
      materializeFixture(resolve(EXPERIMENT_ROOT, scenario!.fixture), fixture, "seed", false);
      const deny = createDenyShimDirectory(taskRoot);
      const workerSchema = schema(resolve(artifacts, "worker.schema.json"), WORKER_OUTPUT_SCHEMA);
      const candidateSchema = schema(resolve(artifacts, "candidate.schema.json"), CANDIDATE_OUTPUT_SCHEMA);
      const judgeSchema = schema(resolve(artifacts, "judge.schema.json"), JUDGE_OUTPUT_SCHEMA);
      const evidence: string[] = [];
      const invoke = async (spec: ProviderCommandSpec, outputPath?: string) => {
        const result = await execute(spec);
        assertExecution(spec, result);
        let weight: number;
        try { weight = rawWeight(result.usage); }
        catch {
          throw new CalibrationExecutionError({ kind: "malformed_usage", provider: spec.provider, role: spec.role, model: spec.model, exitCode: result.exitCode, signal: result.signal, durationMs: result.durationMs, guardFlags: { timedOut: result.timedOut, outputLimited: result.outputLimited, directModelViolation: result.directModelViolation === true, quotaWarning: false }, stderrTail: sanitizeDiagnosticText(result.stderr) });
        }
        checkpoint.samples.push({ provider: spec.provider, model: spec.model, effort: spec.role === "judge" ? "high" : "xhigh", role: spec.role === "candidate" ? "orchestrator" : spec.role, taskClass: `${scenario!.language}:${scenario!.capability}`, rawWeight: weight });
        checkpoint.updatedAt = new Date(now()).toISOString();
        atomicJson(input.checkpointPath, checkpoint);
        if (outputPath && existsSync(outputPath)) return readFileSync(outputPath, "utf8");
        return result.stdout;
      };
      for (const worker of ["sol", "terra", "luna"] as const) {
        const output = resolve(artifacts, `worker-${worker}.json`);
        evidence.push(await invoke(codexWorkerSpec({ worker, cwd: fixture, prompt: `Analyze this task without editing files.\n${scenario!.prompt}`, effort: "xhigh", schemaPath: workerSchema, outputPath: output, denyShimDir: deny }), output));
      }
      const anthropicRaw = await invoke(claudeWorkerSpec({ cwd: fixture, prompt: `Analyze this task without editing files.\n${scenario!.prompt}`, effort: "xhigh", denyShimDir: deny }));
      const anthropicReport = anthropicStructuredReport(anthropicRaw);
      writeFileSync(resolve(artifacts, "worker-opus-4.8.json"), anthropicReport, { flag: "wx" });
      evidence.push(anthropicReport);
      const candidateOutput = resolve(artifacts, "candidate.json");
      const candidatePrompt = `${scenario!.prompt}\n\nUse all four independent worker reports:\n${evidence.map((item, index) => `WORKER ${index + 1}:\n${item}`).join("\n\n")}`;
      const candidate = await invoke(codexCandidateSpec({ cwd: fixture, prompt: candidatePrompt, effort: "xhigh", schemaPath: candidateSchema, outputPath: candidateOutput, denyShimDir: deny }), candidateOutput);
      const judgePrompt = `Independently judge this candidate against the task.\nTASK:\n${scenario!.prompt}\nCANDIDATE:\n${candidate}`;
      for (const family of ["gpt", "claude"] as const) {
        const output = resolve(artifacts, `judge-${family}.json`);
        await invoke(judgeSpec({ family, cwd: fixture, prompt: judgePrompt, schemaPath: judgeSchema, outputPath: output, denyShimDir: deny }), output);
      }
    }
    if (checkpoint.samples.length !== 21) throw new Error(`calibration must produce exactly 21 samples, got ${checkpoint.samples.length}`);
    checkpoint.status = "complete";
    checkpoint.updatedAt = new Date(now()).toISOString();
    atomicJson(input.checkpointPath, checkpoint);
    const observations: CalibrationObservations = { schemaVersion: 2, candidateExecutions: 3, workerCalls: 12, judgeCalls: 6, samples: checkpoint.samples };
    atomicJson(input.observationsPath, observations);
    const after = await input.snapshotProvider.snapshot();
    validatePercentageSnapshot(after, { now: now(), maxAgeMs: 5 * 60_000, requirePitwall: true });
    atomicJson(input.afterPath, after);
    const profile = buildCalibrationProfile({ beforePath: input.beforePath, afterPath: input.afterPath, observationsPath: input.observationsPath, now: now() });
    atomicJson(input.outputPath, profile);
    return profile;
  } catch (error) {
    checkpoint.status = "invalid";
    checkpoint.error = (error as Error).message;
    if (error instanceof CalibrationExecutionError) checkpoint.failure = error.diagnostic;
    checkpoint.updatedAt = new Date(now()).toISOString();
    atomicJson(input.checkpointPath, checkpoint);
    throw error;
  }
}

export function buildCalibrationProfile(input: { beforePath: string; afterPath: string; observationsPath: string; now?: number }): CalibrationProfile {
  const validationNow = input.now ?? Date.now();
  const before = readUsageSnapshot(input.beforePath, validationNow);
  const after = readUsageSnapshot(input.afterPath, validationNow);
  validatePercentageSnapshot(before, { now: validationNow, requirePitwall: true });
  validatePercentageSnapshot(after, { now: validationNow, requirePitwall: true });
  if (Date.parse(after.capturedAt) <= Date.parse(before.capturedAt)) throw new Error("post-calibration snapshot must be newer than the pre-calibration snapshot");
  for (const provider of ["openai", "anthropic"] as const) {
    const reset = Date.parse(before.providers[provider].resetAt!);
    if (Date.parse(after.capturedAt) >= reset || after.providers[provider].resetAt !== before.providers[provider].resetAt) throw new Error("calibration snapshots cross a provider reset");
  }
  const observations = JSON.parse(readFileSync(input.observationsPath, "utf8")) as CalibrationObservations;
  if (observations.schemaVersion !== 2 || observations.candidateExecutions !== 3 || observations.workerCalls !== 12 || observations.judgeCalls !== 6 || observations.samples.length !== 21) throw new Error("calibration observations must contain the exact 3/12/6 call matrix");
  const taskClasses = ["typescript:debugging", "python:ambiguous-intent", "go:pushback"];
  for (const taskClass of taskClasses) {
    const samples = observations.samples.filter((sample) => sample.taskClass === taskClass);
    const expected = [
      ["openai", MODEL_PINS.workers.sol, "xhigh", "worker"],
      ["openai", MODEL_PINS.workers.terra, "xhigh", "worker"],
      ["openai", MODEL_PINS.workers.luna, "xhigh", "worker"],
      ["anthropic", MODEL_PINS.workers["opus-4.8"], "xhigh", "worker"],
      ["openai", MODEL_PINS.orchestrator, "xhigh", "orchestrator"],
      ["openai", MODEL_PINS.judges.gpt, "high", "judge"],
      ["anthropic", MODEL_PINS.judges.claude, "high", "judge"],
    ].map((parts) => parts.join("\0")).sort();
    const actual = samples.map((sample) => [sample.provider, sample.model, sample.effort, sample.role].join("\0")).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`calibration call matrix mismatch for ${taskClass}`);
  }
  const raw = { openai: 0, anthropic: 0 };
  for (const sample of observations.samples) {
    if (!Number.isFinite(sample.rawWeight) || sample.rawWeight <= 0) throw new Error("calibration sample raw weight must be positive");
    raw[sample.provider] += sample.rawWeight;
  }
  if (raw.openai <= 0 || raw.anthropic <= 0) throw new Error("calibration requires nonzero usage from both providers");
  const actualDrops = {
    openai: before.providers.openai.remainingPercent! - after.providers.openai.remainingPercent!,
    anthropic: before.providers.anthropic.remainingPercent! - after.providers.anthropic.remainingPercent!,
  };
  if (actualDrops.openai < 0 || actualDrops.anthropic < 0) throw new Error("remaining allowance increased during calibration without a reset");
  const censored = { openai: actualDrops.openai === 0, anthropic: actualDrops.anthropic === 0 };
  const drops = { openai: censored.openai ? 1 : actualDrops.openai, anthropic: censored.anthropic ? 1 : actualDrops.anthropic };
  enforceCalibrationAllowanceCap(before, drops.openai, drops.anthropic);
  const factors = { openai: drops.openai / raw.openai, anthropic: drops.anthropic / raw.anthropic };
  const groups = new Map<string, CalibrationSample[]>();
  for (const sample of observations.samples) {
    const normalized = { ...sample, allowanceUnits: sample.rawWeight * factors[sample.provider] };
    const key = [sample.provider, sample.model, sample.effort, sample.role, sample.taskClass].join("\0");
    groups.set(key, [...(groups.get(key) ?? []), normalized]);
  }
  const estimates: UsageEstimate[] = [...groups.values()].map((samples) => {
    const first = samples[0];
    const units = samples.map((sample) => sample.allowanceUnits!).sort((a, b) => a - b);
    const mean = units.reduce((sum, value) => sum + value, 0) / units.length;
    return { provider: first.provider, model: first.model, effort: first.effort, role: first.role, taskClass: first.taskClass, meanUnits: Number(mean.toFixed(6)), upperUnits: Number((units.at(-1)! * 1.2).toFixed(6)), sampleSize: units.length, confidence: censored[first.provider] ? 0.5 : units.length >= 3 ? 0.95 : 0.7 };
  });
  return { schemaVersion: 2, createdAt: new Date().toISOString(), beforeSnapshot: input.beforePath, afterSnapshot: input.afterPath, candidateExecutions: 3, judgeCalls: 6, estimates, allowanceKinds: { openai: "remainingPercent", anthropic: "remainingPercent" }, conversionFactors: factors, rawWeights: raw, observedDrops: actualDrops, accountedDrops: drops, censored, displayResolutionUpperBound: 1, snapshotHashes: { before: hashFile(input.beforePath), after: hashFile(input.afterPath) }, groupUpperMargin: 0.2, sourceLock: { sourceKind: PITWALL_SOURCE_KIND, providerWindows: PITWALL_PROVIDER_WINDOWS } };
}
