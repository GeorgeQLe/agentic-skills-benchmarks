import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AllowanceLedger, type CalibrationProfile, validateCalibration, validatePercentageSnapshot } from "./budget.js";
import { hashFile } from "./canonical.js";
import { CampaignStore, type AdaptiveConcurrencyState, type CampaignState } from "./campaign.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { planFirstIdentities, runIdentity, scheduleChunk } from "./isolation.js";
import { REFERENCE_FACTORS, loadScenarios } from "./design.js";
import { executeRun, AllowanceStopError, CandidateContractError, InfrastructureError, QuotaStopError, type ExecutionResult, type ProviderExecutor } from "./runner.js";
import { Semaphore } from "./semaphore.js";
import type { Assignment, ChunkDefinition, PilotAssignment, RunIdentity, TaskScenario } from "./types.js";
import type { UsageSnapshot } from "./types.js";
import type { AllowanceSnapshotProvider } from "./pitwall.js";
import { readValidResultArtifact } from "./result-artifact.js";

function readJsonLines<T>(path: string): T[] {
  return readFileSync(path, "utf8").trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

export function loadAssignments(): Assignment[] {
  return readJsonLines(resolve(EXPERIMENT_ROOT, "assignments.jsonl"));
}

export function loadChunks(): ChunkDefinition[] {
  return readJsonLines(resolve(EXPERIMENT_ROOT, "chunks.jsonl"));
}

export function loadPilotRows(): PilotAssignment[] {
  return readJsonLines(resolve(EXPERIMENT_ROOT, "pilot-ofat.jsonl"));
}

function pilotAssignment(row: PilotAssignment): Assignment {
  const factors = row.factors ?? REFERENCE_FACTORS;
  return { schemaVersion: 1, id: row.id, ordinal: row.ordinal, ...factors };
}

export interface ScheduledRun {
  run: RunIdentity;
  assignment: Assignment;
  scenario: TaskScenario;
  soloControl: boolean;
}

export function schedulePilotStage1(): ScheduledRun[] {
  const scenarios = loadScenarios();
  const rows = loadPilotRows();
  const scheduled: ScheduledRun[] = [];
  for (const row of rows) {
    const assignment = pilotAssignment(row);
    for (const scenario of scenarios) {
      scheduled.push({ run: runIdentity(row.id, scenario.id, 0, false, "v2"), assignment, scenario, soloControl: row.kind === "solo-control" });
    }
  }
  if (scheduled.length !== 360) throw new Error(`expected 360 Stage 1 pilot executions, got ${scheduled.length}`);
  return scheduled;
}

export function computePilotShortlist(results: Array<Pick<ExecutionResult, "assignmentId" | "score" | "passed">>): import("./campaign.js").PilotShortlistDecision {
  const rows = loadPilotRows();
  const metrics: Record<string, { runs: number; averageScore: number; passRate: number }> = {};
  for (const row of rows) {
    const group = results.filter((result) => result.assignmentId === row.id);
    if (group.length !== 12) throw new Error(`Stage 1 is incomplete for ${row.id}: expected 12 results, got ${group.length}`);
    metrics[row.id] = { runs: group.length, averageScore: group.reduce((sum, result) => sum + result.score, 0) / group.length, passRate: group.filter((result) => result.passed).length / group.length };
  }
  const leader = Object.values(metrics).sort((a, b) => b.averageScore - a.averageScore || b.passRate - a.passRate)[0];
  const passLeader = Math.max(...Object.values(metrics).map((entry) => entry.passRate));
  const scoreThreshold = leader.averageScore - 5;
  const passRateThreshold = passLeader - 0.10;
  const mandatory = new Set(rows.filter((row) => row.kind === "solo-control" || row.kind === "reference").map((row) => row.id));
  const selectedIds = rows.map((row) => row.id).filter((id) => mandatory.has(id) || metrics[id].averageScore >= scoreThreshold || metrics[id].passRate >= passRateThreshold).sort();
  return { decidedAt: new Date().toISOString(), leader: { averageScore: leader.averageScore, passRate: passLeader }, scoreThreshold, passRateThreshold, metrics, selectedIds, eliminatedIds: rows.map((row) => row.id).filter((id) => !selectedIds.includes(id)).sort() };
}

export function schedulePilotStage2(selectedIds: string[]): ScheduledRun[] {
  const selected = new Set(selectedIds);
  const scenarios = loadScenarios();
  return loadPilotRows().filter((row) => selected.has(row.id)).flatMap((row) => {
    const assignment = pilotAssignment(row);
    return scenarios.flatMap((scenario) => ([1, 2] as const).map((repetition) => ({ run: runIdentity(row.id, scenario.id, repetition, false, "v2"), assignment, scenario, soloControl: row.kind === "solo-control" })));
  });
}

export function schedulePilotPlanFirst(): ScheduledRun[] {
  const scenarios = loadScenarios();
  const reference = loadPilotRows().find((row) => row.kind === "reference");
  if (!reference) throw new Error("pilot reference row is missing");
  const assignment = pilotAssignment(reference);
  return scenarios.flatMap((scenario) => ([0, 1, 2] as const).map((repetition) => ({ run: runIdentity(reference.id, scenario.id, repetition, true, "v2"), assignment, scenario, soloControl: false })));
}

/** Initial pilot plan; later stages are materialized only after the persisted shortlist decision. */
export function schedulePilot(): ScheduledRun[] { return schedulePilotStage1(); }

export function scheduleFullChunk(chunkOrdinal: number): ScheduledRun[] {
  const chunks = loadChunks();
  const chunk = chunks[chunkOrdinal];
  if (!chunk) throw new Error(`chunk ordinal must be between 0 and ${chunks.length - 1}`);
  const assignments = new Map(loadAssignments().map((assignment) => [assignment.id, assignment]));
  const scenarios = loadScenarios();
  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  return scheduleChunk(chunk, scenarios).map((run) => ({
    run,
    assignment: assignments.get(run.assignmentId)!,
    scenario: scenarioMap.get(run.scenarioId)!,
    soloControl: false,
  }));
}

export interface SchedulerOptions {
  store: CampaignStore;
  state: CampaignState;
  scheduled: ScheduledRun[];
  calibration: CalibrationProfile;
  maxRuns?: number;
  execute?: ProviderExecutor;
  onUpdate?: (state: CampaignState, result?: ExecutionResult) => void;
  freshSnapshot?: UsageSnapshot;
  calibrationPath?: string;
  snapshotProvider?: AllowanceSnapshotProvider;
  now?: () => number;
  refreshIntervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  maxPauseRetries?: number;
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

export function observeAdaptiveSuccess(adaptive: AdaptiveConcurrencyState, latencyMs: number): boolean {
  adaptive.windowLatenciesMs.push(latencyMs);
  if (adaptive.windowLatenciesMs.length < 20) return false;
  const p95 = percentile95(adaptive.windowLatenciesMs);
  adaptive.windowLatenciesMs = [];
  adaptive.completedWindows++;
  if (adaptive.healthyLatencyMs === undefined) {
    adaptive.healthyLatencyMs = p95;
    adaptive.consecutiveSlowWindows = 0;
    return true;
  }
  if (p95 > adaptive.healthyLatencyMs * 1.5) adaptive.consecutiveSlowWindows++;
  else adaptive.consecutiveSlowWindows = 0;
  if (adaptive.consecutiveSlowWindows >= 2) {
    adaptive.currentRuns = Math.max(adaptive.minRuns, Math.floor(adaptive.currentRuns / 2));
    adaptive.currentWorkers = Math.max(adaptive.minWorkers, Math.min(adaptive.maxWorkers, adaptive.currentRuns * 2));
    adaptive.consecutiveSlowWindows = 0;
  } else if (p95 <= adaptive.healthyLatencyMs * 1.25) {
    adaptive.currentRuns = Math.min(adaptive.maxRuns, adaptive.currentRuns + 1);
    adaptive.currentWorkers = Math.min(adaptive.maxWorkers, Math.max(adaptive.minWorkers, adaptive.currentRuns * 2));
    adaptive.healthyLatencyMs = p95;
  }
  return true;
}

export function observeAdaptiveThrottle(adaptive: AdaptiveConcurrencyState, at = new Date().toISOString()): void {
  adaptive.throttles.push({ at, concurrencyBefore: adaptive.currentRuns });
  adaptive.currentRuns = Math.max(adaptive.minRuns, Math.floor(adaptive.currentRuns / 2));
  adaptive.currentWorkers = Math.max(adaptive.minWorkers, Math.min(adaptive.maxWorkers, adaptive.currentRuns * 2));
  adaptive.windowLatenciesMs = [];
}

export function rateLimitBackoffMs(retryCount: number): number {
  return Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, retryCount - 1));
}

export async function runSchedule(options: SchedulerOptions): Promise<CampaignState> {
  validateCalibration(options.calibration);
  const { store, state } = options;
  if (state.calibrationSha256 && (!options.calibrationPath || hashFile(options.calibrationPath) !== state.calibrationSha256)) throw new Error("campaign calibration profile hash does not match");
  if (state.allowanceKinds && (options.calibration.allowanceKinds?.openai !== state.allowanceKinds.openai || options.calibration.allowanceKinds?.anthropic !== state.allowanceKinds.anthropic)) throw new Error("campaign allowance field kinds do not match calibration");
  if (JSON.stringify(state.sourceLock) !== JSON.stringify(options.calibration.sourceLock)) throw new Error("campaign Pitwall source/window lock does not match calibration");
  if (state.sourceLock && !options.snapshotProvider) throw new Error("live Pitwall campaign scheduling requires an allowance snapshot provider");
  const allowance = new AllowanceLedger(resolve(store.root, "allowance-ledger.json"), state.snapshot);
  // A process may have crashed after atomically writing result.json but before
  // updating campaign.json. Recover that immutable result instead of launching
  // a duplicate candidate execution or reusing any session.
  const recoveredResults = new Map<string, ExecutionResult>();
  const recoveredUsage = new Map<string, { openai: number; anthropic: number }>();
  for (const scheduled of options.scheduled) {
    const resultPath = resolve(store.root, "runs", scheduled.run.id, "result.json");
    if (!existsSync(resultPath)) continue;
    const entry = state.runs[scheduled.run.id];
    if (!entry) throw new Error(`cannot recover unregistered result ${scheduled.run.id}`);
    const result = readValidResultArtifact(resultPath, scheduled.run);
    recoveredResults.set(scheduled.run.id, result);
    recoveredUsage.set(scheduled.run.id, { openai: result.usage.openaiUnits, anthropic: result.usage.anthropicUnits });
  }
  if (options.freshSnapshot) {
    validatePercentageSnapshot(options.freshSnapshot, { now: options.now?.() ?? Date.now(), maxAgeMs: 5 * 60_000, requirePitwall: true });
    const completed = new Set([
      ...Object.values(state.runs).filter((entry) => entry.status === "judged").map((entry) => entry.run.id),
      ...recoveredResults.keys(),
    ]);
    allowance.reconcileAndOpenEpoch(options.freshSnapshot, completed, recoveredUsage);
  } else {
    allowance.settleRecovered(recoveredUsage);
  }
  for (const [runId] of recoveredResults) {
    const entry = state.runs[runId];
    if (entry.status !== "judged") {
      entry.status = "judged";
      entry.updatedAt = new Date().toISOString();
    }
  }
  if (options.freshSnapshot) state.haltedReason = undefined;
  store.registerRuns(state, options.scheduled.map((entry) => entry.run));
  const scheduledMap = new Map(options.scheduled.map((entry) => [entry.run.id, entry]));
  // Provider sessions are never resumable. A stale in-flight state after a
  // timeout/SIGTERM is converted back to pending without charging an attempt.
  for (const entry of Object.values(state.runs)) {
    if (!scheduledMap.has(entry.run.id) || recoveredResults.has(entry.run.id)) continue;
    if (entry.status === "reserved" || entry.status === "running" || entry.status === "candidate-complete") {
      allowance.releaseIfReserved(entry.run.id);
      if (entry.status === "running") entry.attempts = Math.max(0, entry.attempts - 1);
      entry.status = "pending";
      entry.infrastructureReason = "recovered stale in-flight run";
      entry.updatedAt = new Date(options.now?.() ?? Date.now()).toISOString();
    }
  }
  store.save(state);
  const queue = store.incompleteRuns(state)
    .filter((entry) => scheduledMap.has(entry.run.id))
    .slice(0, options.maxRuns ?? Number.POSITIVE_INFINITY);
  const adaptive = state.adaptive;
  const workerPool = new Semaphore(adaptive?.currentWorkers ?? state.workerConcurrency);
  let stop = false;
  let quotaWarning = false;
  const now = options.now ?? Date.now;
  const refreshIntervalMs = options.refreshIntervalMs ?? 5 * 60_000;

  const executeQueuedRun = async (runState: (typeof queue)[number]) => {
      if (stop) return;
      const scheduled = scheduledMap.get(runState.run.id)!;
      if (runState.status === "blocked" || runState.status === "reserved" || runState.status === "running" || runState.status === "candidate-complete") {
        allowance.releaseIfReserved(runState.run.id);
        store.transition(state, runState.run.id, "pending");
      }
      store.transition(state, runState.run.id, "reserved");
      store.transition(state, runState.run.id, "running");
      try {
        const result = await executeRun({
          generatedRoot: store.root,
          assignment: scheduled.assignment,
          scenario: scheduled.scenario,
          run: scheduled.run,
          allowance,
          estimates: options.calibration.estimates,
          conversionFactors: options.calibration.conversionFactors,
          workerPool,
          execute: options.execute,
          soloControl: scheduled.soloControl,
        });
        store.transition(state, runState.run.id, "candidate-complete");
        store.transition(state, runState.run.id, "judged");
        if (adaptive && observeAdaptiveSuccess(adaptive, result.durationMs)) {
          state.concurrency = adaptive.currentRuns;
          state.workerConcurrency = adaptive.currentWorkers;
          workerPool.setLimit(adaptive.currentWorkers);
          store.save(state);
        }
        options.onUpdate?.(state, result);
      } catch (error) {
        const reason = (error as Error).message;
        if (error instanceof QuotaStopError || error instanceof AllowanceStopError) {
          if (error instanceof QuotaStopError) runState.attempts = Math.max(0, runState.attempts - 1);
          store.transition(state, runState.run.id, "pending", reason);
          if (error instanceof QuotaStopError) {
            if (adaptive) observeAdaptiveThrottle(adaptive);
            const retryCount = (state.pause?.retryCount ?? 0) + 1;
            state.pause = { reason, retryCount, nextRetryAt: new Date(now() + rateLimitBackoffMs(retryCount)).toISOString() };
            state.haltedReason = undefined;
          } else state.haltedReason = reason;
          store.save(state);
          quotaWarning ||= error instanceof QuotaStopError;
          stop = true;
          return;
        }
        if (error instanceof CandidateContractError) store.transition(state, runState.run.id, "blocked", reason);
        else if (runState.attempts >= 3) store.transition(state, runState.run.id, "blocked", reason);
        else store.transition(state, runState.run.id, "pending", reason);
        options.onUpdate?.(state);
        if (!(error instanceof InfrastructureError)) {
          state.haltedReason = `harness failure: ${reason}`;
          store.save(state);
          stop = true;
          return;
        }
      }
  };

  let offset = 0;
  const active = new Set<Promise<void>>();
  while ((offset < queue.length && !stop) || active.size > 0) {
    const ceiling = Math.max(1, adaptive?.currentRuns ?? state.concurrency);
    while (!stop && offset < queue.length && active.size < ceiling) {
      let task!: Promise<void>;
      task = executeQueuedRun(queue[offset++]).finally(() => active.delete(task));
      active.add(task);
    }
    if (active.size) await Promise.race(active);
    else break;
    if (!stop && active.size === 0 && options.snapshotProvider) {
      const ledgerState = allowance.snapshot();
      const epoch = ledgerState.epochs.find((entry) => entry.id === ledgerState.currentEpochId)!;
      if (now() - Date.parse(epoch.snapshot.capturedAt) >= refreshIntervalMs) {
        const fresh = await options.snapshotProvider.snapshot();
        validatePercentageSnapshot(fresh, { now: now(), maxAgeMs: 5 * 60_000, requirePitwall: true });
        allowance.openEpoch(fresh);
        state.snapshot = fresh;
        store.save(state);
      }
    }
  }
  {
    const allowanceState = allowance.snapshot();
    const current = allowanceState.epochs.find((entry) => entry.id === allowanceState.currentEpochId)!;
    const due = now() - Date.parse(current.snapshot.capturedAt) >= refreshIntervalMs;
    if ((quotaWarning || due) && options.snapshotProvider) {
      try {
        const retryAllowed = quotaWarning && (options.maxPauseRetries ?? (options.execute ? 0 : Number.POSITIVE_INFINITY)) >= (state.pause?.retryCount ?? 0);
        if (quotaWarning && retryAllowed && state.pause) {
          const delay = Math.max(0, Date.parse(state.pause.nextRetryAt) - now());
          await (options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))))(delay);
        }
        if (allowance.snapshot().reservations.some((entry) => entry.state === "reserved")) throw new Error("active allowance reservations remain at wave boundary");
        const fresh = await options.snapshotProvider.snapshot();
        validatePercentageSnapshot(fresh, { now: now(), maxAgeMs: 5 * 60_000, requirePitwall: true });
        allowance.openEpoch(fresh);
        state.snapshot = fresh;
        if (quotaWarning && retryAllowed) state.pause = undefined;
        store.save(state);
        if (quotaWarning && retryAllowed) {
          return runSchedule({ ...options, state, freshSnapshot: undefined });
        }
      } catch (error) {
        state.haltedReason = `Pitwall allowance refresh failed: ${(error as Error).message}`;
        store.save(state);
        stop = true;
      }
    }
  }
  return state;
}

export function loadCalibration(path: string): CalibrationProfile {
  if (!existsSync(path)) throw new Error(`calibration profile not found: ${path}`);
  const profile = JSON.parse(readFileSync(path, "utf8")) as CalibrationProfile;
  validateCalibration(profile);
  return profile;
}
