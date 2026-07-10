import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
} from "../orchestration/adapters.js";
import { AllowanceLedger, worstCaseReservation, type CalibrationProfile } from "../orchestration/budget.js";
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
      expect(interruptedLedger.reserve({ runId: scheduled[0].run.id, openaiUnits: 2, anthropicUnits: 2 })).not.toBeNull();
      const runRoot = resolve(store.root, "runs", scheduled[0].run.id);
      mkdirSync(runRoot, { recursive: true });
      writeFileSync(resolve(runRoot, "result.json"), JSON.stringify({ run: scheduled[0].run }));
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
      expect(new AllowanceLedger(resolve(store.root, "allowance-ledger.json")).snapshot().reservations[0].state).toBe("settled");
    } finally {
      rmSync(store.root, { recursive: true, force: true });
    }
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
  });

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
