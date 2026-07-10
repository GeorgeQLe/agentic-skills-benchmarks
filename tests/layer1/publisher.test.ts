import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256 } from "../orchestration/canonical.js";
import { createChunkArchive, type ArchiveIndex } from "../orchestration/archive.js";
import { CampaignStore, newCampaign, type CampaignState } from "../orchestration/campaign.js";
import {
  PublisherCoordinator,
  PublisherLock,
  PublisherStateStore,
  assertPublisherTransition,
  chunkEligibility,
  publisherRetryDelayMs,
  type PublisherAsset,
  type PublisherRemoteFile,
  type PublisherTransport,
} from "../orchestration/publisher.js";
import { loadChunks, scheduleFullChunk } from "../orchestration/scheduler.js";
import type { JudgeScore, UsageSnapshot } from "../orchestration/types.js";
import { runPublisherCommand } from "../orchestration/publisher-cli.js";

function snapshot(): UsageSnapshot {
  return {
    schemaVersion: 1,
    capturedAt: "2026-07-10T12:00:00.000Z",
    providers: {
      openai: { remainingUnits: 100, source: "manual-provider-dashboard" },
      anthropic: { remainingUnits: 100, source: "manual-provider-dashboard" },
    },
  };
}

const scores: JudgeScore[] = ["gpt", "claude"].map((family) => ({
  judgeFamily: family as "gpt" | "claude",
  judgeModel: `${family}-judge`,
  blindedCandidate: "candidate-test",
  requirements: 25,
  codeQuality: 20,
  directionFollowing: 18,
  intentAndPushback: 20,
  criticalFailure: false,
  pass: true,
  evidence: [],
}));

function campaignWithChunks(ordinals: number[]): { store: CampaignStore; state: CampaignState } {
  const state = newCampaign({
    kind: "full",
    snapshot: snapshot(),
    now: new Date(Date.now() + Math.floor(Math.random() * 1_000_000)).toISOString(),
  });
  const chunks = loadChunks();
  for (const ordinal of ordinals) {
    const chunk = chunks[ordinal];
    const scheduled = scheduleFullChunk(ordinal);
    state.chunks[chunk.id] = {
      chunkId: chunk.id,
      ordinal,
      expectedRuns: scheduled.length,
      completedRuns: scheduled.length,
      archiveState: "local",
    };
    for (const { run } of scheduled) {
      state.runs[run.id] = { run, status: "judged", attempts: 1, updatedAt: state.createdAt };
    }
  }
  const store = new CampaignStore(state.id);
  store.create(state);
  for (const ordinal of ordinals) {
    for (const { run } of scheduleFullChunk(ordinal)) {
      const runRoot = resolve(store.root, "runs", run.id);
      const artifacts = resolve(runRoot, "attempts", "attempt-000", "artifacts");
      mkdirSync(artifacts, { recursive: true });
      writeFileSync(resolve(runRoot, "identity.json"), `${JSON.stringify(run, null, 2)}\n`);
      writeFileSync(resolve(artifacts, "evidence.json"), "{\"ok\":true}\n");
      writeFileSync(resolve(runRoot, "result.json"), `${JSON.stringify({
        schemaVersion: 1,
        run,
        assignmentId: run.assignmentId,
        scenarioId: run.scenarioId,
        startedAt: state.createdAt,
        completedAt: state.createdAt,
        durationMs: 1,
        passed: true,
        score: 83,
        tieBreakUsed: false,
        workerCalls: 1,
        candidateCalls: 1,
        judgeCalls: 2,
        usage: {
          openai: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningTokens: 0, calls: 2 },
          anthropic: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningTokens: 0, calls: 1 },
          openaiUnits: 0.1,
          anthropicUnits: 0.1,
        },
        deterministic: { checks: {} },
        judges: scores,
        finalAnswer: { summary: "done" },
        attemptRoot: `runs/${run.id}/attempts/attempt-000`,
      }, null, 2)}\n`);
    }
  }
  return { store, state };
}

class FakePublisherTransport implements PublisherTransport {
  readonly root = mkdtempSync(resolve(tmpdir(), "publisher-remote-"));
  readonly remote = resolve(this.root, "remote");
  readonly snapshots = resolve(this.root, "snapshots");
  readonly releases = new Map<string, Map<string, Buffer>>();
  readonly failOnce = new Set<string>();
  readonly failUploadTags = new Set<string>();
  prepared = 0;
  pushes = 0;
  corruptNextUpload = false;
  onPush?: () => void;

  constructor() {
    mkdirSync(this.remote, { recursive: true });
    mkdirSync(this.snapshots, { recursive: true });
  }

  private fail(operation: string): void {
    if (!this.failOnce.delete(operation)) return;
    throw new Error(`injected ${operation} failure`);
  }

  async prepare(): Promise<void> { this.prepared++; }

  async pushFiles(files: PublisherRemoteFile[]): Promise<string> {
    const verified = files.some((file) => file.target.startsWith("verified/"));
    const cleanup = files.some((file) => file.target.startsWith("cleanup-receipts/"));
    this.fail(cleanup ? "receipt-push" : verified ? "verified-push" : "index-push");
    for (const file of files) {
      const target = resolve(this.remote, file.target);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(file.source, target);
    }
    const commit = `commit-${++this.pushes}`;
    cpSync(this.remote, resolve(this.snapshots, commit), { recursive: true });
    this.onPush?.();
    return commit;
  }

  async ensureRelease(input: { tag: string }): Promise<void> {
    this.releases.set(input.tag, this.releases.get(input.tag) ?? new Map());
  }

  async listReleaseAssets(tag: string): Promise<PublisherAsset[]> {
    return [...(this.releases.get(tag) ?? new Map()).entries()].map(([name, content]) => ({
      name,
      bytes: content.length,
      sha256: `sha256:${sha256(content)}`,
    }));
  }

  async uploadReleaseAsset(tag: string, source: string, name: string): Promise<void> {
    if (this.failUploadTags.has(tag)) throw new Error("injected upload failure");
    this.fail("upload");
    const content = readFileSync(source);
    this.releases.get(tag)!.set(name, this.corruptNextUpload ? Buffer.alloc(content.length, 9) : content);
    this.corruptNextUpload = false;
  }

  async deleteReleaseAsset(tag: string, name: string): Promise<void> {
    this.releases.get(tag)?.delete(name);
  }

  async cloneAtCommit(commit: string, target: string): Promise<void> {
    this.fail("clone");
    cpSync(resolve(this.snapshots, commit), target, { recursive: true });
  }

  async downloadReleaseAsset(tag: string, name: string, target: string): Promise<void> {
    this.fail("download");
    const content = this.releases.get(tag)?.get(name);
    if (!content) throw new Error(`missing fake release asset ${name}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  dispose(): void { rmSync(this.root, { recursive: true, force: true }); }
}

function quietIo(): { stdout: { write: (chunk: string) => true }; stderr: { write: (chunk: string) => true } } {
  return {
    stdout: { write: () => true },
    stderr: { write: () => true },
  };
}

describe("publisher state, eligibility, retry, and locks", () => {
  it("requires an explicit campaign and validates watcher timing flags", async () => {
    let output = "";
    const io = {
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
      stderr: { write: (chunk: string) => { output += chunk; return true; } },
    };
    expect(await runPublisherCommand([], io)).toBe(1);
    expect(output).toContain("requires --campaign");
    output = "";
    expect(await runPublisherCommand(["--campaign", "abc", "--poll-seconds", "0"], io)).toBe(1);
    expect(output).toContain("positive number");
    output = "";
    expect(await runPublisherCommand(["--campaign", "abc", "--retry-base-seconds", "60", "--retry-max-seconds", "30"], io)).toBe(1);
    expect(output).toContain("must be at least");
    output = "";
    expect(await runPublisherCommand(["--help"], io)).toBe(0);
    expect(output).toContain("--dry-run");
  });

  it("enforces the lifecycle and deterministic capped exponential backoff", () => {
    expect(() => assertPublisherTransition("local", "verified")).toThrow("invalid publisher transition");
    expect(() => assertPublisherTransition("local", "uploading")).not.toThrow();
    const first = publisherRetryDelayMs("chunk-a", 1, 30, 900);
    const second = publisherRetryDelayMs("chunk-a", 2, 30, 900);
    expect(first).toBe(publisherRetryDelayMs("chunk-a", 1, 30, 900));
    expect(first).toBeGreaterThanOrEqual(24_000);
    expect(second).toBeGreaterThan(first);
    expect(publisherRetryDelayMs("chunk-a", 20, 30, 900)).toBeLessThanOrEqual(900_000);
  });

  it("identifies only fully registered judged immutable run identities", () => {
    const state = newCampaign({ kind: "full", snapshot: snapshot() });
    const definition = loadChunks()[0];
    const scheduled = scheduleFullChunk(0);
    const chunk = { chunkId: definition.id, ordinal: 0, expectedRuns: scheduled.length, completedRuns: 0, archiveState: "local" as const };
    expect(chunkEligibility(state, chunk, scheduled.map((entry) => entry.run)).eligible).toBe(false);
    for (const { run } of scheduled) state.runs[run.id] = { run, status: "judged", attempts: 1, updatedAt: state.createdAt };
    expect(chunkEligibility(state, chunk, scheduled.map((entry) => entry.run))).toMatchObject({ eligible: true, reasons: [] });
  });

  it("rejects a live campaign lock and recovers a stale PID lock", () => {
    const { store } = campaignWithChunks([]);
    try {
      const first = new PublisherLock(store, 111, () => new Date("2026-07-10T00:00:00.000Z"), (pid) => pid === 111);
      first.acquire();
      expect(() => new PublisherLock(store, 222, () => new Date(), (pid) => pid === 111).acquire()).toThrow("publisher already active");
      expect(() => new PublisherLock(store, 222, () => new Date(), () => false).acquire()).not.toThrow();
      new PublisherLock(store, 333, () => new Date(), () => false).release();
    } finally {
      rmSync(store.root, { recursive: true, force: true });
    }
  });

  it("performs dry-run eligibility reporting without lock, ledger, events, or transport writes", async () => {
    const { store, state } = campaignWithChunks([]);
    const transport = new FakePublisherTransport();
    try {
      const definition = loadChunks()[0];
      state.chunks[definition.id] = { chunkId: definition.id, ordinal: 0, expectedRuns: 288, completedRuns: 0, archiveState: "local" };
      store.save(state);
      let output = "";
      const result = await new PublisherCoordinator({
        store,
        transport,
        once: true,
        dryRun: true,
        json: true,
        stdout: { write: (chunk: string) => { output += chunk; return true; } },
        stderr: { write: () => true },
      }).run();
      expect(result.failed).toBe(0);
      expect(transport.prepared).toBe(0);
      expect(existsSync(resolve(store.root, "publisher"))).toBe(false);
      expect(JSON.parse(output.trim())).toMatchObject({ type: "eligibility", data: { eligible: false } });
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });
});

describe("publisher offline publication, verification, cleanup, and recovery", () => {
  it("verifies a fresh multipart release and removes only allowlisted generated raw paths", async () => {
    const { store } = campaignWithChunks([0]);
    const campaignBefore = readFileSync(store.statePath, "utf8");
    const transport = new FakePublisherTransport();
    const unrelated = resolve(store.root, "runs", "not-owned", "keep.txt");
    mkdirSync(dirname(unrelated), { recursive: true });
    writeFileSync(unrelated, "keep\n");
    try {
      const result = await new PublisherCoordinator({ store, transport, once: true, ...quietIo() }).run();
      expect(result).toMatchObject({ processed: 1, failed: 0 });
      const ledger = new PublisherStateStore(store.campaignId, store.root).load();
      const progress = Object.values(ledger.chunks)[0];
      expect(progress.state).toBe("cleaned");
      expect(progress.remoteCommits).toMatchObject({ index: "commit-1", verified: "commit-2", cleanup: "commit-3" });
      expect(existsSync(resolve(store.root, "compact-results.jsonl"))).toBe(true);
      expect(existsSync(resolve(store.root, "reports", "aggregate.json"))).toBe(true);
      expect(existsSync(resolve(store.root, "archives", `${progress.chunkId}.index.json`))).toBe(true);
      expect(existsSync(resolve(store.root, "cleanup-receipts", `${progress.chunkId}.json`))).toBe(true);
      expect(existsSync(resolve(transport.remote, "indexes", store.campaignId, "compact-results.jsonl"))).toBe(true);
      expect(JSON.parse(readFileSync(resolve(transport.remote, "publisher", store.campaignId, "state.json"), "utf8")).chunks[progress.chunkId].state).toBe("cleaned");
      expect(readFileSync(unrelated, "utf8")).toBe("keep\n");
      expect(readFileSync(store.statePath, "utf8")).toBe(campaignBefore);
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });

  it.each(["upload", "clone", "download", "verified-push", "receipt-push"])(
    "resumes after an injected %s interruption without unsafe early cleanup",
    async (operation) => {
      const { store } = campaignWithChunks([0]);
      const transport = new FakePublisherTransport();
      transport.failOnce.add(operation);
      let clock = new Date("2026-07-10T12:00:00.000Z");
      const now = () => new Date(clock);
      try {
        const first = await new PublisherCoordinator({ store, transport, once: true, now, ...quietIo() }).run();
        expect(first.failed).toBe(1);
        const failed = Object.values(new PublisherStateStore(store.campaignId, store.root, now).load().chunks)[0];
        if (operation !== "receipt-push") {
          expect(existsSync(resolve(store.root, "runs", scheduleFullChunk(0)[0].run.id))).toBe(true);
        } else {
          expect(failed.state).toBe("cleaned-local");
        }
        clock = new Date(clock.getTime() + 20 * 60 * 1_000);
        const resumed = await new PublisherCoordinator({ store, transport, once: true, now, ...quietIo() }).run();
        expect(resumed.failed).toBe(0);
        expect(Object.values(new PublisherStateStore(store.campaignId, store.root, now).load().chunks)[0].state).toBe("cleaned");
      } finally {
        rmSync(store.root, { recursive: true, force: true });
        transport.dispose();
      }
    },
  );

  it("replaces an owned corrupt release asset on retry and retains raw runs after the mismatch", async () => {
    const { store } = campaignWithChunks([0]);
    const transport = new FakePublisherTransport();
    transport.corruptNextUpload = true;
    let clock = new Date("2026-07-10T12:00:00.000Z");
    const now = () => new Date(clock);
    try {
      expect((await new PublisherCoordinator({ store, transport, once: true, now, ...quietIo() }).run()).failed).toBe(1);
      expect(existsSync(resolve(store.root, "runs", scheduleFullChunk(0)[0].run.id))).toBe(true);
      clock = new Date(clock.getTime() + 20 * 60 * 1_000);
      expect((await new PublisherCoordinator({ store, transport, once: true, now, ...quietIo() }).run()).failed).toBe(0);
      expect(Object.values(new PublisherStateStore(store.campaignId, store.root, now).load().chunks)[0].state).toBe("cleaned");
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });

  it("reuses and repairs owned deterministic files after partial archive creation", async () => {
    const { store, state } = campaignWithChunks([0]);
    const transport = new FakePublisherTransport();
    try {
      const index = createChunkArchive(store, state, 0);
      writeFileSync(resolve(store.root, "archives", index.archive), "interrupted archive");
      rmSync(resolve(store.root, "archives", index.parts[0].name), { force: true });
      const result = await new PublisherCoordinator({ store, transport, once: true, ...quietIo() }).run();
      expect(result.failed).toBe(0);
      expect(Object.values(new PublisherStateStore(store.campaignId, store.root).load().chunks)[0].state).toBe("cleaned");
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });

  it("resumes an interrupted allowlisted cleanup from its durable owned receipt", async () => {
    const { store } = campaignWithChunks([0]);
    const transport = new FakePublisherTransport();
    try {
      expect((await new PublisherCoordinator({ store, transport, once: true, cleanup: false, ...quietIo() }).run()).failed).toBe(0);
      const ledger = new PublisherStateStore(store.campaignId, store.root).load();
      const progress = Object.values(ledger.chunks)[0];
      expect(progress.state).toBe("verified");
      const index = JSON.parse(readFileSync(resolve(store.root, "archives", `${progress.chunkId}.index.json`), "utf8")) as ArchiveIndex;
      const receipt = resolve(store.root, "cleanup-receipts", `${progress.chunkId}.json`);
      mkdirSync(dirname(receipt), { recursive: true });
      writeFileSync(receipt, `${JSON.stringify({
        schemaVersion: 1,
        campaignId: index.campaignId,
        chunkId: index.chunkId,
        runIds: index.runIds,
        archiveSha256: index.sha256,
        releaseTag: index.releaseTag,
        parts: index.parts,
      }, null, 2)}\n`);
      rmSync(resolve(store.root, "runs", index.runIds[0]), { recursive: true, force: true });
      rmSync(resolve(store.root, "archives", index.archive), { force: true });
      const resumed = await new PublisherCoordinator({
        store,
        transport,
        once: true,
        targetChunkId: index.chunkId,
        cleanup: true,
        cleanupOnly: true,
        ...quietIo(),
      }).run();
      expect(resumed.failed).toBe(0);
      expect(new PublisherStateStore(store.campaignId, store.root).load().chunks[index.chunkId].state).toBe("cleaned");
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });

  it("continues to a later eligible chunk when an earlier upload fails", async () => {
    const { store, state } = campaignWithChunks([0, 1]);
    const transport = new FakePublisherTransport();
    const first = Object.values(state.chunks).find((chunk) => chunk.ordinal === 0)!;
    transport.failUploadTags.add(`archive-${state.id}-${first.chunkId}`);
    try {
      const result = await new PublisherCoordinator({ store, transport, once: true, ...quietIo() }).run();
      expect(result).toMatchObject({ processed: 1, failed: 1 });
      const ledger = new PublisherStateStore(store.campaignId, store.root).load();
      expect(ledger.chunks[first.chunkId].state).toBe("uploading");
      const second = Object.values(state.chunks).find((chunk) => chunk.ordinal === 1)!;
      expect(ledger.chunks[second.chunkId].state).toBe("cleaned");
      expect(existsSync(resolve(store.root, "runs", scheduleFullChunk(0)[0].run.id))).toBe(true);
      expect(existsSync(resolve(store.root, "runs", scheduleFullChunk(1)[0].run.id))).toBe(false);
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });

  it("honors signal-style shutdown after the active push and releases its lock", async () => {
    const { store } = campaignWithChunks([0]);
    const transport = new FakePublisherTransport();
    const io = quietIo();
    const coordinator = new PublisherCoordinator({ store, transport, once: true, ...io });
    transport.onPush = () => coordinator.requestStop("test");
    try {
      const result = await coordinator.run();
      expect(result.failed).toBe(0);
      expect(existsSync(resolve(store.root, "publisher", "lock.json"))).toBe(false);
      const progress = Object.values(new PublisherStateStore(store.campaignId, store.root).load().chunks)[0];
      expect(progress.state).toBe("uploading");
      expect(progress.nextRetryAt).toBeUndefined();
      expect(existsSync(resolve(store.root, "runs", scheduleFullChunk(0)[0].run.id))).toBe(true);
    } finally {
      rmSync(store.root, { recursive: true, force: true });
      transport.dispose();
    }
  });
});
