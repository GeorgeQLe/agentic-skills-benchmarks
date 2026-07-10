import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deterministicTarGzip, extractDeterministicArchive, reassembleArchiveParts, scanArchiveInputs, splitArchiveBuffer } from "../orchestration/archive.js";
import {
  CANDIDATE_OUTPUT_SCHEMA,
  claudeWorkerSpec,
  codexCandidateSpec,
  codexWorkerSpec,
  createDenyShimDirectory,
  type ProviderCommandSpec,
} from "../orchestration/adapters.js";
import { AllowanceLedger, validatePercentageSnapshot, worstCaseReservation, type CalibrationProfile } from "../orchestration/budget.js";
import { buildCalibrationProfile, collectCalibration, type CalibrationObservations } from "../orchestration/calibration.js";
import { CampaignStore, newCampaign } from "../orchestration/campaign.js";
import { runOrchestrationCommand } from "../orchestration/cli.js";
import { assertScenarioPairs, qualifyAllFixtures } from "../orchestration/corpus.js";
import {
  REFERENCE_FACTORS,
  generateAssignments,
  generateChunks,
  generatePilot,
  loadScenarios,
  verifyGeneratedArtifacts,
} from "../orchestration/design.js";
import { buildBlindedJudgePrompt, needsTieBreak, resolveJudges, rubricPass, thirdJudgeFamily } from "../orchestration/judges.js";
import { createIsolatedRun, runIdentity, scheduleChunk } from "../orchestration/isolation.js";
import { evaluatePlanFirst, generateV2Assignments } from "../orchestration/plan-first.js";
import { runSchedule, scheduleFullChunk, schedulePilot } from "../orchestration/scheduler.js";
import { allocateConsultations, assertBalancedMultiRoster } from "../orchestration/topology.js";
import { installTreatments } from "../orchestration/treatments.js";
import { buildCampaignReport } from "../orchestration/report.js";
import { renderOrchestrationDashboard } from "../orchestration/dashboard.js";
import type { Assignment, JudgeScore, UsageEstimate, UsageSnapshot } from "../orchestration/types.js";
import { prohibitedModelDescendants } from "../orchestration/process.js";
import type { ProviderExecution } from "../orchestration/process.js";
import { executeRun } from "../orchestration/runner.js";
import { Semaphore } from "../orchestration/semaphore.js";

function temp(prefix: string): string {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

function snapshot(units = 100): UsageSnapshot {
  return {
    schemaVersion: 1,
    capturedAt: "2026-07-10T12:00:00.000Z",
    providers: {
      openai: { remainingUnits: units, source: "manual-provider-dashboard" },
      anthropic: { remainingUnits: units, source: "manual-provider-dashboard" },
    },
  };
}

function percentageSnapshot(capturedAt: string, resetAt: string, openai = 100, anthropic = 100): UsageSnapshot {
  return { schemaVersion: 1, capturedAt, providers: {
    openai: { remainingPercent: openai, usedPercent: 100 - openai, resetAt, observedAt: capturedAt, source: "pitwall-local", window: "primary_five_hour", durationSeconds: 18_000, confidence: "providerSupplied" },
    anthropic: { remainingPercent: anthropic, usedPercent: 100 - anthropic, resetAt, observedAt: capturedAt, source: "pitwall-local", window: "seven_day", scope: "all_models", confidence: "exact" },
  } };
}

async function successfulProviderExecution(spec: ProviderCommandSpec): Promise<ProviderExecution> {
  const value = spec.role === "judge"
    ? { requirements: 30, codeQuality: 25, directionFollowing: 20, intentAndPushback: 25, criticalFailure: false, pass: true, evidence: ["verified"] }
    : spec.role === "candidate"
      ? { summary: [], verification: [], pushback: [], workerEvidenceUsed: [] }
      : { evidence: [] };
  if (spec.provider === "openai") {
    const outputIndex = spec.args.indexOf("--output-last-message");
    if (outputIndex >= 0) writeFileSync(spec.args[outputIndex + 1], JSON.stringify(value));
  }
  return { exitCode: 0, signal: null, stdout: spec.provider === "anthropic" ? JSON.stringify({ structured_output: value }) : "", stderr: "", durationMs: 1, timedOut: false, outputLimited: false, usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 100, reasoningTokens: 0, calls: 1 } };
}

const estimates: UsageEstimate[] = [
  { provider: "openai", model: "any", effort: "medium", role: "orchestrator", taskClass: "all", upperUnits: 1, meanUnits: 0.5, sampleSize: 3, confidence: 0.95 },
  { provider: "openai", model: "any", effort: "medium", role: "worker", taskClass: "all", upperUnits: 1, meanUnits: 0.5, sampleSize: 3, confidence: 0.95 },
  { provider: "anthropic", model: "any", effort: "medium", role: "worker", taskClass: "all", upperUnits: 1, meanUnits: 0.5, sampleSize: 3, confidence: 0.95 },
  { provider: "openai", model: "any", effort: "high", role: "judge", taskClass: "all", upperUnits: 1, meanUnits: 0.5, sampleSize: 3, confidence: 0.95 },
  { provider: "anthropic", model: "any", effort: "high", role: "judge", taskClass: "all", upperUnits: 1, meanUnits: 0.5, sampleSize: 3, confidence: 0.95 },
];

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    schemaVersion: 1,
    id: "cfg-test",
    ordinal: 0,
    ...REFERENCE_FACTORS,
    ...overrides,
  };
}

function judge(family: "gpt" | "claude", totalDelta = 0): JudgeScore {
  const value: JudgeScore = {
    judgeFamily: family,
    judgeModel: `${family}-model`,
    blindedCandidate: "candidate-abc",
    requirements: 26 + totalDelta,
    codeQuality: 21,
    directionFollowing: 17,
    intentAndPushback: 20,
    criticalFailure: false,
    pass: true,
    evidence: ["patch and tests support the score"],
  };
  value.pass = rubricPass(value);
  return value;
}

describe("Sol orchestration design", () => {
  it("generates exactly 11520 stable unique configurations and 1440 chunks of eight", () => {
    const first = generateAssignments();
    const second = generateAssignments();
    expect(first).toEqual(second);
    expect(first).toHaveLength(11_520);
    expect(new Set(first.map((row) => row.id)).size).toBe(11_520);
    const chunks = generateChunks(first);
    expect(chunks).toHaveLength(1_440);
    expect(chunks.every((chunk) => chunk.assignmentIds.length === 8)).toBe(true);
    expect(verifyGeneratedArtifacts()).toMatchObject({ ok: true, assignments: 11_520, chunks: 1_440, pilotRows: 30 });
  });

  it("generates the solo, reference, and complete OFAT pilot in 30 rows", () => {
    const rows = generatePilot();
    expect(rows).toHaveLength(30);
    expect(rows.filter((row) => row.kind === "solo-control")).toHaveLength(1);
    expect(rows.filter((row) => row.kind === "reference")).toHaveLength(1);
    expect(rows.filter((row) => row.kind === "ofat")).toHaveLength(28);
    expect(schedulePilot()).toHaveLength(1_116);
  });

  it("expands every assignment/task/repetition into 414720 unique immutable identities", () => {
    const ids = new Set<string>();
    for (const config of generateAssignments()) {
      for (const scenario of loadScenarios()) {
        for (const repetition of [0, 1, 2] as const) ids.add(runIdentity(config.id, scenario.id, repetition).id);
      }
    }
    expect(ids.size).toBe(414_720);
  });

  it("expands a chunk into 288 seeded block-randomized runs without duplicates", () => {
    const configs = generateAssignments();
    const chunk = generateChunks(configs)[17];
    const first = scheduleChunk(chunk);
    expect(first).toEqual(scheduleChunk(chunk));
    expect(first).toHaveLength(288);
    expect(new Set(first.map((run) => run.id)).size).toBe(288);
  });
});

describe("corpus and treatments", () => {
  it("locks exactly one registered intervention per clean/challenge pair and qualifies references", () => {
    assertScenarioPairs();
    const root = temp("sol-corpus-");
    try {
      const results = qualifyAllFixtures(root);
      expect(results).toHaveLength(6);
      expect(results.every((result) => result.seedFailed && result.referencePassed)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("creates a new checksummed fixture, trace, ledger, and artifact directory for every retry", () => {
    const root = temp("sol-isolation-");
    try {
      const scenario = loadScenarios()[0];
      const identity = runIdentity("cfg-retry", scenario.id, 0);
      const first = createIsolatedRun(root, identity, scenario);
      const second = createIsolatedRun(root, identity, scenario);
      expect(first.fixture).not.toBe(second.fixture);
      expect(first.trace).not.toBe(second.trace);
      expect(first.ledger).not.toBe(second.ledger);
      expect(first.fixtureChecksum).toBe(second.fixtureChecksum);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("routes absent/optimized AGENTS and disabled/implicit/explicit/decoy skills without contamination", () => {
    const root = temp("sol-treatments-");
    try {
      installTreatments(root, assignment({ agents: "adversarial", skills: "decoy" }));
      expect(readFileSync(resolve(root, "AGENTS.md"), "utf8")).toContain("agents-skip-tests");
      expect(readFileSync(resolve(root, ".codex/skills/fixture-implementation/SKILL.md"), "utf8")).toContain("name: fixture-implementation");
      expect(readFileSync(resolve(root, ".codex/skills/dependency-first/SKILL.md"), "utf8")).toContain("controlled decoy");
      installTreatments(root, assignment({ agents: "absent", skills: "disabled" }));
      expect(() => readFileSync(resolve(root, "AGENTS.md"))).toThrow();
      expect(() => readFileSync(resolve(root, ".codex/skills/fixture-implementation/SKILL.md"))).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("provider isolation and topology", () => {
  it("pins ephemeral subscription CLI arguments and strips API-key variables", () => {
    const root = temp("sol-adapters-");
    try {
      const shim = createDenyShimDirectory(root);
      const schema = resolve(root, "schema.json");
      writeFileSync(schema, JSON.stringify(CANDIDATE_OUTPUT_SCHEMA));
      const output = resolve(root, "out.json");
      const env = { PATH: process.env.PATH, OPENAI_API_KEY: "must-not-pass", OPENAI_ADMIN_KEY: "must-not-pass", ANTHROPIC_API_KEY: "must-not-pass" };
      const candidate = codexCandidateSpec({ cwd: root, prompt: "task", effort: "xhigh", schemaPath: schema, outputPath: output, denyShimDir: shim, env });
      expect(candidate.args).toEqual(expect.arrayContaining(["--ephemeral", "--ignore-user-config", "--sandbox", "workspace-write", "--model", "gpt-5.6-sol"]));
      expect(candidate.env.OPENAI_API_KEY).toBeUndefined();
      expect(candidate.env.OPENAI_ADMIN_KEY).toBeUndefined();
      expect(candidate.env.ANTHROPIC_API_KEY).toBeUndefined();
      const worker = codexWorkerSpec({ worker: "terra", cwd: root, prompt: "advice", effort: "high", schemaPath: schema, outputPath: output, denyShimDir: shim, env });
      expect(worker.args).toEqual(expect.arrayContaining(["--json", "--sandbox", "read-only", "--ephemeral", "--ignore-user-config", "gpt-5.6-terra"]));
      const opus = claudeWorkerSpec({ cwd: root, prompt: "advice", effort: "high", denyShimDir: shim, env });
      expect(opus.args).toEqual(expect.arrayContaining(["--no-session-persistence", "--permission-mode", "dontAsk", "--tools", "Read,Glob,Grep", "--model", "claude-opus-4-8"]));
      expect(readFileSync(resolve(shim, "codex"), "utf8")).toContain("direct model subprocess denied");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps pipeline order and uses every included model in four-slot treatments", () => {
    const config = assignment({ id: "cfg-roster", topology: "pipeline", roster: ["sol", "terra", "luna", "opus-4.8"] });
    const consultations = allocateConsultations(config, 1);
    assertBalancedMultiRoster(config, consultations);
    expect(consultations.map((entry) => entry.role)).toEqual(["intent-analyst", "planner", "implementation-analyst", "reviewer"]);
    expect(consultations.map((entry) => entry.dependsOn)).toEqual([[], [0], [1], [2]]);
    expect(new Set(consultations.map((entry) => entry.worker))).toEqual(new Set(config.roster));
  });

  it("detects absolute-path model subprocesses anywhere below the candidate process", () => {
    const ps = [
      "100 1 /usr/bin/codex",
      "101 100 /bin/zsh",
      "102 101 /opt/homebrew/bin/claude",
      "103 101 /usr/bin/git",
      "104 999 /opt/homebrew/bin/codex",
    ].join("\n");
    expect(prohibitedModelDescendants(ps, 100)).toEqual([102]);
  });
});

describe("budget, judges, and plan-first", () => {
  it("collects the exact isolated 3 candidate, 12 worker, and 6 judge calibration matrix", async () => {
    const root = temp("sol-calibration-");
    try {
      const base = Date.now();
      const beforePath = resolve(root, "before.json");
      const afterPath = resolve(root, "after.json");
      const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
      const snapshotQueue = [percentageSnapshot(new Date(base).toISOString(), resetAt), percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 98, 99)];
      let currentTime = base;
      const calls: Array<{ provider: string; role: string; model: string; effort: string }> = [];
      const execute = async (spec: Parameters<NonNullable<Parameters<typeof collectCalibration>[0]["execute"]>>[0]): Promise<ProviderExecution> => {
        const effortArg = spec.command === "codex" ? spec.args.find((arg) => arg.startsWith("model_reasoning_effort=")) : spec.args[spec.args.indexOf("--effort") + 1];
        calls.push({ provider: spec.provider, role: spec.role, model: spec.model, effort: effortArg ?? "" });
        const outputIndex = spec.args.indexOf("--output-last-message");
        if (outputIndex >= 0) writeFileSync(spec.args[outputIndex + 1], JSON.stringify({ summary: [], verification: [], pushback: [], workerEvidenceUsed: [0, 1, 2, 3] }));
        return { exitCode: 0, signal: null, stdout: spec.provider === "anthropic" ? JSON.stringify({ structured_output: { evidence: [] } }) : "", stderr: "", durationMs: 1, timedOut: false, outputLimited: false, usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 100, reasoningTokens: 0, calls: 1 } };
      };
      const profile = await collectCalibration({ beforePath, afterPath, observationsPath: resolve(root, "observations.json"), checkpointPath: resolve(root, "checkpoint.json"), workRoot: resolve(root, "work"), outputPath: resolve(root, "profile.json"), snapshotProvider: { snapshot: async () => { const next = snapshotQueue.shift()!; currentTime = Date.parse(next.capturedAt); return next; } }, execute, now: () => currentTime });
      expect(calls).toHaveLength(21);
      expect(calls.filter((call) => call.role === "worker")).toHaveLength(12);
      expect(calls.filter((call) => call.role === "candidate")).toHaveLength(3);
      expect(calls.filter((call) => call.role === "judge")).toHaveLength(6);
      expect(calls.filter((call) => call.role !== "judge").every((call) => call.effort.includes("xhigh"))).toBe(true);
      expect(calls.filter((call) => call.role === "judge").every((call) => call.effort.includes("high"))).toBe(true);
      expect(new Set(calls.filter((call) => call.role === "worker").map((call) => call.model))).toEqual(new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "claude-opus-4-8"]));
      expect(profile).toMatchObject({ schemaVersion: 2, observedDrops: { openai: 2, anthropic: 1 }, censored: { openai: false, anthropic: false }, groupUpperMargin: 0.2 });
      expect(profile.conversionFactors!.openai).toBeCloseTo(2 / (15 * 0.301));
      expect(profile.conversionFactors!.anthropic).toBeCloseTo(1 / (6 * 0.301));
      expect(JSON.parse(readFileSync(resolve(root, "checkpoint.json"), "utf8"))).toMatchObject({ status: "complete", samples: expect.any(Array) });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("validates calibration freshness, reset timing, censoring, reset crossing, and the ten-percent cap", () => {
    const root = temp("sol-calibration-profile-");
    try {
      const base = Date.now();
      const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
      const before = percentageSnapshot(new Date(base).toISOString(), resetAt, 50, 50);
      expect(() => validatePercentageSnapshot(before, { now: base + 6 * 60_000, maxAgeMs: 5 * 60_000, minimumResetLeadMs: 2 * 60 * 60_000 })).toThrow("five minutes");
      expect(() => validatePercentageSnapshot(before, { now: base + 61 * 60_000, minimumResetLeadMs: 2 * 60 * 60_000 })).toThrow("two hours");
      expect(() => validatePercentageSnapshot({ ...before, providers: { ...before.providers, openai: { remainingPercent: 50, remainingUnits: 2, resetAt, source: "manual-provider-dashboard" } } })).toThrow("exactly one");
      const observations: CalibrationObservations = { schemaVersion: 2, candidateExecutions: 3, workerCalls: 12, judgeCalls: 6, samples: ["typescript:debugging", "python:ambiguous-intent", "go:pushback"].flatMap((taskClass) => ([
        { provider: "openai", model: "gpt-5.6-sol", effort: "xhigh", role: "worker", taskClass, rawWeight: 1 },
        { provider: "openai", model: "gpt-5.6-terra", effort: "xhigh", role: "worker", taskClass, rawWeight: 1 },
        { provider: "openai", model: "gpt-5.6-luna", effort: "xhigh", role: "worker", taskClass, rawWeight: 1 },
        { provider: "anthropic", model: "claude-opus-4-8", effort: "xhigh", role: "worker", taskClass, rawWeight: 1 },
        { provider: "openai", model: "gpt-5.6-sol", effort: "xhigh", role: "orchestrator", taskClass, rawWeight: 1 },
        { provider: "openai", model: "gpt-5.6-sol", effort: "high", role: "judge", taskClass, rawWeight: 1 },
        { provider: "anthropic", model: "claude-opus-4-8", effort: "high", role: "judge", taskClass, rawWeight: 1 },
      ] as CalibrationObservations["samples"])) };
      const beforePath = resolve(root, "before.json"); const afterPath = resolve(root, "after.json"); const observationsPath = resolve(root, "observations.json");
      writeFileSync(beforePath, JSON.stringify(before)); writeFileSync(afterPath, JSON.stringify(percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 50, 50))); writeFileSync(observationsPath, JSON.stringify(observations));
      expect(buildCalibrationProfile({ beforePath, afterPath, observationsPath, now: base + 60_000 })).toMatchObject({ censored: { openai: true, anthropic: true }, observedDrops: { openai: 0, anthropic: 0 }, accountedDrops: { openai: 1, anthropic: 1 }, displayResolutionUpperBound: 1 });
      writeFileSync(afterPath, JSON.stringify(percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 44, 50)));
      expect(() => buildCalibrationProfile({ beforePath, afterPath, observationsPath, now: base + 60_000 })).toThrow("more than 10%");
      writeFileSync(beforePath, JSON.stringify(percentageSnapshot(new Date(base - 60_000).toISOString(), new Date(base - 30_000).toISOString(), 50, 50)));
      writeFileSync(afterPath, JSON.stringify(percentageSnapshot(new Date(base).toISOString(), new Date(base + 5 * 60 * 60_000).toISOString(), 100, 100)));
      expect(() => buildCalibrationProfile({ beforePath, afterPath, observationsPath, now: base + 60_000 })).toThrow("reset is not in the future");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("atomically invalidates quota, malformed-usage, and interrupted calibration attempts", async () => {
    for (const mode of ["quota", "malformed"] as const) {
      const root = temp(`sol-calibration-${mode}-`);
      try {
        const base = Date.now();
        const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
        const beforePath = resolve(root, "before.json");
        const afterPath = resolve(root, "after.json");
        const checkpointPath = resolve(root, "checkpoint.json");
        const preSnapshot = percentageSnapshot(new Date(base).toISOString(), resetAt);
        const execute = async (): Promise<ProviderExecution> => ({ exitCode: 0, signal: null, stdout: "", stderr: mode === "quota" ? "usage limit reached" : "", durationMs: 1, timedOut: false, outputLimited: false, usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: mode === "malformed" ? 0 : 1 } });
        await expect(collectCalibration({ beforePath, afterPath, observationsPath: resolve(root, "observations.json"), checkpointPath, workRoot: resolve(root, "work"), outputPath: resolve(root, "profile.json"), snapshotProvider: { snapshot: async () => preSnapshot }, execute, now: () => base })).rejects.toThrow();
        expect(JSON.parse(readFileSync(checkpointPath, "utf8"))).toMatchObject({ status: "invalid" });
        await expect(collectCalibration({ beforePath, afterPath, observationsPath: resolve(root, "observations.json"), checkpointPath, workRoot: resolve(root, "work-2"), outputPath: resolve(root, "profile.json"), snapshotProvider: { snapshot: async () => preSnapshot }, execute, now: () => base })).rejects.toThrow("cannot be mixed");
      } finally { rmSync(root, { recursive: true, force: true }); }
    }
  });

  it("fails closed before calls on Pitwall pre-snapshot errors and invalidates post-snapshot errors", async () => {
    const preRoot = temp("sol-calibration-pre-fail-");
    try {
      let calls = 0;
      const checkpointPath = resolve(preRoot, "checkpoint.json");
      await expect(collectCalibration({
        beforePath: resolve(preRoot, "before.json"), afterPath: resolve(preRoot, "after.json"), observationsPath: resolve(preRoot, "observations.json"), checkpointPath, workRoot: resolve(preRoot, "work"), outputPath: resolve(preRoot, "profile.json"),
        snapshotProvider: { snapshot: async () => { throw new Error("Pitwall unavailable"); } }, execute: async (spec) => { calls += 1; return successfulProviderExecution(spec); },
      })).rejects.toThrow("Pitwall unavailable");
      expect(calls).toBe(0);
      expect(existsSync(checkpointPath)).toBe(false);
    } finally { rmSync(preRoot, { recursive: true, force: true }); }

    const postRoot = temp("sol-calibration-post-fail-");
    try {
      const base = Date.now();
      const pre = percentageSnapshot(new Date(base).toISOString(), new Date(base + 3 * 60 * 60_000).toISOString());
      let snapshotCalls = 0;
      let modelCalls = 0;
      const checkpointPath = resolve(postRoot, "checkpoint.json");
      await expect(collectCalibration({
        beforePath: resolve(postRoot, "before.json"), afterPath: resolve(postRoot, "after.json"), observationsPath: resolve(postRoot, "observations.json"), checkpointPath, workRoot: resolve(postRoot, "work"), outputPath: resolve(postRoot, "profile.json"), now: () => base,
        snapshotProvider: { snapshot: async () => { snapshotCalls += 1; if (snapshotCalls === 1) return pre; throw new Error("Pitwall post-snapshot failed"); } },
        execute: async (spec) => { modelCalls += 1; return successfulProviderExecution(spec); },
      })).rejects.toThrow("Pitwall post-snapshot failed");
      expect(modelCalls).toBe(21);
      expect(JSON.parse(readFileSync(checkpointPath, "utf8"))).toMatchObject({ status: "invalid" });
    } finally { rmSync(postRoot, { recursive: true, force: true }); }
  });

  it("migrates v1 ledgers and enforces immutable allowance epoch refresh rules", () => {
    const root = temp("sol-epochs-");
    try {
      const path = resolve(root, "ledger.json");
      const base = Date.now(); const firstReset = new Date(base + 60_000).toISOString();
      const first = percentageSnapshot(new Date(base).toISOString(), firstReset, 40, 40);
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, snapshot: first, reservations: [{ runId: "orphan", openaiUnits: 2, anthropicUnits: 2, reservedAt: new Date(base).toISOString(), state: "reserved" }], settledOpenaiUnits: 3, settledAnthropicUnits: 4 }));
      const ledger = new AllowanceLedger(path);
      expect(ledger.snapshot()).toMatchObject({ schemaVersion: 2, epochs: [{ snapshot: first }] });
      expect(() => ledger.openEpoch(percentageSnapshot(new Date(base + 30_000).toISOString(), firstReset, 50, 50))).toThrow("unreconciled");
      ledger.releaseOrphans(new Set());
      expect(() => ledger.openEpoch(percentageSnapshot(new Date(base + 30_000).toISOString(), firstReset, 50, 50))).toThrow("increased before");
      ledger.openEpoch(percentageSnapshot(new Date(base + 60_000).toISOString(), new Date(base + 6 * 60 * 60_000).toISOString(), 100, 100));
      expect(ledger.snapshot().epochs).toHaveLength(2);
      expect(ledger.remaining()).toMatchObject({ openai: 100, anthropic: 100 });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("atomically rejects concurrent reservations beyond remaining allowance", async () => {
    const root = temp("sol-ledger-");
    try {
      const ledger = new AllowanceLedger(resolve(root, "ledger.json"), snapshot(5));
      const accepted = await Promise.all(Array.from({ length: 10 }, (_, index) => Promise.resolve().then(() => ledger.reserve({ runId: `run-${index}`, openaiUnits: 1, anthropicUnits: 1 }))));
      expect(accepted.filter(Boolean)).toHaveLength(5);
      expect(ledger.remaining()).toMatchObject({ openai: 0, anthropic: 0, reservedOpenai: 5, reservedAnthropic: 5 });
      const reservation = worstCaseReservation("worst", assignment({ topology: "fanout" }), estimates);
      expect(reservation).toEqual({ runId: "worst", openaiUnits: 8.4, anthropicUnits: 7.2 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("blinds judges, triggers at ten points, seeds the third family, and resolves by majority", () => {
    const first = judge("gpt");
    const second = judge("claude", -10);
    expect(needsTieBreak(first, second)).toBe(true);
    const family = thirdJudgeFamily("run-fixed");
    const third = judge(family);
    const resolution = resolveJudges("run-fixed", [first, second], third);
    expect(resolution.tieBreakUsed).toBe(true);
    expect(resolution.pass).toBe(true);
    const blinded = buildBlindedJudgePrompt({
      family: "gpt",
      runId: "run-fixed",
      judgeOrdinal: 0,
      taskPrompt: "implement it",
      checks: { hiddenTests: true, build: true, typecheck: true, lint: true, staticAnalysis: true, requiredChanges: true, forbiddenChanges: true, patchScope: true, repositoryIntegrity: true, requirementCompliance: true, topologyCompliance: true, criticalFailures: [] },
      patch: "diff --git a/a b/a",
      testOutput: "pass",
      finalAnswer: "done",
    });
    expect(blinded.prompt).not.toContain("run-fixed");
    expect(blinded.prompt).not.toContain("fanout");
    expect(blinded.prompt).not.toContain("gpt-5.6-sol");
    expect(blinded.label).toMatch(/^candidate-/);
  });

  it("promotes only supported plan-first results and emits a separate 23040-row v2", () => {
    const observations = Array.from({ length: 36 }, (_, index) => ({
      scenarioId: `task-${Math.floor(index / 3)}`,
      repetition: index % 3,
      plain: { score: 85, tokens: 1_000, latencyMs: 1_000 },
      planFirst: { score: 85, tokens: 850, latencyMs: 1_000 },
    }));
    const decision = evaluatePlanFirst(observations);
    expect(decision).toMatchObject({ promote: true, path: "noninferiority-efficiency" });
    const v2 = generateV2Assignments(generateAssignments(), decision);
    expect(v2).toHaveLength(23_040);
    expect(new Set(v2.map((row) => row.id)).size).toBe(23_040);
  });
});

describe("archive, resume, and CLI safeguards", () => {
  it("creates byte-identical deterministic archives, scans secrets, and extracts safely", () => {
    const root = temp("sol-archive-");
    const output = temp("sol-extract-");
    try {
      mkdirSync(resolve(root, "runs/a"), { recursive: true });
      const one = resolve(root, "runs/a/one.txt");
      const two = resolve(root, "runs/a/two.json");
      writeFileSync(one, "hello\n");
      writeFileSync(two, "{\"ok\":true}\n");
      const first = deterministicTarGzip(root, [two, one]);
      const second = deterministicTarGzip(root, [one, two]);
      expect(first.equals(second)).toBe(true);
      const archive = resolve(root, "chunk.tar.gz");
      writeFileSync(archive, first);
      const multipart = Buffer.alloc(2_500, 7);
      const parts = splitArchiveBuffer(multipart, root, "multipart.tar.gz", 1_024);
      expect(parts.map((part) => part.bytes)).toEqual([1_024, 1_024, 452]);
      const reassembled = resolve(root, "reassembled.tar.gz");
      reassembleArchiveParts(root, parts, reassembled);
      expect(readFileSync(reassembled).equals(multipart)).toBe(true);
      extractDeterministicArchive(archive, output);
      expect(readFileSync(resolve(output, "runs/a/one.txt"), "utf8")).toBe("hello\n");
      writeFileSync(resolve(root, "secret.txt"), "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrst\n");
      expect(scanArchiveInputs(root, [resolve(root, "secret.txt")])).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "secret" })]));
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(output, { recursive: true, force: true });
    }
  });

  it("recovers an atomically completed result without invoking a duplicate provider run", async () => {
    const scheduled = scheduleFullChunk(0).slice(0, 1);
    const state = newCampaign({ kind: "full", snapshot: snapshot(), now: `2026-07-10T12:00:${String(Math.floor(Math.random() * 50)).padStart(2, "0")}.000Z` });
    const store = new CampaignStore(state.id);
    store.create(state);
    try {
      store.registerRuns(state, scheduled.map((entry) => entry.run));
      store.transition(state, scheduled[0].run.id, "reserved");
      store.transition(state, scheduled[0].run.id, "running");
      const interruptedLedger = new AllowanceLedger(resolve(store.root, "allowance-ledger.json"), state.snapshot);
      await expect(executeRun({
        generatedRoot: store.root,
        assignment: scheduled[0].assignment,
        scenario: scheduled[0].scenario,
        run: scheduled[0].run,
        allowance: interruptedLedger,
        estimates,
        workerPool: new Semaphore(4),
        execute: successfulProviderExecution,
        afterResultPersisted: () => { throw new Error("injected crash after result persistence"); },
      })).rejects.toThrow("injected crash");
      expect(existsSync(resolve(store.root, "runs", scheduled[0].run.id, "result.json"))).toBe(true);
      expect(interruptedLedger.snapshot().reservations[0].state).toBe("reserved");
      let invoked = false;
      const calibration: CalibrationProfile = { schemaVersion: 1, createdAt: "now", beforeSnapshot: "a", afterSnapshot: "b", candidateExecutions: 1, judgeCalls: 2, estimates };
      await runSchedule({
        store,
        state,
        scheduled,
        calibration,
        execute: async () => { invoked = true; throw new Error("must not execute"); },
      });
      expect(invoked).toBe(false);
      expect(state.runs[scheduled[0].run.id].status).toBe("judged");
      expect(new AllowanceLedger(resolve(store.root, "allowance-ledger.json")).snapshot().reservations[0]).toMatchObject({ state: "settled" });
    } finally {
      rmSync(store.root, { recursive: true, force: true });
    }
  });

  it("keeps campaign and ledger byte-equivalent when a resume epoch is rejected", async () => {
    const base = Date.now();
    const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
    const scheduled = scheduleFullChunk(0).slice(0, 2);
    const state = newCampaign({ kind: "full", snapshot: percentageSnapshot(new Date(base).toISOString(), resetAt, 80, 80), now: new Date(base).toISOString() });
    state.haltedReason = "previous quota stop";
    const store = new CampaignStore(state.id);
    store.create(state);
    try {
      store.registerRuns(state, [scheduled[0].run]);
      const ledgerPath = resolve(store.root, "allowance-ledger.json");
      const ledger = new AllowanceLedger(ledgerPath, state.snapshot);
      expect(ledger.reserve({ runId: scheduled[0].run.id, openaiUnits: 2, anthropicUnits: 2 })).not.toBeNull();
      const campaignBefore = readFileSync(store.statePath);
      const ledgerBefore = readFileSync(ledgerPath);
      const rejected = percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 90, 80);
      await expect(runSchedule({
        store, state, scheduled, freshSnapshot: rejected,
        calibration: { schemaVersion: 1, createdAt: "now", beforeSnapshot: "a", afterSnapshot: "b", candidateExecutions: 1, judgeCalls: 2, estimates },
        now: () => base + 60_000,
      })).rejects.toThrow();
      expect(readFileSync(store.statePath).equals(campaignBefore)).toBe(true);
      expect(readFileSync(ledgerPath).equals(ledgerBefore)).toBe(true);
      expect(state.haltedReason).toBe("previous quota stop");
    } finally { rmSync(store.root, { recursive: true, force: true }); }
  });

  it("reconciles reservations and opens exactly one epoch before accepting resume state", async () => {
    const base = Date.now();
    const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
    const scheduled = scheduleFullChunk(0).slice(0, 2);
    const state = newCampaign({ kind: "full", snapshot: percentageSnapshot(new Date(base).toISOString(), resetAt), now: new Date(base).toISOString() });
    state.haltedReason = "previous quota stop";
    const store = new CampaignStore(state.id);
    store.create(state);
    try {
      store.registerRuns(state, [scheduled[0].run]);
      const ledgerPath = resolve(store.root, "allowance-ledger.json");
      const ledger = new AllowanceLedger(ledgerPath, state.snapshot);
      expect(ledger.reserve({ runId: scheduled[0].run.id, openaiUnits: 2, anthropicUnits: 2 })).not.toBeNull();
      await runSchedule({
        store, state, scheduled, maxRuns: 0,
        freshSnapshot: percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 99, 98),
        calibration: { schemaVersion: 1, createdAt: "now", beforeSnapshot: "a", afterSnapshot: "b", candidateExecutions: 1, judgeCalls: 2, estimates },
        now: () => base + 60_000,
      });
      const accepted = new AllowanceLedger(ledgerPath).snapshot();
      expect(accepted.epochs).toHaveLength(2);
      expect(accepted.reservations[0].state).toBe("released");
      expect(state.haltedReason).toBeUndefined();
      expect(Object.keys(state.runs)).toHaveLength(2);
    } finally { rmSync(store.root, { recursive: true, force: true }); }
  });

  it("refreshes Pitwall only at settled five-minute wave boundaries and opens a conservative epoch", async () => {
    const base = Date.now();
    const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
    const scheduled = scheduleFullChunk(0).slice(0, 2);
    const initial = percentageSnapshot(new Date(base).toISOString(), resetAt, 100, 100);
    const state = newCampaign({ kind: "full", snapshot: initial, concurrency: 1, workerConcurrency: 4, now: new Date(base).toISOString() });
    const store = new CampaignStore(state.id);
    store.create(state);
    let refreshes = 0;
    let clock = base;
    try {
      await runSchedule({
        store,
        state,
        scheduled,
        calibration: { schemaVersion: 1, createdAt: "now", beforeSnapshot: "a", afterSnapshot: "b", candidateExecutions: 1, judgeCalls: 2, estimates },
        execute: successfulProviderExecution,
        onUpdate: (_next, result) => { if (result) clock += 6 * 60_000; },
        now: () => clock,
        snapshotProvider: { snapshot: async () => {
          refreshes += 1;
          expect(new AllowanceLedger(resolve(store.root, "allowance-ledger.json")).snapshot().reservations.some((entry) => entry.state === "reserved")).toBe(false);
          return percentageSnapshot(new Date(clock).toISOString(), resetAt, refreshes === 1 ? 98 : 95, refreshes === 1 ? 99 : 97);
        } },
      });
      expect(refreshes).toBe(2);
      const ledger = new AllowanceLedger(resolve(store.root, "allowance-ledger.json")).snapshot();
      expect(ledger.epochs).toHaveLength(3);
      expect(ledger.epochs[2].snapshot.providers).toMatchObject({ openai: { remainingPercent: 95 }, anthropic: { remainingPercent: 97 } });
      expect(ledger.reservations.some((entry) => entry.state === "reserved")).toBe(false);
    } finally { rmSync(store.root, { recursive: true, force: true }); }
  }, 30_000);

  it("forces a settled Pitwall refresh after a quota warning even before five minutes", async () => {
    const base = Date.now();
    const resetAt = new Date(base + 3 * 60 * 60_000).toISOString();
    const scheduled = scheduleFullChunk(0).slice(0, 1);
    const state = newCampaign({ kind: "full", snapshot: percentageSnapshot(new Date(base).toISOString(), resetAt), concurrency: 1, now: new Date(base).toISOString() });
    const store = new CampaignStore(state.id);
    store.create(state);
    let refreshes = 0;
    try {
      await runSchedule({
        store,
        state,
        scheduled,
        calibration: { schemaVersion: 1, createdAt: "now", beforeSnapshot: "a", afterSnapshot: "b", candidateExecutions: 1, judgeCalls: 2, estimates },
        execute: async () => ({ exitCode: 0, signal: null, stdout: "", stderr: "usage limit reached", durationMs: 1, timedOut: false, outputLimited: false, usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: 1 } }),
        now: () => base + 60_000,
        snapshotProvider: { snapshot: async () => { refreshes += 1; return percentageSnapshot(new Date(base + 60_000).toISOString(), resetAt, 99, 100); } },
      });
      expect(refreshes).toBe(1);
      expect(state.haltedReason).toContain("quota")
      const ledger = new AllowanceLedger(resolve(store.root, "allowance-ledger.json")).snapshot();
      expect(ledger.epochs).toHaveLength(2);
      expect(ledger.reservations.some((entry) => entry.state === "reserved")).toBe(false);
    } finally { rmSync(store.root, { recursive: true, force: true }); }
  });

  it("plans runs without live work and rejects unacknowledged execution", async () => {
    let stdout = "";
    let stderr = "";
    const io = {
      stdout: { write: (chunk: string) => { stdout += chunk; return true; } },
      stderr: { write: (chunk: string) => { stderr += chunk; return true; } },
    };
    expect(await runOrchestrationCommand(["run", "--chunk", "0"], io)).toBe(0);
    expect(stdout).toContain("288 fresh candidate executions");
    expect(await runOrchestrationCommand(["run", "--execute", "--chunk", "0"], io)).toBe(1);
    expect(stderr).toContain("--ack-subscription");
    expect(await runOrchestrationCommand(["calibrate", "--collect", "--execute", "--ack-subscription", "--before", "manual.json"], io, { createPitwallClient: () => ({ snapshot: async () => { throw new Error("must not request Pitwall"); } }) })).toBe(1);
    expect(stderr).toContain("no longer supported");
  });

  it("fetches Pitwall automatically before creating a live pilot campaign", async () => {
    const root = temp("sol-cli-pitwall-");
    let stdout = "";
    let stderr = "";
    let snapshots = 0;
    const io = {
      stdout: { write: (chunk: string) => { stdout += chunk; return true; } },
      stderr: { write: (chunk: string) => { stderr += chunk; return true; } },
    };
    const calibrationPath = resolve(root, "calibration.json");
    writeFileSync(calibrationPath, JSON.stringify({
      schemaVersion: 2, createdAt: new Date().toISOString(), beforeSnapshot: "before.json", afterSnapshot: "after.json", candidateExecutions: 3, judgeCalls: 6, estimates,
      allowanceKinds: { openai: "remainingPercent", anthropic: "remainingPercent" }, conversionFactors: { openai: 1, anthropic: 1 }, rawWeights: { openai: 1, anthropic: 1 }, observedDrops: { openai: 1, anthropic: 1 }, accountedDrops: { openai: 1, anthropic: 1 }, censored: { openai: false, anthropic: false }, displayResolutionUpperBound: 1, snapshotHashes: { before: "a", after: "b" }, groupUpperMargin: 0.2,
      sourceLock: { sourceKind: "pitwall-local", providerWindows: { openai: { window: "primary_five_hour" }, anthropic: { window: "seven_day", scope: "all_models" } } },
    }));
    const now = Date.now();
    let campaignRoot: string | undefined;
    try {
      const result = await runOrchestrationCommand(["pilot", "--execute", "--ack-subscription", "--calibration", calibrationPath, "--max-runs", "0"], io, {
        createPitwallClient: () => ({ snapshot: async () => { snapshots += 1; return percentageSnapshot(new Date(now).toISOString(), new Date(now + 3 * 60 * 60_000).toISOString()); } }),
      });
      expect(result).toBe(0);
      expect(stderr).toBe("");
      expect(snapshots).toBe(1);
      const campaignId = /campaign ([a-z0-9._-]+) created/i.exec(stdout)?.[1];
      expect(campaignId).toBeTruthy();
      campaignRoot = new CampaignStore(campaignId!).root;
      const state = new CampaignStore(campaignId!).load();
      expect(state.sourceLock).toMatchObject({ sourceKind: "pitwall-local", providerWindows: { openai: { window: "primary_five_hour" }, anthropic: { window: "seven_day", scope: "all_models" } } });
    } finally {
      if (campaignRoot) rmSync(campaignRoot, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("renders every dashboard control-plane section and archived drill-down guidance", () => {
    const state = newCampaign({ kind: "full", snapshot: snapshot() });
    const report = buildCampaignReport(state, []);
    const frame = renderOrchestrationDashboard(state, report);
    expect(frame).toContain("RANKED CONFIGURATION LEADERBOARD");
    expect(frame).toContain("FACTOR & MODEL MATRICES");
    expect(frame).toContain("TASK × CONFIGURATION COMPLETION GRID");
    expect(frame).toContain("ACTIVE SOL & WORKERS");
    expect(frame).toContain("SUBSCRIPTION CONSUMPTION & RESERVATIONS");
    expect(frame).toContain("JUDGE AGREEMENT & TIE-BREAK ACTIVITY");
    expect(frame).toContain("CHUNK UPLOAD, REMOTE VERIFICATION & CLEANUP");
    expect(frame).toContain("archived chunks are fetched lazily");
    expect(frame).toContain("Not API spend or exact USD cost");
  });
});
