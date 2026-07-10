import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AllowanceLedger, type CalibrationProfile, validateCalibration } from "./budget.js";
import { hashFile } from "./canonical.js";
import { CampaignStore, type CampaignState } from "./campaign.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { planFirstIdentities, runIdentity, scheduleChunk } from "./isolation.js";
import { REFERENCE_FACTORS, loadScenarios } from "./design.js";
import { executeRun, AllowanceStopError, InfrastructureError, QuotaStopError, type ExecutionResult, type ProviderExecutor } from "./runner.js";
import { Semaphore } from "./semaphore.js";
import type { Assignment, ChunkDefinition, PilotAssignment, RunIdentity, TaskScenario } from "./types.js";
import type { UsageSnapshot } from "./types.js";

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

export function schedulePilot(): ScheduledRun[] {
  const scenarios = loadScenarios();
  const rows = loadPilotRows();
  const scheduled: ScheduledRun[] = [];
  for (const row of rows) {
    const assignment = pilotAssignment(row);
    for (const scenario of scenarios) {
      for (const repetition of [0, 1, 2] as const) {
        scheduled.push({ run: runIdentity(row.id, scenario.id, repetition), assignment, scenario, soloControl: row.kind === "solo-control" });
      }
    }
  }
  const reference = rows.find((row) => row.kind === "reference");
  if (!reference) throw new Error("pilot reference row is missing");
  const referenceAssignment = pilotAssignment(reference);
  for (const run of planFirstIdentities(reference.id, scenarios)) {
    scheduled.push({ run, assignment: referenceAssignment, scenario: scenarios.find((entry) => entry.id === run.scenarioId)!, soloControl: false });
  }
  if (scheduled.length !== 1_116) throw new Error(`expected 1116 pilot executions including plan-first, got ${scheduled.length}`);
  return scheduled;
}

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
}

export async function runSchedule(options: SchedulerOptions): Promise<CampaignState> {
  validateCalibration(options.calibration);
  const { store, state } = options;
  if (state.calibrationSha256 && (!options.calibrationPath || hashFile(options.calibrationPath) !== state.calibrationSha256)) throw new Error("campaign calibration profile hash does not match");
  if (state.allowanceKinds && (options.calibration.allowanceKinds?.openai !== state.allowanceKinds.openai || options.calibration.allowanceKinds?.anthropic !== state.allowanceKinds.anthropic)) throw new Error("campaign allowance field kinds do not match calibration");
  store.registerRuns(state, options.scheduled.map((entry) => entry.run));
  const allowance = new AllowanceLedger(resolve(store.root, "allowance-ledger.json"), state.snapshot);
  // A process may have crashed after atomically writing result.json but before
  // updating campaign.json. Recover that immutable result instead of launching
  // a duplicate candidate execution or reusing any session.
  let recovered = false;
  for (const scheduled of options.scheduled) {
    const resultPath = resolve(store.root, "runs", scheduled.run.id, "result.json");
    if (!existsSync(resultPath)) continue;
    const result = JSON.parse(readFileSync(resultPath, "utf8")) as ExecutionResult;
    if (result.run.id !== scheduled.run.id) throw new Error(`recovered result ownership mismatch for ${scheduled.run.id}`);
    const entry = state.runs[scheduled.run.id];
    allowance.settleIfReserved(
      scheduled.run.id,
      result.usage?.openaiUnits ?? 0,
      result.usage?.anthropicUnits ?? 0,
    );
    if (entry.status !== "judged") {
      entry.status = "judged";
      entry.updatedAt = new Date().toISOString();
      recovered = true;
    }
  }
  if (recovered) store.save(state);
  if (options.freshSnapshot) {
    const completed = new Set(Object.values(state.runs).filter((entry) => entry.status === "judged").map((entry) => entry.run.id));
    allowance.releaseOrphans(completed);
    allowance.openEpoch(options.freshSnapshot);
  }
  const scheduledMap = new Map(options.scheduled.map((entry) => [entry.run.id, entry]));
  const queue = store.incompleteRuns(state)
    .filter((entry) => scheduledMap.has(entry.run.id))
    .slice(0, options.maxRuns ?? Number.POSITIVE_INFINITY);
  const workerPool = new Semaphore(state.workerConcurrency);
  let cursor = 0;
  let stop = false;

  const worker = async () => {
    while (!stop && cursor < queue.length) {
      const runState = queue[cursor++];
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
        options.onUpdate?.(state, result);
      } catch (error) {
        const reason = (error as Error).message;
        if (error instanceof QuotaStopError || error instanceof AllowanceStopError) {
          store.transition(state, runState.run.id, "pending", reason);
          state.haltedReason = reason;
          store.save(state);
          stop = true;
          break;
        }
        if (runState.attempts >= 3) store.transition(state, runState.run.id, "blocked", reason);
        else store.transition(state, runState.run.id, "pending", reason);
        options.onUpdate?.(state);
        if (!(error instanceof InfrastructureError)) {
          state.haltedReason = `harness failure: ${reason}`;
          store.save(state);
          stop = true;
          break;
        }
      }
    }
  };
  const poolSize = Math.max(1, Math.min(state.concurrency, queue.length || 1));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return state;
}

export function loadCalibration(path: string): CalibrationProfile {
  if (!existsSync(path)) throw new Error(`calibration profile not found: ${path}`);
  const profile = JSON.parse(readFileSync(path, "utf8")) as CalibrationProfile;
  validateCalibration(profile);
  return profile;
}
