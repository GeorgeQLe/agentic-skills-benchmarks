import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertPublishingPrerequisites, retrieveArchivedRun } from "./archive.js";
import { buildCalibrationProfile, writeSnapshotTemplate } from "./calibration.js";
import { CampaignStore, listCampaigns, newCampaign } from "./campaign.js";
import { capabilityProbes, assertScenarioPairs, qualifyAllFixtures } from "./corpus.js";
import { renderOrchestrationDashboard, loadAllowanceState } from "./dashboard.js";
import { writeGeneratedArtifacts, verifyGeneratedArtifacts } from "./design.js";
import { EXPERIMENT_ROOT, GENERATED_RESULTS_ROOT, REPO_ROOT } from "./paths.js";
import { buildCampaignReport, loadExecutionResults, persistCompactResults, writeCampaignReport } from "./report.js";
import { loadAssignments, loadCalibration, loadChunks, loadPilotRows, runSchedule, scheduleFullChunk, schedulePilot } from "./scheduler.js";
import { readUsageSnapshot } from "./budget.js";
import { evaluatePlanFirst, writeV2Manifest, type PairedPlanObservation } from "./plan-first.js";
import { evaluatePilotGate, readPassingPilotGate } from "./pilot-gates.js";
import { GitHubPublisherTransport } from "./github-publisher-transport.js";
import { PublisherCoordinator } from "./publisher.js";

export interface CommandIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

function defaultIo(): CommandIo {
  return { stdout: process.stdout, stderr: process.stderr };
}

function line(stream: Pick<NodeJS.WriteStream, "write">, value = ""): void {
  stream.write(`${value}\n`);
}

function valueFor(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function integerFor(args: string[], flag: string, fallback: number): number {
  const raw = valueFor(args, flag);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${flag} must be a non-negative integer`);
  return value;
}

export function orchestrationHelpText(): string {
  return [
    "Sol orchestration benchmark control plane",
    "",
    "Usage: pnpm bench:orchestration <command> [options]",
    "",
    "Commands:",
    "  generate   deterministically write and lock v1 design files",
    "  verify     regenerate byte-for-byte, validate pairs, and qualify fixtures",
    "  calibrate  build capped allowance estimates from two manual snapshots",
    "  pilot      plan or execute the replicated 30-row OFAT pilot plus plan-first",
    "  run        plan or execute the full campaign in immutable eight-configuration chunks",
    "  resume     continue only incomplete immutable run IDs in a campaign",
    "  judge      show candidate-complete runs awaiting independent judges",
    "  report     render dashboard/reports or drill into one run",
    "  archive    ask the standalone publisher state machine to publish one chunk",
    "  cleanup    ask the publisher state machine to clean one verified chunk",
    "",
    "Live execution requires --execute --ack-subscription, a fresh --snapshot,",
    "and a --calibration profile. Start bench:orchestration:publish separately; raw archives are uploaded as",
    "bounded multipart GitHub release assets, never committed as Git blobs. API-key variables",
    "are never passed to candidate, worker, or judge processes.",
    "",
    "Examples:",
    "  pnpm bench:orchestration generate",
    "  pnpm bench:orchestration verify",
    "  pnpm bench:orchestration calibrate --template usage-snapshot.json",
    "  pnpm bench:orchestration run --chunk 0",
    "  pnpm bench:orchestration report --campaign <id>",
  ].join("\n");
}

async function generateCommand(io: CommandIo): Promise<number> {
  writeGeneratedArtifacts();
  const verified = verifyGeneratedArtifacts();
  line(io.stdout, `locked ${verified.assignments} assignments in ${verified.chunks} chunks; pilot rows ${verified.pilotRows}`);
  return verified.ok ? 0 : 1;
}

async function verifyCommand(args: string[], io: CommandIo): Promise<number> {
  const verified = verifyGeneratedArtifacts();
  for (const error of verified.errors) line(io.stderr, `ERROR ${error}`);
  assertScenarioPairs();
  const scratch = resolve(GENERATED_RESULTS_ROOT, "verification-scratch");
  const qualifications = qualifyAllFixtures(scratch);
  rmSync(scratch, { recursive: true, force: true });
  for (const result of qualifications) line(io.stdout, `${result.ok ? "PASS" : "FAIL"} fixture ${result.fixtureId} seed=${result.seedExitCode} reference=${result.referenceExitCode}`);
  const probes = capabilityProbes();
  line(io.stdout, `capabilities ${Object.entries(probes).map(([name, version]) => `${name}=${version}`).join(" | ")}`);
  if (args.includes("--campaign-ready")) assertPublishingPrerequisites();
  else {
    try { assertPublishingPrerequisites(); line(io.stdout, "PASS archive publishing prerequisites"); }
    catch (error) { line(io.stdout, `WARN ${(error as Error).message}`); }
  }
  const ok = verified.ok && qualifications.every((result) => result.ok) && Object.values(probes).every((value) => value !== "unavailable");
  line(io.stdout, ok ? "verification passed" : "verification failed");
  return ok ? 0 : 1;
}

async function calibrateCommand(args: string[], io: CommandIo): Promise<number> {
  const template = valueFor(args, "--template");
  if (template) {
    writeSnapshotTemplate(resolve(template));
    line(io.stdout, `manual usage snapshot template written to ${resolve(template)}`);
    return 0;
  }
  const before = valueFor(args, "--before");
  const after = valueFor(args, "--after");
  const observations = valueFor(args, "--observations");
  const output = resolve(valueFor(args, "--output") ?? "calibration-profile.json");
  if (!before || !after || !observations) throw new Error("calibrate requires --before, --after, and --observations (or --template)");
  const profile = buildCalibrationProfile({ beforePath: resolve(before), afterPath: resolve(after), observationsPath: resolve(observations) });
  writeFileSync(output, `${JSON.stringify(profile, null, 2)}\n`, { flag: "wx" });
  line(io.stdout, `calibration profile written to ${output}: ${profile.candidateExecutions}/24 candidates, ${profile.judgeCalls}/60 judge calls`);
  return 0;
}

function liveGate(args: string[]): void {
  if (!args.includes("--execute") || !args.includes("--ack-subscription")) {
    throw new Error("live work requires both --execute and --ack-subscription");
  }
  const verified = verifyGeneratedArtifacts();
  if (!verified.ok) throw new Error(`locked experiment verification failed: ${verified.errors.join("; ")}`);
  assertScenarioPairs();
}

async function executeCampaign(args: string[], kind: "pilot" | "full", io: CommandIo): Promise<number> {
  const requestedChunk = valueFor(args, "--chunk");
  const chunkOrdinal = integerFor(args, "--chunk", 0);
  if (!args.includes("--execute")) {
    if (kind === "pilot") {
      line(io.stdout, "pilot plan: 1116 fresh candidate executions (1080 OFAT + 36 plan-first)");
    } else if (requestedChunk !== undefined) {
      line(io.stdout, `full plan: 288 fresh candidate executions in chunk ${chunkOrdinal} (8 configurations × 12 tasks × 3 repetitions)`);
    } else {
      line(io.stdout, "full plan: 414720 fresh candidate executions in 1440 deterministic eight-configuration chunks");
    }
    line(io.stdout, "No model calls launched. Add --execute --ack-subscription --snapshot <file> --calibration <file>.");
    return 0;
  }
  liveGate(args);
  const snapshotPath = valueFor(args, "--snapshot");
  const calibrationPath = valueFor(args, "--calibration");
  if (!snapshotPath || !calibrationPath) throw new Error("live execution requires --snapshot and --calibration");
  if (kind === "full") {
    const pilotGate = valueFor(args, "--pilot-gate");
    if (!pilotGate) throw new Error("full execution requires --pilot-gate from a completed passing pilot");
    readPassingPilotGate(resolve(pilotGate));
  }
  const snapshot = readUsageSnapshot(resolve(snapshotPath));
  const state = newCampaign({
    kind,
    snapshot,
    concurrency: integerFor(args, "--concurrency", 4),
    workerConcurrency: integerFor(args, "--worker-concurrency", 8),
  });
  const store = new CampaignStore(state.id);
  store.create(state);
  line(io.stdout, `campaign ${state.id} created`);
  const calibration = loadCalibration(resolve(calibrationPath));
  const update = (next: typeof state, result?: Awaited<ReturnType<typeof import("./runner.js")["executeRun"]>>) => {
    if (result) line(io.stdout, `${result.passed ? "PASS" : "FAIL"} ${result.run.id} score=${result.score} ${result.durationMs}ms`);
    if (next.haltedReason) line(io.stderr, `HALT ${next.haltedReason}`);
  };
  if (kind === "pilot") {
    const scheduled = schedulePilot();
    await runSchedule({ store, state, scheduled, calibration, maxRuns: integerFor(args, "--max-runs", scheduled.length), onUpdate: update });
  } else {
    const chunks = loadChunks();
    const ordinals = requestedChunk !== undefined
      ? [chunkOrdinal]
      : chunks.map((chunk) => chunk.ordinal).slice(0, integerFor(args, "--max-chunks", chunks.length));
    let remainingRuns = integerFor(args, "--max-runs", Number.MAX_SAFE_INTEGER);
    for (const ordinal of ordinals) {
      if (state.haltedReason || remainingRuns <= 0) break;
      const chunk = chunks[ordinal];
      if (!chunk) throw new Error(`chunk ordinal must be between 0 and ${chunks.length - 1}`);
      state.chunks[chunk.id] = state.chunks[chunk.id] ?? { chunkId: chunk.id, ordinal, expectedRuns: 288, completedRuns: 0, archiveState: "local" };
      store.save(state);
      const scheduled = scheduleFullChunk(ordinal);
      const maxRuns = Math.min(remainingRuns, scheduled.length);
      await runSchedule({ store, state, scheduled, calibration, maxRuns, onUpdate: update });
      remainingRuns -= maxRuns;
      const completed = scheduled.filter((entry) => state.runs[entry.run.id]?.status === "judged").length;
      state.chunks[chunk.id].completedRuns = completed;
      store.save(state);
      const results = loadExecutionResults(store.root);
      persistCompactResults(store.root, results);
      writeCampaignReport(store.root, buildCampaignReport(state, results));
    }
  }
  const results = loadExecutionResults(store.root);
  persistCompactResults(store.root, results);
  const report = buildCampaignReport(state, results);
  writeCampaignReport(store.root, report);
  if (kind === "pilot" && results.length === 1_116) {
    const scratch = resolve(GENERATED_RESULTS_ROOT, `pilot-gate-${state.id}`);
    const fixtureQualification = qualifyAllFixtures(scratch).every((result) => result.ok);
    rmSync(scratch, { recursive: true, force: true });
    const gate = evaluatePilotGate({ state, report, results, fixtureQualification });
    const gatePath = resolve(store.root, "pilot-gate.json");
    writeFileSync(gatePath, `${JSON.stringify(gate, null, 2)}\n`, { flag: "wx" });
    line(io.stdout, `${gate.passed ? "PASS" : "FAIL"} pilot gate ${gatePath}`);
  }
  line(io.stdout, renderOrchestrationDashboard(state, report, loadAllowanceState(store.root)));
  return state.haltedReason ? 2 : 0;
}

async function resumeCommand(args: string[], io: CommandIo): Promise<number> {
  if (!args.includes("--execute")) throw new Error("resume requires --execute and never reuses provider sessions");
  liveGate(args);
  const id = valueFor(args, "--campaign");
  const calibration = valueFor(args, "--calibration");
  if (!id || !calibration) throw new Error("resume requires --campaign and --calibration");
  const store = new CampaignStore(id);
  const state = store.load();
  state.haltedReason = undefined;
  const scheduled = state.kind === "pilot"
    ? schedulePilot()
    : [...new Set(Object.values(state.chunks).map((chunk) => chunk.ordinal))].flatMap(scheduleFullChunk);
  await runSchedule({ store, state, scheduled, calibration: loadCalibration(resolve(calibration)), maxRuns: integerFor(args, "--max-runs", scheduled.length) });
  const results = loadExecutionResults(store.root);
  persistCompactResults(store.root, results);
  if (state.kind === "full") {
    for (const chunk of Object.values(state.chunks).sort((a, b) => a.ordinal - b.ordinal)) {
      const chunkRuns = scheduleFullChunk(chunk.ordinal);
      chunk.completedRuns = chunkRuns.filter((entry) => state.runs[entry.run.id]?.status === "judged").length;
    }
    store.save(state);
  }
  const report = buildCampaignReport(state, results);
  writeCampaignReport(store.root, report);
  line(io.stdout, renderOrchestrationDashboard(state, report, loadAllowanceState(store.root)));
  return state.haltedReason ? 2 : 0;
}

async function judgeCommand(args: string[], io: CommandIo): Promise<number> {
  const id = valueFor(args, "--campaign");
  if (!id) throw new Error("judge requires --campaign");
  const state = new CampaignStore(id).load();
  const awaiting = Object.values(state.runs).filter((run) => run.status === "candidate-complete");
  line(io.stdout, `${awaiting.length} candidate-complete runs await blinded judging`);
  for (const run of awaiting) line(io.stdout, run.run.id);
  if (args.includes("--execute")) {
    throw new Error("judge-only recovery is intentionally conservative; use resume so deterministic checks and fresh judges are reconstructed from the immutable run ID");
  }
  return 0;
}

function drillDown(store: CampaignStore, runId: string, io: CommandIo, resultsRepoOverride?: string): void {
  let runRoot = resolve(store.root, "runs", runId);
  if (!existsSync(runRoot)) {
    const resultsRepo = resolve(resultsRepoOverride ?? resolve(REPO_ROOT, "../agentic-skills-benchmark-results"));
    runRoot = retrieveArchivedRun({ resultsRepo, campaignId: store.campaignId, runId, cacheRoot: resolve(store.root, "archive-cache") });
  }
  const identity = readFileSync(resolve(runRoot, "identity.json"), "utf8");
  const result = readFileSync(resolve(runRoot, "result.json"), "utf8");
  line(io.stdout, `IDENTITY\n${identity}`);
  line(io.stdout, `RESULT\n${result}`);
  const parsed = JSON.parse(result) as { attemptRoot: string };
  const artifacts = resolve(runRoot, parsed.attemptRoot.split("/").slice(-2).join("/"), "artifacts");
  for (const name of ["candidate.prompt.md", "deterministic.json", "worker-0.evidence.json", "judge-0.prompt.md", "judge-1.prompt.md"]) {
    const path = resolve(artifacts, name);
    if (existsSync(path)) line(io.stdout, `${name.toUpperCase()}\n${readFileSync(path, "utf8")}`);
  }
}

async function reportCommand(args: string[], io: CommandIo): Promise<number> {
  const id = valueFor(args, "--campaign") ?? listCampaigns().at(-1);
  if (!id) throw new Error("no campaigns found; pass --campaign");
  const store = new CampaignStore(id);
  const state = store.load();
  const runId = valueFor(args, "--run");
  if (runId) { drillDown(store, runId, io, valueFor(args, "--results-repo")); return 0; }
  const results = loadExecutionResults(store.root);
  if (args.includes("--promote-plan-first")) {
    if (state.kind !== "pilot") throw new Error("plan-first promotion can only be evaluated from a completed pilot campaign");
    const reference = loadPilotRows().find((row) => row.kind === "reference");
    if (!reference) throw new Error("pilot reference row is missing");
    const referenceResults = results.filter((result) => result.assignmentId === reference.id);
    const grouped = new Map<string, { plain?: typeof referenceResults[number]; planFirst?: typeof referenceResults[number] }>();
    for (const result of referenceResults) {
      const key = `${result.scenarioId}:${result.run.repetition}`;
      const pair = grouped.get(key) ?? {};
      if (result.run.planFirst) pair.planFirst = result;
      else pair.plain = result;
      grouped.set(key, pair);
    }
    const observations: PairedPlanObservation[] = [...grouped.entries()].flatMap(([key, pair]) => {
      if (!pair.plain || !pair.planFirst) return [];
      const tokens = (result: typeof pair.plain) => result!.usage.openai.inputTokens + result!.usage.openai.outputTokens + result!.usage.openai.reasoningTokens + result!.usage.anthropic.inputTokens + result!.usage.anthropic.outputTokens + result!.usage.anthropic.reasoningTokens;
      return [{
        scenarioId: key.split(":")[0],
        repetition: Number(key.split(":")[1]),
        plain: { score: pair.plain.score, tokens: tokens(pair.plain), latencyMs: pair.plain.durationMs },
        planFirst: { score: pair.planFirst.score, tokens: tokens(pair.planFirst), latencyMs: pair.planFirst.durationMs },
      }];
    });
    const decision = evaluatePlanFirst(observations);
    line(io.stdout, JSON.stringify(decision, null, 2));
    if (decision.promote) {
      const v2Root = resolve(EXPERIMENT_ROOT, "../v2");
      mkdirSync(v2Root, { recursive: true });
      const manifest = resolve(v2Root, "assignments-v2.jsonl");
      writeV2Manifest(manifest, loadAssignments(), decision);
      writeFileSync(resolve(v2Root, "promotion-decision.json"), `${JSON.stringify(decision, null, 2)}\n`, { flag: "wx" });
      line(io.stdout, `plan-first promoted into separate 23040-row v2 manifest ${manifest}; v1 was not modified`);
    }
    return decision.promote ? 0 : 2;
  }
  const report = buildCampaignReport(state, results);
  const paths = writeCampaignReport(store.root, report);
  line(io.stdout, renderOrchestrationDashboard(state, report, loadAllowanceState(store.root), integerFor(args, "--width", 120)));
  line(io.stdout, `reports: ${paths.json}, ${paths.csv}, ${paths.markdown}`);
  return 0;
}

async function archiveCommand(args: string[], io: CommandIo): Promise<number> {
  const id = valueFor(args, "--campaign");
  if (!id) throw new Error("archive requires --campaign");
  const chunk = integerFor(args, "--chunk", 0);
  const store = new CampaignStore(id);
  store.load();
  if (args.includes("--local-only")) throw new Error("--local-only was removed; use bench:orchestration:publish --dry-run for read-only eligibility reporting");
  const coordinator = new PublisherCoordinator({
    store,
    transport: new GitHubPublisherTransport(REPO_ROOT),
    once: true,
    targetChunkOrdinal: chunk,
    cleanup: false,
    stdout: io.stdout,
    stderr: io.stderr,
  });
  const result = await coordinator.run();
  return result.failed > 0 ? 2 : 0;
}

async function cleanupCommand(args: string[], io: CommandIo): Promise<number> {
  const id = valueFor(args, "--campaign");
  const chunkId = valueFor(args, "--chunk-id");
  if (!id || !chunkId) throw new Error("cleanup requires --campaign and --chunk-id");
  const store = new CampaignStore(id);
  store.load();
  const coordinator = new PublisherCoordinator({
    store,
    transport: new GitHubPublisherTransport(REPO_ROOT),
    once: true,
    targetChunkId: chunkId,
    cleanup: true,
    cleanupOnly: true,
    stdout: io.stdout,
    stderr: io.stderr,
  });
  const result = await coordinator.run();
  return result.failed > 0 ? 2 : 0;
}

export async function runOrchestrationCommand(args: string[], io: CommandIo = defaultIo()): Promise<number> {
  const [command, ...rest] = args;
  try {
    if (!command || command === "help" || command === "--help" || command === "-h") {
      line(io.stdout, orchestrationHelpText());
      return 0;
    }
    if (command === "generate") return await generateCommand(io);
    if (command === "verify") return await verifyCommand(rest, io);
    if (command === "calibrate") return await calibrateCommand(rest, io);
    if (command === "pilot") return await executeCampaign(rest, "pilot", io);
    if (command === "run") return await executeCampaign(rest, "full", io);
    if (command === "resume") return await resumeCommand(rest, io);
    if (command === "judge") return await judgeCommand(rest, io);
    if (command === "report") return await reportCommand(rest, io);
    if (command === "archive") return await archiveCommand(rest, io);
    if (command === "cleanup") return await cleanupCommand(rest, io);
    throw new Error(`unknown orchestration command: ${command}`);
  } catch (error) {
    line(io.stderr, (error as Error).message);
    return 1;
  }
}
