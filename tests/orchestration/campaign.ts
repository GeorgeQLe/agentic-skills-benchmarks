import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { contentId, hashFile } from "./canonical.js";
import { EXPERIMENT_ROOT, campaignRoot } from "./paths.js";
import type { ChunkArchiveState, PitwallSourceLock, RunIdentity, RunStatus, UsageSnapshot } from "./types.js";

export type CampaignKind = "calibration" | "pilot" | "full";
export const CAMPAIGN_DESIGN_VERSION = 2 as const;

export interface AdaptiveConcurrencyState {
  initialRuns: number;
  minRuns: number;
  maxRuns: number;
  currentRuns: number;
  initialWorkers: number;
  minWorkers: number;
  maxWorkers: number;
  currentWorkers: number;
  healthyLatencyMs?: number;
  windowLatenciesMs: number[];
  completedWindows: number;
  consecutiveSlowWindows: number;
  throttles: Array<{ at: string; concurrencyBefore: number }>;
}

export interface PilotShortlistDecision {
  decidedAt: string;
  leader: { averageScore: number; passRate: number };
  scoreThreshold: number;
  passRateThreshold: number;
  metrics: Record<string, { runs: number; averageScore: number; passRate: number }>;
  selectedIds: string[];
  eliminatedIds: string[];
}

export interface CampaignRunState {
  run: RunIdentity;
  status: RunStatus;
  attempts: number;
  updatedAt: string;
  infrastructureReason?: string;
}

export interface CampaignChunkState {
  chunkId: string;
  ordinal: number;
  expectedRuns: number;
  completedRuns: number;
  archiveState: ChunkArchiveState;
  archiveSha256?: string;
  remoteCommit?: string;
}

export interface CampaignState {
  schemaVersion: 1 | 2;
  id: string;
  kind: CampaignKind;
  createdAt: string;
  updatedAt: string;
  designSha256: string;
  assignmentsSha256: string;
  snapshot: UsageSnapshot;
  calibrationSha256?: string;
  allowanceKinds?: { openai: "remainingPercent"; anthropic: "remainingPercent" };
  sourceLock?: PitwallSourceLock;
  concurrency: number;
  workerConcurrency: number;
  designVersion?: number;
  pilotStage?: "stage-1" | "stage-2" | "plan-first" | "complete";
  shortlistDecision?: PilotShortlistDecision;
  adaptive?: AdaptiveConcurrencyState;
  pause?: { reason: string; retryCount: number; nextRetryAt: string };
  runs: Record<string, CampaignRunState>;
  chunks: Record<string, CampaignChunkState>;
  haltedReason?: string;
}

export function newCampaign(input: {
  kind: CampaignKind;
  snapshot: UsageSnapshot;
  concurrency?: number;
  workerConcurrency?: number;
  now?: string;
  calibrationSha256?: string;
  allowanceKinds?: { openai: "remainingPercent"; anthropic: "remainingPercent" };
  sourceLock?: PitwallSourceLock;
  minConcurrency?: number;
  maxConcurrency?: number;
  minWorkerConcurrency?: number;
  maxWorkerConcurrency?: number;
}): CampaignState {
  const now = input.now ?? new Date().toISOString();
  const designSha256 = hashFile(resolve(EXPERIMENT_ROOT, "design.lock.json"));
  const assignmentsSha256 = hashFile(resolve(EXPERIMENT_ROOT, "assignments.jsonl"));
  const identity = { kind: input.kind, now, designSha256, assignmentsSha256 };
  const initialRuns = input.concurrency ?? 4;
  const minRuns = input.minConcurrency ?? Math.min(2, initialRuns);
  const maxRuns = input.maxConcurrency ?? 8;
  const initialWorkers = input.workerConcurrency ?? initialRuns * 2;
  const minWorkers = input.minWorkerConcurrency ?? Math.min(minRuns * 2, initialWorkers);
  const maxWorkers = input.maxWorkerConcurrency ?? maxRuns * 2;
  if (minRuns < 1 || minRuns > initialRuns || initialRuns > maxRuns) throw new Error("run concurrency must satisfy 1 <= minimum <= initial <= maximum");
  if (minWorkers < 1 || minWorkers > initialWorkers || initialWorkers > maxWorkers) throw new Error("worker concurrency must satisfy 1 <= minimum <= initial <= maximum");
  return {
    schemaVersion: 2,
    id: contentId(`${input.kind}-campaign`, identity, 16),
    kind: input.kind,
    createdAt: now,
    updatedAt: now,
    designSha256,
    assignmentsSha256,
    snapshot: input.snapshot,
    calibrationSha256: input.calibrationSha256,
    allowanceKinds: input.allowanceKinds,
    sourceLock: input.sourceLock,
    concurrency: initialRuns,
    workerConcurrency: initialWorkers,
    designVersion: CAMPAIGN_DESIGN_VERSION,
    pilotStage: input.kind === "pilot" ? "stage-1" : undefined,
    adaptive: {
      initialRuns, minRuns, maxRuns, currentRuns: initialRuns,
      initialWorkers, minWorkers, maxWorkers, currentWorkers: initialWorkers,
      windowLatenciesMs: [], completedWindows: 0, consecutiveSlowWindows: 0, throttles: [],
    },
    runs: {},
    chunks: {},
  };
}

export class CampaignStore {
  readonly root: string;
  readonly statePath: string;

  constructor(readonly campaignId: string) {
    this.root = campaignRoot(campaignId);
    this.statePath = resolve(this.root, "campaign.json");
  }

  create(state: CampaignState): void {
    if (state.id !== this.campaignId) throw new Error("campaign id does not match state");
    if (existsSync(this.statePath)) throw new Error(`campaign already exists: ${state.id}`);
    mkdirSync(this.root, { recursive: true });
    this.save(state);
  }

  load(options: { allowLegacyRead?: boolean } = {}): CampaignState {
    if (!existsSync(this.statePath)) throw new Error(`campaign not found: ${this.campaignId}`);
    const state = JSON.parse(readFileSync(this.statePath, "utf8")) as CampaignState;
    if (!options.allowLegacyRead) this.assertDesign(state);
    return state;
  }

  save(state: CampaignState): void {
    state.updatedAt = new Date().toISOString();
    mkdirSync(dirname(this.statePath), { recursive: true });
    const temp = resolve(this.root, `.campaign-${process.pid}-${Date.now()}.tmp`);
    writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx" });
    renameSync(temp, this.statePath);
  }

  registerRuns(state: CampaignState, runs: RunIdentity[]): void {
    for (const run of runs) {
      const current = state.runs[run.id];
      if (current) {
        if (JSON.stringify(current.run) !== JSON.stringify(run)) throw new Error(`immutable run identity altered: ${run.id}`);
        continue;
      }
      state.runs[run.id] = { run, status: "pending", attempts: 0, updatedAt: new Date().toISOString() };
    }
    this.save(state);
  }

  transition(state: CampaignState, runId: string, status: RunStatus, infrastructureReason?: string): void {
    const run = state.runs[runId];
    if (!run) throw new Error(`unregistered run ${runId}`);
    const permitted: Record<RunStatus, RunStatus[]> = {
      pending: ["reserved", "blocked"],
      reserved: ["running", "pending", "blocked"],
      running: ["candidate-complete", "pending", "blocked"],
      "candidate-complete": ["judged", "pending", "blocked"],
      judged: [],
      blocked: ["pending"],
    };
    if (!permitted[run.status].includes(status)) throw new Error(`invalid run transition ${run.status} -> ${status}`);
    if (status === "running") run.attempts++;
    run.status = status;
    run.updatedAt = new Date().toISOString();
    run.infrastructureReason = infrastructureReason;
    this.save(state);
  }

  incompleteRuns(state: CampaignState): CampaignRunState[] {
    return Object.values(state.runs).filter((entry) => entry.status !== "judged");
  }

  assertDesign(state: CampaignState): void {
    if (state.designVersion !== CAMPAIGN_DESIGN_VERSION) {
      throw new Error(`campaign design version ${state.designVersion ?? "legacy"} cannot be resumed by design v${CAMPAIGN_DESIGN_VERSION}; start a new campaign`);
    }
    const design = hashFile(resolve(EXPERIMENT_ROOT, "design.lock.json"));
    const assignments = hashFile(resolve(EXPERIMENT_ROOT, "assignments.jsonl"));
    if (state.designSha256 !== design || state.assignmentsSha256 !== assignments) {
      throw new Error("campaign lock hashes differ from current immutable experiment files");
    }
  }
}

export function listCampaigns(): string[] {
  const root = campaignRoot("placeholder").replace(/\/placeholder$/, "");
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((name) => existsSync(resolve(root, name, "campaign.json"))).sort();
}
