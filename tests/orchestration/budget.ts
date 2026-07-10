import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { contentId } from "./canonical.js";
import type {
  Assignment,
  ProviderAllowance,
  Reservation,
  ReservationRequest,
  UsageEstimate,
  UsageSnapshot,
} from "./types.js";

export interface AllowanceEpoch {
  id: string;
  snapshot: UsageSnapshot;
  openedAt: string;
}

export interface AllowanceState {
  schemaVersion: 2;
  epochs: AllowanceEpoch[];
  currentEpochId: string;
  reservations: Reservation[];
}

interface LegacyAllowanceState {
  schemaVersion: 1;
  snapshot: UsageSnapshot;
  reservations: Reservation[];
  settledOpenaiUnits: number;
  settledAnthropicUnits: number;
}

export function readUsageSnapshot(path: string, now = Date.now()): UsageSnapshot {
  const snapshot = JSON.parse(readFileSync(path, "utf8")) as UsageSnapshot;
  if (snapshot.schemaVersion !== 1 || snapshot.providers?.openai?.source !== "manual-provider-dashboard" || snapshot.providers?.anthropic?.source !== "manual-provider-dashboard") {
    throw new Error("usage snapshot must contain manual-provider-dashboard OpenAI and Anthropic allowances");
  }
  const captured = Date.parse(snapshot.capturedAt);
  if (!Number.isFinite(captured) || captured > now + 60_000) throw new Error("usage snapshot has an invalid capture time");
  for (const [provider, allowance] of Object.entries(snapshot.providers)) validateAllowance(provider, allowance);
  return snapshot;
}

function validateAllowance(provider: string, allowance: ProviderAllowance): void {
  if (allowance.remainingUnits === undefined && allowance.remainingPercent === undefined && allowance.credits === undefined) {
    throw new Error(`${provider} snapshot must report units, percentage, or credits`);
  }
  for (const value of [allowance.remainingUnits, allowance.remainingPercent, allowance.credits]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`${provider} snapshot has an invalid allowance`);
  }
  if (allowance.remainingPercent !== undefined && allowance.remainingPercent > 100) {
    throw new Error(`${provider} remaining percentage exceeds 100`);
  }
}

export function allowanceFieldKind(allowance: ProviderAllowance): "remainingUnits" | "remainingPercent" | "credits" {
  const fields = (["remainingUnits", "remainingPercent", "credits"] as const).filter((key) => allowance[key] !== undefined);
  if (fields.length !== 1) throw new Error("each provider snapshot must contain exactly one allowance field");
  return fields[0];
}

export function validatePercentageSnapshot(snapshot: UsageSnapshot, options: { now?: number; maxAgeMs?: number; minimumResetLeadMs?: number } = {}): void {
  const now = options.now ?? Date.now();
  if (allowanceFieldKind(snapshot.providers.openai) !== "remainingPercent" || allowanceFieldKind(snapshot.providers.anthropic) !== "remainingPercent") {
    throw new Error("calibration snapshots require exactly remainingPercent for both providers");
  }
  if (options.maxAgeMs !== undefined && snapshotStalenessMs(snapshot, now) > options.maxAgeMs) throw new Error("pre-calibration snapshot is more than five minutes old");
  for (const [provider, allowance] of Object.entries(snapshot.providers)) {
    const reset = Date.parse(allowance.resetAt ?? "");
    if (!Number.isFinite(reset)) throw new Error(`${provider} snapshot requires a valid resetAt`);
    if (options.minimumResetLeadMs !== undefined && reset - now < options.minimumResetLeadMs) throw new Error(`${provider} reset is less than two hours away`);
  }
}

export function snapshotStalenessMs(snapshot: UsageSnapshot, now = Date.now()): number {
  return Math.max(0, now - Date.parse(snapshot.capturedAt));
}

export function snapshotDisplay(snapshot: UsageSnapshot, now = Date.now()): string {
  const ageMinutes = Math.floor(snapshotStalenessMs(snapshot, now) / 60_000);
  const show = (allowance: ProviderAllowance) => {
    if (allowance.remainingUnits !== undefined) return `${allowance.remainingUnits.toFixed(2)} estimated allowance units`;
    if (allowance.remainingPercent !== undefined) return `${allowance.remainingPercent.toFixed(1)}% reported remaining`;
    return `${allowance.credits?.toFixed(2)} reported subscription credits`;
  };
  return `OpenAI ${show(snapshot.providers.openai)} | Anthropic ${show(snapshot.providers.anthropic)} | snapshot ${ageMinutes}m old`;
}

export function availableUnits(allowance: ProviderAllowance): number {
  if (allowance.remainingUnits !== undefined) return allowance.remainingUnits;
  if (allowance.credits !== undefined) return allowance.credits;
  // Percentage-only snapshots use 100 normalized allowance units. These are
  // deliberately estimates, never currency or API spend.
  return allowance.remainingPercent ?? 0;
}

export class AllowanceLedger {
  private state: AllowanceState;

  constructor(private readonly path: string, snapshot?: UsageSnapshot) {
    if (existsSync(path)) {
      const loaded = JSON.parse(readFileSync(path, "utf8")) as AllowanceState | LegacyAllowanceState;
      this.state = loaded.schemaVersion === 1 ? this.migrate(loaded) : loaded;
      this.persist();
    } else {
      if (!snapshot) throw new Error("a manual usage snapshot is required to initialize the allowance ledger");
      const epoch = this.epoch(snapshot);
      this.state = { schemaVersion: 2, epochs: [epoch], currentEpochId: epoch.id, reservations: [] };
      this.persist();
    }
  }

  reserve(request: ReservationRequest): Reservation | null {
    if (request.openaiUnits < 0 || request.anthropicUnits < 0) throw new Error("reservation units must be non-negative");
    if (this.state.reservations.some((entry) => entry.runId === request.runId && entry.state !== "released")) {
      throw new Error(`run ${request.runId} already has an active or settled reservation`);
    }
    const remaining = this.remaining();
    if (remaining.openai < request.openaiUnits || remaining.anthropic < request.anthropicUnits) return null;
    // Check and mutation are synchronous with no await boundary, making this
    // atomic for every concurrent scheduler worker in the owning process.
    const reservation: Reservation = { ...request, epochId: this.state.currentEpochId, reservedAt: new Date().toISOString(), state: "reserved" };
    this.state.reservations.push(reservation);
    this.persist();
    return { ...reservation };
  }

  settle(runId: string, actualOpenaiUnits: number, actualAnthropicUnits: number): void {
    const reservation = this.state.reservations.find((entry) => entry.runId === runId && entry.state === "reserved");
    if (!reservation) throw new Error(`no reserved allowance for ${runId}`);
    if (actualOpenaiUnits < 0 || actualAnthropicUnits < 0) throw new Error("actual usage must be non-negative");
    reservation.state = "settled";
    reservation.actualOpenaiUnits = actualOpenaiUnits;
    reservation.actualAnthropicUnits = actualAnthropicUnits;
    this.persist();
  }

  release(runId: string): void {
    const reservation = this.state.reservations.find((entry) => entry.runId === runId && entry.state === "reserved");
    if (!reservation) throw new Error(`no reserved allowance for ${runId}`);
    reservation.state = "released";
    this.persist();
  }

  releaseIfReserved(runId: string): boolean {
    const reservation = this.state.reservations.find((entry) => entry.runId === runId && entry.state === "reserved");
    if (!reservation) return false;
    reservation.state = "released";
    this.persist();
    return true;
  }

  settleIfReserved(runId: string, actualOpenaiUnits: number, actualAnthropicUnits: number): boolean {
    const reservation = this.state.reservations.find((entry) => entry.runId === runId && entry.state === "reserved");
    if (!reservation) return false;
    this.settle(runId, actualOpenaiUnits, actualAnthropicUnits);
    return true;
  }

  remaining(): { openai: number; anthropic: number; reservedOpenai: number; reservedAnthropic: number } {
    const current = this.currentEpoch();
    const inEpoch = this.state.reservations.filter((entry) => entry.epochId === current.id);
    const active = inEpoch.filter((entry) => entry.state === "reserved");
    const reservedOpenai = active.reduce((total, entry) => total + entry.openaiUnits, 0);
    const reservedAnthropic = active.reduce((total, entry) => total + entry.anthropicUnits, 0);
    const settledOpenai = inEpoch.filter((entry) => entry.state === "settled").reduce((total, entry) => total + (entry.actualOpenaiUnits ?? 0), 0);
    const settledAnthropic = inEpoch.filter((entry) => entry.state === "settled").reduce((total, entry) => total + (entry.actualAnthropicUnits ?? 0), 0);
    return {
      openai: Math.max(0, availableUnits(current.snapshot.providers.openai) - settledOpenai - reservedOpenai),
      anthropic: Math.max(0, availableUnits(current.snapshot.providers.anthropic) - settledAnthropic - reservedAnthropic),
      reservedOpenai,
      reservedAnthropic,
    };
  }

  snapshot(): AllowanceState {
    return structuredClone(this.state);
  }

  openEpoch(snapshot: UsageSnapshot): AllowanceEpoch {
    readUsageSnapshotObject(snapshot);
    if (this.state.reservations.some((entry) => entry.state === "reserved")) throw new Error("cannot open an allowance epoch with unreconciled reservations");
    const previous = this.currentEpoch().snapshot;
    if (Date.parse(snapshot.capturedAt) <= Date.parse(previous.capturedAt)) throw new Error("fresh allowance snapshot must be newer than the current epoch");
    for (const provider of ["openai", "anthropic"] as const) {
      if (allowanceFieldKind(previous.providers[provider]) !== allowanceFieldKind(snapshot.providers[provider])) throw new Error("allowance field kind cannot change between epochs");
      const priorValue = availableUnits(previous.providers[provider]);
      const nextValue = availableUnits(snapshot.providers[provider]);
      const priorReset = Date.parse(previous.providers[provider].resetAt ?? "");
      if (nextValue > priorValue && (!Number.isFinite(priorReset) || Date.parse(snapshot.capturedAt) < priorReset)) {
        throw new Error(`${provider} allowance increased before the previous reset`);
      }
    }
    const epoch = this.epoch(snapshot);
    if (this.state.epochs.some((entry) => entry.id === epoch.id)) throw new Error("allowance snapshot epoch already exists");
    this.state.epochs.push(epoch);
    this.state.currentEpochId = epoch.id;
    this.persist();
    return epoch;
  }

  releaseOrphans(completedRunIds: Set<string>): void {
    for (const reservation of this.state.reservations) {
      if (reservation.state === "reserved" && !completedRunIds.has(reservation.runId)) reservation.state = "released";
    }
    this.persist();
  }

  private currentEpoch(): AllowanceEpoch {
    const epoch = this.state.epochs.find((entry) => entry.id === this.state.currentEpochId);
    if (!epoch) throw new Error("allowance ledger current epoch is missing");
    return epoch;
  }

  private epoch(snapshot: UsageSnapshot): AllowanceEpoch {
    return { id: contentId("allowance-epoch", snapshot, 20), snapshot: structuredClone(snapshot), openedAt: new Date().toISOString() };
  }

  private migrate(legacy: LegacyAllowanceState): AllowanceState {
    const epoch = this.epoch(legacy.snapshot);
    const reservations = legacy.reservations.map((entry) => ({ ...entry, epochId: epoch.id }));
    if (legacy.settledOpenaiUnits > 0 || legacy.settledAnthropicUnits > 0) reservations.push({
      runId: "v1-migrated-settlement", epochId: epoch.id, openaiUnits: 0, anthropicUnits: 0,
      reservedAt: epoch.openedAt, state: "settled", actualOpenaiUnits: legacy.settledOpenaiUnits, actualAnthropicUnits: legacy.settledAnthropicUnits,
    });
    return { schemaVersion: 2, epochs: [epoch], currentEpochId: epoch.id, reservations };
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = resolve(dirname(this.path), `.${Date.now()}-${process.pid}.allowance.tmp`);
    writeFileSync(temp, `${JSON.stringify(this.state, null, 2)}\n`, { flag: "wx" });
    renameSync(temp, this.path);
  }
}

export interface CalibrationProfile {
  schemaVersion: 1 | 2;
  createdAt: string;
  beforeSnapshot: string;
  afterSnapshot: string;
  candidateExecutions: number;
  judgeCalls: number;
  estimates: UsageEstimate[];
  allowanceKinds?: { openai: "remainingPercent"; anthropic: "remainingPercent" };
  conversionFactors?: { openai: number; anthropic: number };
  rawWeights?: { openai: number; anthropic: number };
  observedDrops?: { openai: number; anthropic: number };
  accountedDrops?: { openai: number; anthropic: number };
  censored?: { openai: boolean; anthropic: boolean };
  displayResolutionUpperBound?: number;
  snapshotHashes?: { before: string; after: string };
  groupUpperMargin?: number;
}

export function validateCalibration(profile: CalibrationProfile): void {
  if (profile.schemaVersion === 2) {
    if (profile.allowanceKinds?.openai !== "remainingPercent" || profile.allowanceKinds?.anthropic !== "remainingPercent") throw new Error("calibration profile allowance kinds are invalid");
    for (const factor of [profile.conversionFactors?.openai, profile.conversionFactors?.anthropic]) if (!Number.isFinite(factor) || factor! <= 0) throw new Error("calibration conversion factors must be positive");
    if (profile.groupUpperMargin !== 0.2) throw new Error("calibration profile must retain the 20% per-group upper margin");
    if (profile.candidateExecutions !== 3 || profile.judgeCalls !== 6) throw new Error("schema-v2 calibration must contain exactly 3 candidates and 6 judges");
    if (profile.displayResolutionUpperBound !== 1) throw new Error("calibration display-resolution upper bound must be one percentage point");
    for (const value of [profile.rawWeights?.openai, profile.rawWeights?.anthropic, profile.accountedDrops?.openai, profile.accountedDrops?.anthropic]) if (!Number.isFinite(value) || value! <= 0) throw new Error("calibration raw weights and accounted drops must be positive");
    if (!profile.snapshotHashes?.before || !profile.snapshotHashes.after) throw new Error("calibration snapshot hashes are missing");
  }
  if (profile.candidateExecutions > 24) throw new Error("calibration exceeds the 24-candidate cap");
  if (profile.judgeCalls > 60) throw new Error("calibration exceeds the 60-judge-call cap");
  if (profile.estimates.length === 0) throw new Error("calibration contains no usage estimates");
  for (const estimate of profile.estimates) {
    if (estimate.upperUnits < estimate.meanUnits || estimate.upperUnits <= 0 || estimate.sampleSize <= 0) {
      throw new Error(`invalid calibration estimate for ${estimate.model}/${estimate.role}`);
    }
  }
}

function readUsageSnapshotObject(snapshot: UsageSnapshot): void {
  if (snapshot.schemaVersion !== 1 || snapshot.providers?.openai?.source !== "manual-provider-dashboard" || snapshot.providers?.anthropic?.source !== "manual-provider-dashboard") throw new Error("usage snapshot must contain manual-provider-dashboard OpenAI and Anthropic allowances");
  for (const [provider, allowance] of Object.entries(snapshot.providers)) validateAllowance(provider, allowance);
}

function upper(
  estimates: UsageEstimate[],
  provider: UsageEstimate["provider"],
  role: UsageEstimate["role"],
  model?: string,
): number {
  const matching = estimates.filter((estimate) => estimate.provider === provider && estimate.role === role && (!model || estimate.model === model));
  if (matching.length === 0) throw new Error(`missing ${provider} ${role} calibration estimate${model ? ` for ${model}` : ""}`);
  return Math.max(...matching.map((estimate) => estimate.upperUnits));
}

export function worstCaseReservation(
  runId: string,
  assignment: Assignment,
  estimates: UsageEstimate[],
): ReservationRequest {
  const sol = upper(estimates, "openai", "orchestrator");
  const openaiWorker = upper(estimates, "openai", "worker");
  const anthropicWorker = upper(estimates, "anthropic", "worker");
  const gptJudge = upper(estimates, "openai", "judge");
  const claudeJudge = upper(estimates, "anthropic", "judge");
  const workerSlots = assignment.topology === "single" ? 1 : 4;
  // Reserve each provider's calibrated worst case for all allowed slots. This
  // intentionally over-reserves mixed rosters and safely covers deterministic
  // rotation, two mandatory judges, and either family as the possible tie-break.
  const openai = sol + workerSlots * openaiWorker + 2 * gptJudge;
  const anthropic = workerSlots * anthropicWorker + 2 * claudeJudge;
  return {
    runId,
    openaiUnits: Number((openai * 1.2).toFixed(6)),
    anthropicUnits: Number((anthropic * 1.2).toFixed(6)),
  };
}

export function enforceCalibrationAllowanceCap(
  before: UsageSnapshot,
  observedOpenaiUnits: number,
  observedAnthropicUnits: number,
): void {
  if (observedOpenaiUnits > availableUnits(before.providers.openai) * 0.1) {
    throw new Error("calibration consumed more than 10% of reported OpenAI remaining allowance");
  }
  if (observedAnthropicUnits > availableUnits(before.providers.anthropic) * 0.1) {
    throw new Error("calibration consumed more than 10% of reported Anthropic remaining allowance");
  }
}
