import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { DEFAULT_PITWALL_TOKEN_FILE, isPitwallSetupProblem, type AllowanceSnapshotProvider } from "./pitwall.js";
import type { UsageSnapshot } from "./types.js";

export const PITWALL_APP_PATH = "/Applications/Pitwall.app";
export const PITWALL_DEFAULTS_DOMAIN = "com.pitwall.app";
export const PITWALL_API_PORT = 19440;
export const PITWALL_SETTINGS_KEY = "pitwall.phase4.settings.v1";

export interface PitwallApiSetup {
  enableAndWait(provider: AllowanceSnapshotProvider): Promise<UsageSnapshot>;
}

export interface PitwallSetupOptions {
  platform?: NodeJS.Platform;
  appExists?: (path: string) => boolean;
  run?: (file: string, args: string[], input?: string) => string;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  tokenFile?: string;
  tokenMode?: (path: string) => number;
}

export type PitwallPreferences = Record<string, unknown>;

function defaultPhase4Settings(): PitwallPreferences {
  return {
    history: { isEnabled: true, retentionDays: 7 },
    diagnostics: { includeRecentEvents: true },
    notifications: { resetNotificationsEnabled: true, expiredAuthNotificationsEnabled: true, telemetryDegradedNotificationsEnabled: true, pacingThresholdNotificationsEnabled: false, pacingThreshold: "warning" },
    gitHubHeatmap: { isEnabled: false, username: "", tokenState: "missing" },
  };
}

export function decodePitwallPreferences(value: string): PitwallPreferences {
  const decoded = JSON.parse(Buffer.from(value.trim(), "base64").toString("utf8")) as unknown;
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Pitwall preferences are malformed");
  return decoded as PitwallPreferences;
}

export function encodePitwallPreferences(value: PitwallPreferences): string {
  const updated = JSON.stringify({ ...value, localHTTPAPI: { isEnabled: true, port: PITWALL_API_PORT } });
  return Buffer.from(updated).toString("hex");
}

export class MacPitwallApiSetup implements PitwallApiSetup {
  private readonly options: Required<Omit<PitwallSetupOptions, "tokenFile">> & { tokenFile: string };

  constructor(options: PitwallSetupOptions = {}) {
    this.options = {
      platform: options.platform ?? process.platform,
      appExists: options.appExists ?? existsSync,
      run: options.run ?? ((file, args, input) => execFileSync(file, args, { encoding: "utf8", input })),
      sleep: options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))),
      now: options.now ?? Date.now,
      timeoutMs: options.timeoutMs ?? 30_000,
      tokenFile: options.tokenFile ?? DEFAULT_PITWALL_TOKEN_FILE,
      tokenMode: options.tokenMode ?? ((path) => statSync(path).mode & 0o777),
    };
  }

  async enableAndWait(provider: AllowanceSnapshotProvider): Promise<UsageSnapshot> {
    if (this.options.platform !== "darwin") throw new Error("--enable-pitwall-api is supported only on macOS");
    if (!this.options.appExists(PITWALL_APP_PATH)) throw new Error(`Pitwall is not installed at ${PITWALL_APP_PATH}`);

    try { this.options.run("/usr/bin/osascript", ["-e", 'tell application "Pitwall" to quit']); } catch { /* already stopped */ }
    try { this.options.run("/usr/bin/killall", ["-TERM", "PitwallApp"]); } catch { /* already stopped */ }
    let settings = defaultPhase4Settings();
    try {
      const plist = this.options.run("/usr/bin/defaults", ["export", PITWALL_DEFAULTS_DOMAIN, "-"]);
      const raw = this.options.run("/usr/bin/plutil", ["-extract", PITWALL_SETTINGS_KEY.replaceAll(".", "\\."), "raw", "-o", "-", "--", "-"], plist);
      settings = decodePitwallPreferences(raw);
    } catch { /* a new settings key uses Pitwall's defaults */ }
    this.options.run("/usr/bin/defaults", ["write", PITWALL_DEFAULTS_DOMAIN, PITWALL_SETTINGS_KEY, "-data", encodePitwallPreferences(settings)]);
    this.options.run("/usr/bin/open", ["-n", PITWALL_APP_PATH]);

    const deadline = this.options.now() + this.options.timeoutMs;
    let lastError: unknown;
    while (this.options.now() < deadline) {
      let snapshot: UsageSnapshot;
      try {
        snapshot = await provider.snapshot();
      } catch (error) {
        if (!isPitwallSetupProblem(error)) throw error;
        lastError = error;
        await this.options.sleep(500);
        continue;
      }
      const mode = this.options.tokenMode(this.options.tokenFile);
      if ((mode & 0o077) !== 0) throw new Error("Pitwall API token file must be owner-only");
      return snapshot;
    }
    throw new Error(`Pitwall API setup timed out after ${this.options.timeoutMs / 1000} seconds${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
  }
}
