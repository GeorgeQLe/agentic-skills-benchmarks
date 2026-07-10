import { homedir } from "node:os";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { PITWALL_PROVIDER_WINDOWS, PITWALL_SOURCE_KIND, type ProviderAllowance, type UsageSnapshot } from "./types.js";
import { validatePercentageSnapshot } from "./budget.js";

export const DEFAULT_PITWALL_URL = "http://127.0.0.1:19440";
export const DEFAULT_PITWALL_TOKEN_FILE = resolve(homedir(), "Library/Application Support/Pitwall/local-api-token");

export function validatePitwallBaseUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("Pitwall URL must be an HTTP loopback origin"); }
  const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:"
    || !allowedHosts.has(url.hostname)
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || url.pathname !== "/") {
    throw new Error("Pitwall URL must be an HTTP loopback origin with no credentials, path, query, or fragment");
  }
  return url.origin;
}

export interface AllowanceSnapshotProvider {
  snapshot(): Promise<UsageSnapshot>;
}

export interface PitwallClientOptions {
  baseUrl?: string;
  tokenFile?: string;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}

interface PitwallWindowPayload {
  window?: unknown;
  scope?: unknown;
  usedPercent?: unknown;
  remainingPercent?: unknown;
  durationSeconds?: unknown;
  resetAt?: unknown;
  observedAt?: unknown;
  confidence?: unknown;
}

interface PitwallPayload {
  schemaVersion?: unknown;
  capturedAt?: unknown;
  providers?: { openai?: PitwallWindowPayload; anthropic?: PitwallWindowPayload };
}

function finitePercentage(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Pitwall ${label} is invalid`);
  return value;
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`Pitwall ${label} is invalid`);
  return value;
}

function normalizeProvider(input: PitwallWindowPayload | undefined, provider: "openai" | "anthropic"): ProviderAllowance {
  if (!input) throw new Error(`Pitwall ${provider} telemetry is missing`);
  const usedPercent = finitePercentage(input.usedPercent, `${provider} usedPercent`);
  const remainingPercent = finitePercentage(input.remainingPercent, `${provider} remainingPercent`);
  if (Math.abs(remainingPercent - (100 - usedPercent)) > 0.000_001) throw new Error(`Pitwall ${provider} percentage values disagree`);
  const resetAt = timestamp(input.resetAt, `${provider} resetAt`);
  const observedAt = timestamp(input.observedAt, `${provider} observedAt`);
  if (provider === "openai") {
    if (input.window !== PITWALL_PROVIDER_WINDOWS.openai.window || input.scope !== undefined) throw new Error("Pitwall OpenAI window mapping is not primary five-hour");
    if (input.confidence !== "providerSupplied") throw new Error("Pitwall OpenAI confidence is not provider-supplied");
    if (input.durationSeconds !== 18_000) throw new Error("Pitwall OpenAI window duration is not five hours");
    return { source: PITWALL_SOURCE_KIND, window: input.window, usedPercent, remainingPercent, durationSeconds: 18_000, resetAt, observedAt, confidence: input.confidence };
  }
  if (input.window !== PITWALL_PROVIDER_WINDOWS.anthropic.window || input.scope !== PITWALL_PROVIDER_WINDOWS.anthropic.scope) throw new Error("Pitwall Anthropic window mapping is not seven-day All Models");
  if (input.confidence !== "exact") throw new Error("Pitwall Anthropic confidence is not exact");
  return { source: PITWALL_SOURCE_KIND, window: input.window, scope: input.scope, usedPercent, remainingPercent, resetAt, observedAt, confidence: input.confidence };
}

export function normalizePitwallSnapshot(payload: PitwallPayload, now = Date.now()): UsageSnapshot {
  if (payload.schemaVersion !== 1) throw new Error("Pitwall allowance snapshot schema is unsupported");
  const capturedAt = timestamp(payload.capturedAt, "capturedAt");
  const snapshot: UsageSnapshot = {
    schemaVersion: 1,
    capturedAt,
    providers: {
      openai: normalizeProvider(payload.providers?.openai, "openai"),
      anthropic: normalizeProvider(payload.providers?.anthropic, "anthropic"),
    },
  };
  validatePercentageSnapshot(snapshot, { now, maxAgeMs: 5 * 60_000, requirePitwall: true });
  return snapshot;
}

export class PitwallClient implements AllowanceSnapshotProvider {
  private readonly baseUrl: string;
  private readonly tokenFile: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly now: () => number;

  constructor(options: PitwallClientOptions = {}) {
    this.baseUrl = validatePitwallBaseUrl(options.baseUrl ?? DEFAULT_PITWALL_URL);
    this.tokenFile = options.tokenFile ?? process.env.PITWALL_API_TOKEN_FILE ?? DEFAULT_PITWALL_TOKEN_FILE;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
  }

  async snapshot(): Promise<UsageSnapshot> {
    let token: string;
    try { token = readFileSync(this.tokenFile, "utf8").trim(); }
    catch { throw new Error("Pitwall API token file is unavailable"); }
    if (!token) throw new Error("Pitwall API token file is empty");

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/v1/allowance-snapshot`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch {
      throw new Error("Pitwall allowance snapshot request failed");
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("Pitwall allowance snapshot authentication failed");
      throw new Error(`Pitwall allowance snapshot unavailable (HTTP ${response.status})`);
    }
    let payload: PitwallPayload;
    try { payload = await response.json() as PitwallPayload; }
    catch { throw new Error("Pitwall allowance snapshot response is malformed"); }
    return normalizePitwallSnapshot(payload, this.now());
  }
}
