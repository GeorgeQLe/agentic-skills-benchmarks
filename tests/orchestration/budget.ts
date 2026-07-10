import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Assignment,
  ProviderAllowance,
  Reservation,
  ReservationRequest,
  UsageEstimate,
  UsageSnapshot,
} from "./types.js";

export interface AllowanceState {
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

function availableUnits(allowance: ProviderAllowance): number {
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
      this.state = JSON.parse(readFileSync(path, "utf8")) as AllowanceState;
    } else {
      if (!snapshot) throw new Error("a manual usage snapshot is required to initialize the allowance ledger");
      this.state = { schemaVersion: 1, snapshot, reservations: [], settledOpenaiUnits: 0, settledAnthropicUnits: 0 };
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
    const reservation: Reservation = { ...request, reservedAt: new Date().toISOString(), state: "reserved" };
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
    this.state.settledOpenaiUnits += actualOpenaiUnits;
    this.state.settledAnthropicUnits += actualAnthropicUnits;
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
    const active = this.state.reservations.filter((entry) => entry.state === "reserved");
    const reservedOpenai = active.reduce((total, entry) => total + entry.openaiUnits, 0);
    const reservedAnthropic = active.reduce((total, entry) => total + entry.anthropicUnits, 0);
    return {
      openai: Math.max(0, availableUnits(this.state.snapshot.providers.openai) - this.state.settledOpenaiUnits - reservedOpenai),
      anthropic: Math.max(0, availableUnits(this.state.snapshot.providers.anthropic) - this.state.settledAnthropicUnits - reservedAnthropic),
      reservedOpenai,
      reservedAnthropic,
    };
  }

  snapshot(): AllowanceState {
    return structuredClone(this.state);
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = resolve(dirname(this.path), `.${Date.now()}-${process.pid}.allowance.tmp`);
    writeFileSync(temp, `${JSON.stringify(this.state, null, 2)}\n`, { flag: "wx" });
    renameSync(temp, this.path);
  }
}

export interface CalibrationProfile {
  schemaVersion: 1;
  createdAt: string;
  beforeSnapshot: string;
  afterSnapshot: string;
  candidateExecutions: number;
  judgeCalls: number;
  estimates: UsageEstimate[];
}

export function validateCalibration(profile: CalibrationProfile): void {
  if (profile.candidateExecutions > 24) throw new Error("calibration exceeds the 24-candidate cap");
  if (profile.judgeCalls > 60) throw new Error("calibration exceeds the 60-judge-call cap");
  if (profile.estimates.length === 0) throw new Error("calibration contains no usage estimates");
  for (const estimate of profile.estimates) {
    if (estimate.upperUnits < estimate.meanUnits || estimate.upperUnits <= 0 || estimate.sampleSize <= 0) {
      throw new Error(`invalid calibration estimate for ${estimate.model}/${estimate.role}`);
    }
  }
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
