import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CANDIDATE_OUTPUT_SCHEMA,
  JUDGE_OUTPUT_SCHEMA,
  WORKER_OUTPUT_SCHEMA,
  claudeWorkerSpec,
  codexCandidateSpec,
  codexWorkerSpec,
  createDenyShimDirectory,
  judgeSpec,
  type ProviderCommandSpec,
} from "./adapters.js";
import { AllowanceLedger, worstCaseReservation } from "./budget.js";
import { createIsolatedRun, initializeFixtureRepository } from "./isolation.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { executeProvider, hasQuotaWarning, type ParsedUsage, type ProviderExecution } from "./process.js";
import { formatWorkerOutput, readClaudeStructuredOutput, readCodexStructuredOutput } from "./provider-output.js";
import { runDeterministicEvaluation, deterministicChecksPass } from "./evaluation.js";
import {
  buildBlindedJudgePrompt,
  materializeJudgeScore,
  needsTieBreak,
  resolveJudges,
  thirdJudgeFamily,
} from "./judges.js";
import { Semaphore } from "./semaphore.js";
import { allocateConsultations, assertBalancedMultiRoster, buildCandidatePrompt, buildWorkerPrompt, type Consultation } from "./topology.js";
import { installTreatments } from "./treatments.js";
import type { Assignment, JudgeScore, RunIdentity, TaskScenario, UsageEstimate } from "./types.js";

export class InfrastructureError extends Error {}
export class QuotaStopError extends InfrastructureError {}
export class AllowanceStopError extends InfrastructureError {}

export type ProviderExecutor = (spec: ProviderCommandSpec) => Promise<ProviderExecution>;

export interface ExecutionResult {
  schemaVersion: 1;
  run: RunIdentity;
  assignmentId: string;
  scenarioId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  passed: boolean;
  score: number;
  tieBreakUsed: boolean;
  workerCalls: number;
  candidateCalls: number;
  judgeCalls: number;
  usage: { openai: ParsedUsage; anthropic: ParsedUsage; openaiUnits: number; anthropicUnits: number };
  deterministic: ReturnType<typeof runDeterministicEvaluation>;
  judges: JudgeScore[];
  finalAnswer: unknown;
  attemptRoot: string;
}

function emptyUsage(): ParsedUsage {
  return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: 0 };
}

function addUsage(target: ParsedUsage, source: ParsedUsage): void {
  target.inputTokens += source.inputTokens;
  target.cachedInputTokens += source.cachedInputTokens;
  target.outputTokens += source.outputTokens;
  target.reasoningTokens += source.reasoningTokens;
  target.calls += Math.max(1, source.calls);
}

export function weightedUsageUnits(usage: ParsedUsage): number {
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return Number(((uncachedInput + usage.cachedInputTokens * 0.25 + usage.outputTokens * 2 + usage.reasoningTokens) / 1_000 + usage.calls * 0.001).toFixed(6));
}

function appendTrace(path: string, event: Record<string, unknown>): void {
  appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
}

function safeCommand(spec: ProviderCommandSpec): Record<string, unknown> {
  const args = [...spec.args];
  if (args.length > 0) args[args.length - 1] = `<prompt:${Buffer.byteLength(spec.args.at(-1) ?? "")} bytes>`;
  return { provider: spec.provider, command: spec.command, args, role: spec.role, model: spec.model, readOnly: spec.readOnly, ephemeral: spec.ephemeral };
}

function assertProviderSuccess(result: ProviderExecution): void {
  if (hasQuotaWarning(result)) throw new QuotaStopError("provider quota or rate-limit warning; campaign stopped immediately");
  if (result.directModelViolation) throw new InfrastructureError("candidate attempted a direct model subprocess outside the metered delegation service");
  if (result.timedOut) throw new InfrastructureError("provider process timed out and its process tree was terminated");
  if (result.outputLimited) throw new InfrastructureError("provider output exceeded the fixed limit");
  if (result.exitCode !== 0) throw new InfrastructureError(`provider process exited ${result.exitCode}: ${result.stderr.slice(-600)}`);
}

function schemaFile(root: string, name: string, schema: object): string {
  const path = resolve(root, `${name}.schema.json`);
  writeFileSync(path, `${JSON.stringify(schema, null, 2)}\n`, { flag: "wx" });
  return path;
}

function readStructured(spec: ProviderCommandSpec, execution: ProviderExecution, outputPath?: string): unknown {
  if (spec.provider === "anthropic") return readClaudeStructuredOutput(execution.stdout);
  if (!outputPath || !existsSync(outputPath)) throw new InfrastructureError("Codex did not write its structured final output");
  return readCodexStructuredOutput(outputPath);
}

interface RunnerContext {
  execute: ProviderExecutor;
  workerPool: Semaphore;
  usage: { openai: ParsedUsage; anthropic: ParsedUsage };
  trace: string;
}

async function invoke(
  context: RunnerContext,
  spec: ProviderCommandSpec,
  outputPath?: string,
): Promise<unknown> {
  appendTrace(context.trace, { type: "provider-start", command: safeCommand(spec) });
  const execution = await context.execute(spec);
  addUsage(context.usage[spec.provider], execution.usage);
  appendTrace(context.trace, {
    type: "provider-finish",
    provider: spec.provider,
    role: spec.role,
    model: spec.model,
    exitCode: execution.exitCode,
    durationMs: execution.durationMs,
    timedOut: execution.timedOut,
    outputLimited: execution.outputLimited,
    usage: execution.usage,
  });
  assertProviderSuccess(execution);
  return readStructured(spec, execution, outputPath);
}

async function consultWorkers(input: {
  context: RunnerContext;
  assignment: Assignment;
  scenario: TaskScenario;
  repetition: 0 | 1 | 2;
  fixture: string;
  artifacts: string;
  denyShimDir: string;
  workerSchemaPath: string;
  soloControl: boolean;
}): Promise<Array<{ consultation: Consultation; output: string }>> {
  if (input.soloControl) return [];
  const consultations = allocateConsultations(input.assignment, input.repetition);
  assertBalancedMultiRoster(input.assignment, consultations);
  const outputs: Array<{ consultation: Consultation; output: string }> = [];
  const runOne = async (consultation: Consultation, prior: string[]) => {
    const prompt = buildWorkerPrompt(input.scenario, consultation, prior);
    const outputPath = resolve(input.artifacts, `worker-${consultation.ordinal}.json`);
    const spec = consultation.worker === "opus-4.8"
      ? claudeWorkerSpec({ cwd: input.fixture, prompt, effort: input.assignment.workerEffort, denyShimDir: input.denyShimDir })
      : codexWorkerSpec({
          worker: consultation.worker,
          cwd: input.fixture,
          prompt,
          effort: input.assignment.workerEffort,
          schemaPath: input.workerSchemaPath,
          outputPath,
          denyShimDir: input.denyShimDir,
        });
    const parsed = await input.context.workerPool.use(() => invoke(input.context, spec, outputPath));
    const output = formatWorkerOutput(parsed);
    writeFileSync(resolve(input.artifacts, `worker-${consultation.ordinal}.evidence.json`), `${JSON.stringify({ consultation, output }, null, 2)}\n`, { flag: "wx" });
    return { consultation, output };
  };

  if (input.assignment.topology === "pipeline") {
    for (const consultation of consultations) {
      outputs.push(await runOne(consultation, outputs.map((entry) => entry.output)));
    }
  } else {
    outputs.push(...await Promise.all(consultations.map((consultation) => runOne(consultation, []))));
    outputs.sort((left, right) => left.consultation.ordinal - right.consultation.ordinal);
  }
  return outputs;
}

function parsedJudge(value: unknown): Omit<JudgeScore, "judgeFamily" | "judgeModel" | "blindedCandidate"> {
  if (value === null || typeof value !== "object") throw new InfrastructureError("judge returned invalid structured output");
  return value as Omit<JudgeScore, "judgeFamily" | "judgeModel" | "blindedCandidate">;
}

export interface RunExecutionOptions {
  generatedRoot: string;
  assignment: Assignment;
  scenario: TaskScenario;
  run: RunIdentity;
  allowance: AllowanceLedger;
  estimates: UsageEstimate[];
  conversionFactors?: { openai: number; anthropic: number };
  workerPool: Semaphore;
  execute?: ProviderExecutor;
  soloControl?: boolean;
}

export async function executeRun(options: RunExecutionOptions): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const reservation = worstCaseReservation(options.run.id, options.assignment, options.estimates);
  if (!options.allowance.reserve(reservation)) throw new AllowanceStopError("remaining local allowance estimate cannot cover a complete worst-case reservation");
  let reservationSettled = false;
  try {
    const paths = createIsolatedRun(options.generatedRoot, options.run, options.scenario);
    installTreatments(paths.fixture, options.assignment);
    initializeFixtureRepository(paths.fixture);
    const attemptRoot = resolve(paths.trace, "..");
    const denyShimDir = createDenyShimDirectory(attemptRoot);
    const workerSchemaPath = schemaFile(paths.artifacts, "worker", WORKER_OUTPUT_SCHEMA);
    const candidateSchemaPath = schemaFile(paths.artifacts, "candidate", CANDIDATE_OUTPUT_SCHEMA);
    const judgeSchemaPath = schemaFile(paths.artifacts, "judge", JUDGE_OUTPUT_SCHEMA);
    const usage = { openai: emptyUsage(), anthropic: emptyUsage() };
    const context: RunnerContext = { execute: options.execute ?? executeProvider, workerPool: options.workerPool, usage, trace: paths.trace };
    appendTrace(paths.trace, { type: "run-start", run: options.run, fixtureChecksum: paths.fixtureChecksum });

    const workerEvidence = await consultWorkers({
      context,
      assignment: options.assignment,
      scenario: options.scenario,
      repetition: options.run.repetition,
      fixture: paths.fixture,
      artifacts: paths.artifacts,
      denyShimDir,
      workerSchemaPath,
      soloControl: options.soloControl ?? false,
    });
    const candidatePrompt = buildCandidatePrompt(options.assignment, options.scenario, workerEvidence, options.run.planFirst);
    writeFileSync(resolve(paths.artifacts, "candidate.prompt.md"), candidatePrompt, { flag: "wx" });
    const candidateOutputPath = resolve(paths.artifacts, "candidate.final.json");
    const candidate = codexCandidateSpec({
      cwd: paths.fixture,
      prompt: candidatePrompt,
      effort: options.assignment.solEffort,
      schemaPath: candidateSchemaPath,
      outputPath: candidateOutputPath,
      denyShimDir,
    });
    const finalAnswer = await invoke(context, candidate, candidateOutputPath);
    const deterministic = runDeterministicEvaluation({
      candidateFixture: paths.fixture,
      sourceFixture: resolve(EXPERIMENT_ROOT, options.scenario.fixture),
      scratchRoot: paths.artifacts,
      topologyCompliant: workerEvidence.length === (options.soloControl ? 0 : options.assignment.topology === "single" ? 1 : 4),
    });
    writeFileSync(resolve(paths.artifacts, "deterministic.json"), `${JSON.stringify(deterministic, null, 2)}\n`, { flag: "wx" });

    const judgeScores: JudgeScore[] = [];
    const runJudge = async (family: "gpt" | "claude", ordinal: number) => {
      const blinded = buildBlindedJudgePrompt({
        family,
        runId: options.run.id,
        judgeOrdinal: ordinal,
        taskPrompt: options.scenario.prompt,
        checks: deterministic.checks,
        patch: deterministic.patch,
        testOutput: `${deterministic.testStdout}\n${deterministic.testStderr}`,
        finalAnswer: JSON.stringify(finalAnswer),
      });
      const promptPath = resolve(paths.artifacts, `judge-${ordinal}.prompt.md`);
      writeFileSync(promptPath, blinded.prompt, { flag: "wx" });
      const outputPath = resolve(paths.artifacts, `judge-${ordinal}.json`);
      const spec = judgeSpec({ family, cwd: paths.fixture, prompt: blinded.prompt, schemaPath: judgeSchemaPath, outputPath, denyShimDir });
      const parsed = await invoke(context, spec, outputPath);
      return materializeJudgeScore(family, blinded.label, parsedJudge(parsed));
    };
    judgeScores.push(...await Promise.all([runJudge("gpt", 0), runJudge("claude", 1)]));
    if (needsTieBreak(judgeScores[0], judgeScores[1])) {
      judgeScores.push(await runJudge(thirdJudgeFamily(options.run.id), 2));
    }
    const resolution = resolveJudges(options.run.id, [judgeScores[0], judgeScores[1]], judgeScores[2]);
    const openaiUnits = Number((weightedUsageUnits(usage.openai) * (options.conversionFactors?.openai ?? 1)).toFixed(6));
    const anthropicUnits = Number((weightedUsageUnits(usage.anthropic) * (options.conversionFactors?.anthropic ?? 1)).toFixed(6));
    options.allowance.settle(options.run.id, openaiUnits, anthropicUnits);
    reservationSettled = true;
    const result: ExecutionResult = {
      schemaVersion: 1,
      run: options.run,
      assignmentId: options.assignment.id,
      scenarioId: options.scenario.id,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      passed: deterministicChecksPass(deterministic.checks) && resolution.pass,
      score: resolution.totalScore,
      tieBreakUsed: resolution.tieBreakUsed,
      workerCalls: workerEvidence.length,
      candidateCalls: 1,
      judgeCalls: judgeScores.length,
      usage: { ...usage, openaiUnits, anthropicUnits },
      deterministic,
      judges: judgeScores,
      finalAnswer,
      attemptRoot: `runs/${options.run.id}/attempts/${attemptRoot.split("/").at(-1)}`,
    };
    writeFileSync(resolve(paths.runRoot, "result.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    appendTrace(paths.trace, { type: "run-complete", passed: result.passed, score: result.score });
    return result;
  } catch (error) {
    if (!reservationSettled) options.allowance.release(options.run.id);
    throw error;
  }
}
