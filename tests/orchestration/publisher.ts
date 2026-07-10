import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import {
  createChunkArchive,
  extractDeterministicArchive,
  reassembleArchiveParts,
  ARCHIVE_PART_BYTES,
  type ArchiveIndex,
  type ArchivePart,
} from "./archive.js";
import { hashFile, sha256 } from "./canonical.js";
import { CampaignStore, type CampaignChunkState, type CampaignState } from "./campaign.js";
import { verifyRunOwnership } from "./isolation.js";
import { assertWithin } from "./paths.js";
import { buildCampaignReport, loadExecutionResults, persistCompactResults, writeCampaignReport } from "./report.js";
import type { ExecutionResult } from "./runner.js";
import { loadChunks, scheduleFullChunk } from "./scheduler.js";
import type { RunIdentity } from "./types.js";

export type PublisherChunkStatus =
  | "local"
  | "uploading"
  | "pushed"
  | "verifying"
  | "verified"
  | "cleaned-local"
  | "cleaned";

export interface PublisherChunkProgress {
  chunkId: string;
  ordinal: number;
  state: PublisherChunkStatus;
  releaseTag?: string;
  archiveSha256?: string;
  archiveBytes?: number;
  parts?: ArchivePart[];
  remoteCommits: {
    index?: string;
    verified?: string;
    cleanup?: string;
  };
  attempts: number;
  consecutiveFailures: number;
  nextRetryAt?: string;
  lastError?: string;
  updatedAt: string;
}

export interface PublisherState {
  schemaVersion: 1;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  chunks: Record<string, PublisherChunkProgress>;
}

export interface PublisherEvent {
  schemaVersion: 1;
  at: string;
  campaignId: string;
  type: string;
  chunkId?: string;
  ordinal?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface PublisherAsset {
  name: string;
  bytes: number;
  /** A bare SHA-256 or GitHub's `sha256:<digest>` form. */
  sha256?: string;
}

export interface PublisherRemoteFile {
  source: string;
  target: string;
}

/** Injectable boundary used by the real GitHub implementation and offline fakes. */
export interface PublisherTransport {
  prepare(): Promise<void>;
  pushFiles(files: PublisherRemoteFile[], message: string): Promise<string>;
  ensureRelease(input: { tag: string; targetCommit: string; title: string; notes: string }): Promise<void>;
  listReleaseAssets(tag: string): Promise<PublisherAsset[]>;
  uploadReleaseAsset(tag: string, source: string, name: string): Promise<void>;
  deleteReleaseAsset(tag: string, name: string): Promise<void>;
  cloneAtCommit(commit: string, target: string): Promise<void>;
  downloadReleaseAsset(tag: string, name: string, target: string): Promise<void>;
}

export interface ChunkEligibility {
  eligible: boolean;
  runIds: string[];
  reasons: string[];
}

export interface PublisherSweepResult {
  eligible: number;
  processed: number;
  failed: number;
  skipped: number;
}

export interface PublisherCoordinatorOptions {
  store: CampaignStore;
  transport: PublisherTransport;
  pollSeconds?: number;
  retryBaseSeconds?: number;
  retryMaxSeconds?: number;
  once?: boolean;
  dryRun?: boolean;
  json?: boolean;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  pid?: number;
  isPidActive?: (pid: number) => boolean;
  /** Internal/manual command controls. The standalone watcher always cleans. */
  targetChunkOrdinal?: number;
  targetChunkId?: string;
  cleanup?: boolean;
  cleanupOnly?: boolean;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = resolve(dirname(path), `.${basename(path)}-${process.pid}-${Date.now()}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  renameSync(temporary, path);
}

function durableAppend(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(path, "a", 0o600);
  try {
    appendFileSync(descriptor, `${JSON.stringify(value)}\n`);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function defaultPidActive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export interface PublisherLockMetadata {
  schemaVersion: 1;
  campaignId: string;
  pid: number;
  startedAt: string;
}

export class PublisherLock {
  readonly path: string;
  private held?: PublisherLockMetadata;

  constructor(
    private readonly store: CampaignStore,
    private readonly pid = process.pid,
    private readonly now: () => Date = () => new Date(),
    private readonly isPidActive: (pid: number) => boolean = defaultPidActive,
  ) {
    this.path = resolve(store.root, "publisher", "lock.json");
  }

  acquire(): PublisherLockMetadata {
    mkdirSync(dirname(this.path), { recursive: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      const metadata: PublisherLockMetadata = {
        schemaVersion: 1,
        campaignId: this.store.campaignId,
        pid: this.pid,
        startedAt: this.now().toISOString(),
      };
      try {
        writeFileSync(this.path, `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx", mode: 0o600 });
        this.held = metadata;
        return metadata;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      let current: PublisherLockMetadata;
      try {
        current = JSON.parse(readFileSync(this.path, "utf8")) as PublisherLockMetadata;
      } catch {
        throw new Error(`publisher lock is unreadable and cannot be proven stale: ${this.path}`);
      }
      if (
        current.schemaVersion !== 1
        || current.campaignId !== this.store.campaignId
        || !Number.isInteger(current.pid)
        || current.pid <= 0
      ) {
        throw new Error(`publisher lock metadata is invalid and cannot be proven stale: ${this.path}`);
      }
      if (this.isPidActive(current.pid)) {
        throw new Error(`publisher already active for ${this.store.campaignId} (pid ${current.pid}, started ${current.startedAt})`);
      }
      // Re-read before removal so a replacement lock is never mistaken for the
      // stale instance we inspected.
      const unchanged = readFileSync(this.path, "utf8");
      if (unchanged.trim() !== JSON.stringify(current, null, 2)) continue;
      rmSync(this.path, { force: true });
    }
    throw new Error(`could not acquire publisher lock for ${this.store.campaignId}`);
  }

  release(): void {
    if (!this.held || !existsSync(this.path)) return;
    try {
      const current = JSON.parse(readFileSync(this.path, "utf8")) as PublisherLockMetadata;
      if (current.pid === this.held.pid && current.startedAt === this.held.startedAt) rmSync(this.path, { force: true });
    } finally {
      this.held = undefined;
    }
  }
}

export class PublisherStateStore {
  readonly root: string;
  readonly statePath: string;
  readonly eventsPath: string;

  constructor(readonly campaignId: string, campaignRoot: string, private readonly now: () => Date = () => new Date()) {
    this.root = resolve(campaignRoot, "publisher");
    this.statePath = resolve(this.root, "state.json");
    this.eventsPath = resolve(this.root, "events.jsonl");
  }

  load(): PublisherState {
    if (!existsSync(this.statePath)) {
      const at = this.now().toISOString();
      return { schemaVersion: 1, campaignId: this.campaignId, createdAt: at, updatedAt: at, chunks: {} };
    }
    const state = JSON.parse(readFileSync(this.statePath, "utf8")) as PublisherState;
    if (state.schemaVersion !== 1 || state.campaignId !== this.campaignId || !state.chunks) {
      throw new Error(`publisher state ownership or schema mismatch for ${this.campaignId}`);
    }
    return state;
  }

  save(state: PublisherState): void {
    if (state.campaignId !== this.campaignId) throw new Error("publisher state campaign ownership mismatch");
    state.updatedAt = this.now().toISOString();
    atomicJson(this.statePath, state);
  }

  append(event: PublisherEvent): void {
    durableAppend(this.eventsPath, event);
  }
}

const TRANSITIONS: Record<PublisherChunkStatus, PublisherChunkStatus[]> = {
  local: ["uploading"],
  uploading: ["uploading", "pushed"],
  pushed: ["verifying"],
  verifying: ["verifying", "verified"],
  verified: ["cleaned-local"],
  "cleaned-local": ["cleaned"],
  cleaned: [],
};

export function assertPublisherTransition(from: PublisherChunkStatus, to: PublisherChunkStatus): void {
  if (!TRANSITIONS[from].includes(to)) throw new Error(`invalid publisher transition ${from} -> ${to}`);
}

export function publisherRetryDelayMs(
  chunkId: string,
  consecutiveFailures: number,
  baseSeconds = 30,
  maxSeconds = 900,
): number {
  if (!Number.isFinite(baseSeconds) || baseSeconds <= 0 || !Number.isFinite(maxSeconds) || maxSeconds < baseSeconds) {
    throw new Error("publisher retry bounds must be positive and max must be at least base");
  }
  const exponent = Math.max(0, Math.floor(consecutiveFailures) - 1);
  const capped = Math.min(maxSeconds * 1_000, baseSeconds * 1_000 * 2 ** Math.min(exponent, 30));
  const unit = Number.parseInt(sha256(`${chunkId}:${consecutiveFailures}`).slice(0, 8), 16) / 0xffffffff;
  // Downward jitter preserves a hard maximum while avoiding synchronized retries.
  return Math.max(1, Math.floor(capped * (0.8 + unit * 0.2)));
}

function sameIdentity(left: RunIdentity, right: RunIdentity): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function chunkEligibility(
  state: CampaignState,
  chunk: CampaignChunkState,
  expectedRuns = scheduleFullChunk(chunk.ordinal).map((entry) => entry.run),
): ChunkEligibility {
  const reasons: string[] = [];
  const manifestChunk = loadChunks()[chunk.ordinal];
  if (!manifestChunk || manifestChunk.id !== chunk.chunkId) reasons.push(`chunk ownership mismatch at ordinal ${chunk.ordinal}`);
  if (chunk.expectedRuns !== expectedRuns.length) reasons.push(`expected run count is ${chunk.expectedRuns}, manifest requires ${expectedRuns.length}`);
  for (const expected of expectedRuns) {
    const registered = state.runs[expected.id];
    if (!registered) reasons.push(`run is not registered: ${expected.id}`);
    else if (!sameIdentity(registered.run, expected)) reasons.push(`run identity changed: ${expected.id}`);
    else if (registered.status !== "judged") reasons.push(`run is ${registered.status}: ${expected.id}`);
  }
  return { eligible: reasons.length === 0, runIds: expectedRuns.map((run) => run.id), reasons };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertValidResultArtifact(path: string, expected: RunIdentity, extractionRoot?: string): ExecutionResult {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`result artifact is not an owned regular file: ${path}`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.run)) throw new Error(`result schema mismatch: ${expected.id}`);
  const result = parsed as unknown as ExecutionResult;
  if (!sameIdentity(result.run, expected)) throw new Error(`result identity mismatch: ${expected.id}`);
  if (result.assignmentId !== expected.assignmentId || result.scenarioId !== expected.scenarioId) throw new Error(`result ownership fields mismatch: ${expected.id}`);
  if (!Array.isArray(result.judges) || result.judges.length < 2) throw new Error(`result judges schema mismatch: ${expected.id}`);
  if (!isRecord(result.usage) || !isRecord(result.deterministic)) throw new Error(`result evaluation schema mismatch: ${expected.id}`);
  if (typeof result.attemptRoot !== "string" || !result.attemptRoot.startsWith(`runs/${expected.id}/attempts/attempt-`)) {
    throw new Error(`result attempt ownership mismatch: ${expected.id}`);
  }
  if (extractionRoot) {
    const artifacts = assertWithin(extractionRoot, resolve(extractionRoot, result.attemptRoot, "artifacts"));
    if (!existsSync(artifacts) || !lstatSync(artifacts).isDirectory()) throw new Error(`result artifacts are missing: ${expected.id}`);
  }
  return result;
}

export function inspectChunkEligibility(store: CampaignStore, state: CampaignState, chunk: CampaignChunkState): ChunkEligibility {
  const scheduled = scheduleFullChunk(chunk.ordinal).map((entry) => entry.run);
  const eligibility = chunkEligibility(state, chunk, scheduled);
  if (!eligibility.eligible) return eligibility;
  for (const expected of scheduled) {
    try {
      const runRoot = assertWithin(resolve(store.root, "runs"), resolve(store.root, "runs", expected.id));
      const stats = lstatSync(runRoot);
      if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("run root is not an owned directory");
      verifyRunOwnership(runRoot, expected.id);
      assertValidResultArtifact(resolve(runRoot, "result.json"), expected);
    } catch (error) {
      eligibility.reasons.push(`${expected.id}: ${(error as Error).message}`);
    }
  }
  eligibility.eligible = eligibility.reasons.length === 0;
  return eligibility;
}

function normalizeDigest(value?: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith("sha256:") ? value.slice("sha256:".length).toLowerCase() : value.toLowerCase();
}

function collectRemoteFiles(root: string, targetRoot: string): PublisherRemoteFile[] {
  const files: PublisherRemoteFile[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      const stats = lstatSync(path);
      if (stats.isSymbolicLink()) throw new Error(`refusing to publish symlink: ${path}`);
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile()) files.push({ source: path, target: `${targetRoot}/${relative(root, path).split(sep).join("/")}` });
    }
  };
  if (existsSync(root)) visit(root);
  return files;
}

class ShutdownRequested extends Error {}

export class PublisherCoordinator {
  private readonly ledger: PublisherStateStore;
  private readonly lock: PublisherLock;
  private readonly now: () => Date;
  private readonly stdout: Pick<NodeJS.WriteStream, "write">;
  private readonly stderr: Pick<NodeJS.WriteStream, "write">;
  private stopping = false;
  private wake?: () => void;

  constructor(private readonly options: PublisherCoordinatorOptions) {
    this.now = options.now ?? (() => new Date());
    this.stdout = options.stdout ?? process.stdout;
    this.stderr = options.stderr ?? process.stderr;
    this.ledger = new PublisherStateStore(options.store.campaignId, options.store.root, this.now);
    this.lock = new PublisherLock(options.store, options.pid ?? process.pid, this.now, options.isPidActive ?? defaultPidActive);
  }

  requestStop(signal = "requested"): void {
    if (this.stopping) return;
    this.stopping = true;
    this.emit("shutdown-requested", undefined, `stopping after the active atomic operation (${signal})`, undefined, !this.options.dryRun);
    this.wake?.();
  }

  private emit(
    type: string,
    chunk?: CampaignChunkState | PublisherChunkProgress,
    message?: string,
    data?: Record<string, unknown>,
    persist = true,
  ): void {
    const event: PublisherEvent = {
      schemaVersion: 1,
      at: this.now().toISOString(),
      campaignId: this.options.store.campaignId,
      type,
      ...(chunk ? { chunkId: chunk.chunkId, ordinal: chunk.ordinal } : {}),
      ...(message ? { message } : {}),
      ...(data ? { data } : {}),
    };
    if (persist) this.ledger.append(event);
    if (this.options.json) this.stdout.write(`${JSON.stringify(event)}\n`);
    else this.stdout.write(`${event.at} ${type}${event.chunkId ? ` ${event.chunkId}` : ""}${message ? ` ${message}` : ""}\n`);
  }

  private checkStop(): void {
    if (this.stopping) throw new ShutdownRequested("publisher shutdown requested");
  }

  private writeError(message: string, chunk?: CampaignChunkState): void {
    if (this.options.json) {
      this.stderr.write(`${JSON.stringify({
        schemaVersion: 1,
        type: "publisher-error",
        campaignId: this.options.store.campaignId,
        ...(chunk ? { chunkId: chunk.chunkId, ordinal: chunk.ordinal } : {}),
        message,
      })}\n`);
    } else {
      this.stderr.write(`${chunk ? `${chunk.chunkId}: ` : ""}${message}\n`);
    }
  }

  private progress(state: PublisherState, chunk: CampaignChunkState): PublisherChunkProgress {
    const current = state.chunks[chunk.chunkId];
    if (current) {
      if (current.ordinal !== chunk.ordinal) throw new Error(`publisher chunk ownership mismatch for ${chunk.chunkId}`);
      return current;
    }
    const at = this.now().toISOString();
    const created: PublisherChunkProgress = {
      chunkId: chunk.chunkId,
      ordinal: chunk.ordinal,
      state: "local",
      remoteCommits: {},
      attempts: 0,
      consecutiveFailures: 0,
      updatedAt: at,
    };
    state.chunks[chunk.chunkId] = created;
    return created;
  }

  private transition(state: PublisherState, chunk: PublisherChunkProgress, next: PublisherChunkStatus): void {
    assertPublisherTransition(chunk.state, next);
    chunk.state = next;
    chunk.updatedAt = this.now().toISOString();
    this.ledger.save(state);
    this.emit("state-transition", chunk, next, { state: next });
  }

  private remoteFiles(stateSource = this.ledger.statePath): PublisherRemoteFile[] {
    const campaignId = this.options.store.campaignId;
    const files: PublisherRemoteFile[] = [
      { source: this.options.store.statePath, target: `campaigns/${campaignId}/campaign.json` },
      { source: stateSource, target: `publisher/${campaignId}/state.json` },
    ];
    const compactResults = resolve(this.options.store.root, "compact-results.jsonl");
    if (existsSync(compactResults)) files.push({ source: compactResults, target: `indexes/${campaignId}/compact-results.jsonl` });
    if (existsSync(this.ledger.eventsPath)) files.push({ source: this.ledger.eventsPath, target: `publisher/${campaignId}/events.jsonl` });
    files.push(...collectRemoteFiles(resolve(this.options.store.root, "reports"), `reports/${campaignId}`));
    files.push(...collectRemoteFiles(resolve(this.options.store.root, "archives"), `indexes/${campaignId}`)
      .filter((file) => file.source.endsWith(".index.json"))
      .map((file) => ({ ...file, target: file.target.replace(/\.index\.json$/, ".json") })));
    files.push(...collectRemoteFiles(resolve(this.ledger.root, "verified"), `verified/${campaignId}`));
    files.push(...collectRemoteFiles(resolve(this.options.store.root, "cleanup-receipts"), `cleanup-receipts/${campaignId}`));
    return files;
  }

  private async pushProjectedState(state: PublisherState, message: string): Promise<string> {
    const scratch = mkdtempSync(resolve(tmpdir(), "sol-publisher-state-"));
    try {
      const projection = resolve(scratch, "state.json");
      atomicJson(projection, state);
      return await this.options.transport.pushFiles(this.remoteFiles(projection), message);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  private async assetMatches(tag: string, asset: PublisherAsset, expected: ArchivePart): Promise<boolean> {
    if (asset.bytes !== expected.bytes) return false;
    const digest = normalizeDigest(asset.sha256);
    if (digest) return digest === expected.sha256;
    const scratch = mkdtempSync(resolve(tmpdir(), "sol-publisher-asset-"));
    try {
      const target = resolve(scratch, expected.name);
      await this.options.transport.downloadReleaseAsset(tag, expected.name, target);
      return statSync(target).size === expected.bytes && hashFile(target) === expected.sha256;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  private async ensureAssets(index: ArchiveIndex): Promise<void> {
    let assets = await this.options.transport.listReleaseAssets(index.releaseTag);
    for (const part of [...index.parts].sort((a, b) => a.ordinal - b.ordinal)) {
      this.checkStop();
      const matches = assets.filter((asset) => asset.name === part.name);
      if (matches.length > 1) throw new Error(`release contains duplicate owned asset name: ${part.name}`);
      if (matches.length === 1 && await this.assetMatches(index.releaseTag, matches[0], part)) continue;
      if (matches.length === 1) {
        // The deterministic tag and exact expected part name establish ownership;
        // unrelated release assets are never removed.
        await this.options.transport.deleteReleaseAsset(index.releaseTag, part.name);
      }
      this.checkStop();
      await this.options.transport.uploadReleaseAsset(
        index.releaseTag,
        resolve(this.options.store.root, "archives", part.name),
        part.name,
      );
      assets = await this.options.transport.listReleaseAssets(index.releaseTag);
      const uploaded = assets.find((asset) => asset.name === part.name);
      if (!uploaded || !await this.assetMatches(index.releaseTag, uploaded, part)) {
        throw new Error(`uploaded release asset failed size or digest validation: ${part.name}`);
      }
    }
  }

  private assertExtractedArchive(root: string, index: ArchiveIndex): void {
    const runsRoot = resolve(root, "runs");
    if (!existsSync(runsRoot)) throw new Error("verified archive has no runs directory");
    const actual = readdirSync(runsRoot).sort();
    const expected = [...index.runIds].sort();
    if (actual.join("\0") !== expected.join("\0")) throw new Error("verified archive run ID set does not match its committed index");
    const identities = new Map(scheduleFullChunk(index.chunkOrdinal).map((entry) => [entry.run.id, entry.run]));
    for (const runId of expected) {
      const identity = identities.get(runId);
      if (!identity) throw new Error(`verified archive contains an unexpected run ID: ${runId}`);
      const runRoot = resolve(runsRoot, runId);
      verifyRunOwnership(runRoot, runId);
      assertValidResultArtifact(resolve(runRoot, "result.json"), identity, root);
    }
  }

  private async verifyRemote(index: ArchiveIndex, indexCommit: string): Promise<void> {
    const scratch = mkdtempSync(resolve(tmpdir(), "sol-benchmark-verify-"));
    try {
      const clone = resolve(scratch, "clone");
      await this.options.transport.cloneAtCommit(indexCommit, clone);
      const remoteIndex = resolve(clone, "indexes", index.campaignId, `${index.chunkId}.json`);
      const localIndex = resolve(this.options.store.root, "archives", `${index.chunkId}.index.json`);
      if (!existsSync(remoteIndex) || hashFile(remoteIndex) !== hashFile(localIndex)) {
        throw new Error("remote chunk index checksum does not match the local committed index");
      }
      const assets = await this.options.transport.listReleaseAssets(index.releaseTag);
      const partsRoot = resolve(scratch, "release-parts");
      mkdirSync(partsRoot, { recursive: true });
      for (const part of [...index.parts].sort((a, b) => a.ordinal - b.ordinal)) {
        this.checkStop();
        const candidates = assets.filter((asset) => asset.name === part.name);
        if (candidates.length !== 1) throw new Error(`release part is missing or duplicated: ${part.name}`);
        const target = resolve(partsRoot, part.name);
        await this.options.transport.downloadReleaseAsset(index.releaseTag, part.name, target);
        if (statSync(target).size !== part.bytes || hashFile(target) !== part.sha256) {
          throw new Error(`fresh release part checksum failed: ${part.name}`);
        }
      }
      const archive = resolve(scratch, index.archive);
      reassembleArchiveParts(partsRoot, index.parts, archive);
      if (statSync(archive).size !== index.bytes || hashFile(archive) !== index.sha256) {
        throw new Error("freshly reassembled archive checksum does not match the committed index");
      }
      const extracted = resolve(scratch, "extracted");
      mkdirSync(extracted, { recursive: true });
      extractDeterministicArchive(archive, extracted);
      this.assertExtractedArchive(extracted, index);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  private readIndex(chunk: PublisherChunkProgress): ArchiveIndex {
    const path = resolve(this.options.store.root, "archives", `${chunk.chunkId}.index.json`);
    const index = JSON.parse(readFileSync(path, "utf8")) as ArchiveIndex;
    if (index.schemaVersion !== 1 || index.campaignId !== this.options.store.campaignId || index.chunkId !== chunk.chunkId || index.chunkOrdinal !== chunk.ordinal) {
      throw new Error(`archive index ownership or schema mismatch for ${chunk.chunkId}`);
    }
    const expectedRunIds = scheduleFullChunk(chunk.ordinal).map((entry) => entry.run.id);
    const archiveName = `${chunk.chunkId}.tar.gz`;
    if (
      index.runIds.length !== index.expectedRuns
      || index.expectedRuns !== expectedRunIds.length
      || index.runIds.join("\0") !== expectedRunIds.join("\0")
      || index.archive !== archiveName
      || index.releaseTag !== `archive-${index.campaignId}-${index.chunkId}`
      || index.storage !== "github-release-assets"
      || index.partBytes !== ARCHIVE_PART_BYTES
      || !/^[a-f0-9]{64}$/.test(index.sha256)
      || !Number.isSafeInteger(index.bytes)
      || index.bytes <= 0
      || index.parts.length === 0
      || index.parts.length > 1_000
      || index.parts.some((part, ordinal) =>
        part.ordinal !== ordinal
        || part.name !== `${archiveName}.part-${String(ordinal).padStart(4, "0")}`
        || !/^[a-f0-9]{64}$/.test(part.sha256)
        || !Number.isSafeInteger(part.bytes)
        || part.bytes <= 0
        || part.bytes > ARCHIVE_PART_BYTES)
      || index.parts.reduce((sum, part) => sum + part.bytes, 0) !== index.bytes
    ) {
      throw new Error(`archive index run or part count mismatch for ${chunk.chunkId}`);
    }
    if (
      (chunk.releaseTag && chunk.releaseTag !== index.releaseTag)
      || (chunk.archiveSha256 && chunk.archiveSha256 !== index.sha256)
      || (chunk.archiveBytes !== undefined && chunk.archiveBytes !== index.bytes)
      || (chunk.parts && JSON.stringify(chunk.parts) !== JSON.stringify(index.parts))
    ) {
      throw new Error(`publisher ledger/archive index mismatch for ${chunk.chunkId}`);
    }
    return index;
  }

  private writeVerifiedIndex(chunk: PublisherChunkProgress, index: ArchiveIndex): string {
    const path = resolve(this.ledger.root, "verified", `${chunk.chunkId}.json`);
    const value = {
      schemaVersion: 1,
      campaignId: index.campaignId,
      chunkId: index.chunkId,
      chunkOrdinal: index.chunkOrdinal,
      runIds: index.runIds,
      archiveSha256: index.sha256,
      releaseTag: index.releaseTag,
      parts: index.parts,
      indexCommit: chunk.remoteCommits.index,
      verifiedAt: this.now().toISOString(),
    };
    atomicJson(path, value);
    return path;
  }

  private cleanupLocal(state: PublisherState, chunk: PublisherChunkProgress, index: ArchiveIndex): string {
    const receipts = resolve(this.options.store.root, "cleanup-receipts");
    const receiptPath = resolve(receipts, `${chunk.chunkId}.json`);
    const archivePath = resolve(this.options.store.root, "archives", index.archive);
    const receiptExists = existsSync(receiptPath);
    let receipt: Record<string, unknown>;
    if (receiptExists) {
      receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
      if (
        receipt.schemaVersion !== 1
        || receipt.campaignId !== index.campaignId
        || receipt.chunkId !== index.chunkId
        || receipt.archiveSha256 !== index.sha256
        || receipt.releaseTag !== index.releaseTag
        || !Array.isArray(receipt.runIds)
        || receipt.runIds.join("\0") !== index.runIds.join("\0")
        || !Array.isArray(receipt.parts)
        || JSON.stringify(receipt.parts) !== JSON.stringify(index.parts)
      ) {
        throw new Error(`cleanup receipt ownership or schema mismatch for ${chunk.chunkId}`);
      }
    } else {
      if (!existsSync(archivePath) || statSync(archivePath).size !== index.bytes || hashFile(archivePath) !== index.sha256) {
        throw new Error("local archive checksum changed; cleanup denied");
      }
      for (const part of index.parts) {
        const partPath = resolve(this.options.store.root, "archives", part.name);
        if (!existsSync(partPath) || statSync(partPath).size !== part.bytes || hashFile(partPath) !== part.sha256) {
          throw new Error(`local archive part changed; cleanup denied: ${part.name}`);
        }
      }
      for (const runId of index.runIds) {
        const runRoot = assertWithin(resolve(this.options.store.root, "runs"), resolve(this.options.store.root, "runs", runId));
        verifyRunOwnership(runRoot, runId);
      }
      receipt = {
        schemaVersion: 1,
        campaignId: index.campaignId,
        chunkId: index.chunkId,
        runIds: index.runIds,
        archiveSha256: index.sha256,
        storage: index.storage,
        releaseTag: index.releaseTag,
        parts: index.parts,
        remoteVerifiedCommit: chunk.remoteCommits.verified,
        cleanupStartedAt: this.now().toISOString(),
      };
      atomicJson(receiptPath, receipt);
    }
    // A durable receipt makes this allowlisted removal idempotent after a crash.
    for (const runId of index.runIds) {
      const runRoot = assertWithin(resolve(this.options.store.root, "runs"), resolve(this.options.store.root, "runs", runId));
      if (existsSync(runRoot)) {
        verifyRunOwnership(runRoot, runId);
        rmSync(runRoot, { recursive: true, force: true });
      }
    }
    rmSync(archivePath, { force: true });
    for (const part of index.parts) rmSync(resolve(this.options.store.root, "archives", part.name), { force: true });
    atomicJson(receiptPath, { ...receipt, cleanedLocallyAt: this.now().toISOString() });
    this.transition(state, chunk, "cleaned-local");
    return receiptPath;
  }

  private async processChunk(state: PublisherState, candidate: CampaignChunkState): Promise<void> {
    const chunk = this.progress(state, candidate);
    chunk.attempts++;
    chunk.updatedAt = this.now().toISOString();
    this.ledger.save(state);
    this.emit("attempt-started", chunk, `attempt ${chunk.attempts}`, { state: chunk.state });
    try {
      let index: ArchiveIndex;
      if (chunk.state === "local" || chunk.state === "uploading") {
        if (chunk.state === "local") this.transition(state, chunk, "uploading");
        const campaign = this.options.store.load();
        const eligibility = inspectChunkEligibility(this.options.store, campaign, candidate);
        if (!eligibility.eligible) throw new Error(`chunk is no longer eligible: ${eligibility.reasons.join("; ")}`);
        const results = loadExecutionResults(this.options.store.root);
        persistCompactResults(this.options.store.root, results);
        writeCampaignReport(this.options.store.root, buildCampaignReport(campaign, results));
        index = createChunkArchive(this.options.store, campaign, candidate.ordinal);
        chunk.releaseTag = index.releaseTag;
        chunk.archiveSha256 = index.sha256;
        chunk.archiveBytes = index.bytes;
        chunk.parts = index.parts;
        chunk.updatedAt = this.now().toISOString();
        this.ledger.save(state);
        this.checkStop();
        if (!chunk.remoteCommits.index) {
          chunk.remoteCommits.index = await this.options.transport.pushFiles(
            this.remoteFiles(),
            `archive ${campaign.id} ${chunk.chunkId}`,
          );
          this.ledger.save(state);
        }
        this.checkStop();
        await this.options.transport.ensureRelease({
          tag: index.releaseTag,
          targetCommit: chunk.remoteCommits.index,
          title: `${index.campaignId} ${index.chunkId}`,
          notes: "Deterministic multipart raw benchmark archive. Checksums and run ownership are recorded in the committed chunk index.",
        });
        await this.ensureAssets(index);
        this.transition(state, chunk, "pushed");
      } else {
        index = this.readIndex(chunk);
      }

      this.checkStop();
      if (chunk.state === "pushed" || chunk.state === "verifying") {
        if (chunk.state === "pushed") this.transition(state, chunk, "verifying");
        if (!chunk.remoteCommits.index) throw new Error("verification requires a committed remote index");
        await this.verifyRemote(index, chunk.remoteCommits.index);
        this.writeVerifiedIndex(chunk, index);
        this.checkStop();
        const projected = structuredClone(state);
        projected.chunks[chunk.chunkId].state = "verified";
        projected.chunks[chunk.chunkId].nextRetryAt = undefined;
        projected.chunks[chunk.chunkId].lastError = undefined;
        const commit = await this.pushProjectedState(projected, `verify ${index.campaignId} ${index.chunkId}`);
        chunk.remoteCommits.verified = commit;
        this.transition(state, chunk, "verified");
      }

      this.checkStop();
      if (chunk.state === "verified" && this.options.cleanup !== false) {
        this.cleanupLocal(state, chunk, index);
      }

      this.checkStop();
      if (chunk.state === "cleaned-local" && this.options.cleanup !== false) {
        const projected = structuredClone(state);
        projected.chunks[chunk.chunkId].state = "cleaned";
        projected.chunks[chunk.chunkId].nextRetryAt = undefined;
        projected.chunks[chunk.chunkId].lastError = undefined;
        const commit = await this.pushProjectedState(projected, `cleanup ${index.campaignId} ${index.chunkId}`);
        chunk.remoteCommits.cleanup = commit;
        this.transition(state, chunk, "cleaned");
      }
      chunk.consecutiveFailures = 0;
      chunk.nextRetryAt = undefined;
      chunk.lastError = undefined;
      chunk.updatedAt = this.now().toISOString();
      this.ledger.save(state);
      this.emit("attempt-succeeded", chunk, chunk.state, { state: chunk.state });
    } catch (error) {
      if (error instanceof ShutdownRequested) throw error;
      chunk.consecutiveFailures++;
      chunk.lastError = (error as Error).message;
      const delay = publisherRetryDelayMs(
        chunk.chunkId,
        chunk.consecutiveFailures,
        this.options.retryBaseSeconds ?? 30,
        this.options.retryMaxSeconds ?? 900,
      );
      chunk.nextRetryAt = new Date(this.now().getTime() + delay).toISOString();
      chunk.updatedAt = this.now().toISOString();
      this.ledger.save(state);
      this.emit("attempt-failed", chunk, chunk.lastError, { nextRetryAt: chunk.nextRetryAt, delayMs: delay });
      throw error;
    }
  }

  async sweep(): Promise<PublisherSweepResult> {
    const campaign = this.options.store.load();
    if (campaign.kind !== "full") throw new Error("the continuous archive publisher supports full benchmark campaigns only");
    const state = this.ledger.load();
    const result: PublisherSweepResult = { eligible: 0, processed: 0, failed: 0, skipped: 0 };
    const chunks = Object.values(campaign.chunks)
      .filter((chunk) => this.options.targetChunkOrdinal === undefined || chunk.ordinal === this.options.targetChunkOrdinal)
      .filter((chunk) => this.options.targetChunkId === undefined || chunk.chunkId === this.options.targetChunkId)
      .sort((left, right) => left.ordinal - right.ordinal);
    const targeted = this.options.targetChunkOrdinal !== undefined || this.options.targetChunkId !== undefined;
    if (targeted && chunks.length === 0) {
      result.failed++;
      this.writeError("requested publisher chunk is not registered in the campaign");
      return result;
    }
    for (const candidate of chunks) {
      if (this.stopping) break;
      const existing = state.chunks[candidate.chunkId];
      if (existing?.state === "cleaned") { result.skipped++; continue; }
      if (this.options.cleanupOnly && existing?.state !== "verified" && existing?.state !== "cleaned-local") {
        result.failed++;
        this.writeError("cleanup requires publisher state verified or cleaned-local", candidate);
        continue;
      }
      const resumable = existing && existing.state !== "local" && existing.state !== "uploading";
      const eligibility = resumable
        ? { eligible: true, runIds: [], reasons: [] }
        : inspectChunkEligibility(this.options.store, campaign, candidate);
      if (this.options.dryRun) {
        this.emit(
          "eligibility",
          candidate,
          eligibility.eligible ? "eligible" : "ineligible",
          { eligible: eligibility.eligible, reasons: eligibility.reasons, publisherState: existing?.state ?? "local" },
          false,
        );
      }
      if (!eligibility.eligible) {
        result.skipped++;
        if (targeted && !this.options.dryRun) {
          result.failed++;
          this.writeError(`chunk is not eligible: ${eligibility.reasons.join("; ")}`, candidate);
        }
        continue;
      }
      result.eligible++;
      if (this.options.dryRun) continue;
      if (existing?.nextRetryAt && Date.parse(existing.nextRetryAt) > this.now().getTime()) {
        result.skipped++;
        continue;
      }
      try {
        await this.processChunk(state, candidate);
        result.processed++;
      } catch (error) {
        if (error instanceof ShutdownRequested) break;
        result.failed++;
        this.writeError((error as Error).message, candidate);
      }
    }
    return result;
  }

  private async pause(milliseconds: number): Promise<void> {
    if (this.stopping) return;
    if (this.options.sleep) {
      await this.options.sleep(milliseconds);
      return;
    }
    await new Promise<void>((accept) => {
      const timer = setTimeout(() => { this.wake = undefined; accept(); }, milliseconds);
      this.wake = () => { clearTimeout(timer); this.wake = undefined; accept(); };
    });
  }

  async run(): Promise<PublisherSweepResult> {
    const onSigint = () => this.requestStop("SIGINT");
    const onSigterm = () => this.requestStop("SIGTERM");
    if (!this.options.dryRun) this.lock.acquire();
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);
    let aggregate: PublisherSweepResult = { eligible: 0, processed: 0, failed: 0, skipped: 0 };
    try {
      if (!this.options.dryRun) {
        await this.options.transport.prepare();
        this.emit("publisher-started", undefined, this.options.once ? "one sweep" : "continuous watch");
      }
      do {
        const current = await this.sweep();
        aggregate = {
          eligible: aggregate.eligible + current.eligible,
          processed: aggregate.processed + current.processed,
          failed: aggregate.failed + current.failed,
          skipped: aggregate.skipped + current.skipped,
        };
        if (this.options.once || this.stopping) break;
        await this.pause((this.options.pollSeconds ?? 15) * 1_000);
      } while (!this.stopping);
      return aggregate;
    } finally {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
      if (!this.options.dryRun) {
        try {
          this.emit("publisher-stopped", undefined, this.stopping ? "signal" : "complete");
        } finally {
          this.lock.release();
        }
      }
    }
  }
}
