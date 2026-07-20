import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentId, deterministicShuffle, sha256 } from "./canonical.js";
import { DESIGN_SEED, loadScenarios } from "./design.js";
import { EXPERIMENT_ROOT, assertWithin } from "./paths.js";
import { materializeFixture } from "./corpus.js";
import type { Assignment, ChunkDefinition, RunIdentity, TaskScenario } from "./types.js";

export function runIdentity(
  assignmentId: string,
  scenarioId: string,
  repetition: 0 | 1 | 2,
  planFirst = false,
  campaignVersion: "v1" | "v2" = "v1",
): RunIdentity {
  const identity = { campaignVersion, assignmentId, scenarioId, repetition, planFirst };
  return { schemaVersion: campaignVersion === "v2" ? 2 : 1, id: contentId("run", identity, 24), ...identity };
}

export function allCandidateIdentities(assignments: Assignment[], scenarios = loadScenarios()): RunIdentity[] {
  const identities: RunIdentity[] = [];
  for (const assignment of assignments) {
    for (const scenario of scenarios) {
      for (const repetition of [0, 1, 2] as const) {
        identities.push(runIdentity(assignment.id, scenario.id, repetition));
      }
    }
  }
  if (identities.length !== 414_720) throw new Error(`expected 414720 run identities, got ${identities.length}`);
  return identities;
}

export function planFirstIdentities(referenceAssignmentId: string, scenarios = loadScenarios()): RunIdentity[] {
  return scenarios.flatMap((scenario) =>
    ([0, 1, 2] as const).map((repetition) => runIdentity(referenceAssignmentId, scenario.id, repetition, true)),
  );
}

export function scheduleChunk(
  chunk: ChunkDefinition,
  scenarios: TaskScenario[] = loadScenarios(),
  seed = DESIGN_SEED,
): RunIdentity[] {
  const schedule: RunIdentity[] = [];
  const blocks = deterministicShuffle(
    scenarios.flatMap((scenario) => ([0, 1, 2] as const).map((repetition) => ({ scenario, repetition }))),
    `${seed}:${chunk.id}:blocks`,
  );
  for (const block of blocks) {
    const ids = deterministicShuffle(chunk.assignmentIds, `${seed}:${chunk.id}:${block.scenario.id}:${block.repetition}`);
    for (const assignmentId of ids) schedule.push(runIdentity(assignmentId, block.scenario.id, block.repetition));
  }
  if (schedule.length !== 288 || new Set(schedule.map((run) => run.id)).size !== 288) {
    throw new Error(`chunk ${chunk.id} did not expand to 288 unique executions`);
  }
  return schedule;
}

export interface IsolatedRunPaths {
  runRoot: string;
  fixture: string;
  artifacts: string;
  trace: string;
  ledger: string;
  fixtureChecksum: string;
}

export function createIsolatedRun(
  generatedRoot: string,
  identity: RunIdentity,
  scenario: TaskScenario,
): IsolatedRunPaths {
  const runRoot = assertWithin(generatedRoot, resolve(generatedRoot, "runs", identity.id));
  if (!existsSync(runRoot)) {
    mkdirSync(runRoot, { recursive: true });
    writeFileSync(resolve(runRoot, "identity.json"), `${JSON.stringify(identity, null, 2)}\n`, { flag: "wx" });
  } else {
    verifyRunOwnership(runRoot, identity.id);
  }
  const attemptsRoot = resolve(runRoot, "attempts");
  mkdirSync(attemptsRoot, { recursive: true });
  const attemptOrdinal = readdirSync(attemptsRoot).filter((name) => /^attempt-\d{3}$/.test(name)).length;
  const attemptRoot = resolve(attemptsRoot, `attempt-${String(attemptOrdinal).padStart(3, "0")}`);
  const fixture = resolve(attemptRoot, "fixture");
  const artifacts = resolve(attemptRoot, "artifacts");
  mkdirSync(artifacts, { recursive: true });
  const fixtureRoot = resolve(EXPERIMENT_ROOT, scenario.fixture);
  const fixtureChecksum = materializeFixture(fixtureRoot, fixture, "seed", false);
  const trace = resolve(attemptRoot, "trace.jsonl");
  const ledger = resolve(attemptRoot, "ledger.jsonl");
  writeFileSync(resolve(attemptRoot, "fixture.sha256"), `${fixtureChecksum}\n`, { flag: "wx" });
  writeFileSync(trace, "", { flag: "wx" });
  writeFileSync(ledger, "", { flag: "wx" });
  return { runRoot, fixture, artifacts, trace, ledger, fixtureChecksum };
}

export function cloneFixtureForJudge(runRoot: string, target: string): void {
  const source = resolve(runRoot, "fixture");
  if (!existsSync(source)) throw new Error("candidate fixture is unavailable");
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, preserveTimestamps: false });
}

export function initializeFixtureRepository(fixture: string): void {
  execFileSync("git", ["init", "--quiet"], { cwd: fixture, stdio: "pipe" });
  execFileSync("git", ["add", "--all"], { cwd: fixture, stdio: "pipe" });
  execFileSync(
    "git",
    ["-c", "user.name=Sol Benchmark", "-c", "user.email=benchmark.invalid", "commit", "--quiet", "-m", "immutable fixture baseline"],
    { cwd: fixture, stdio: "pipe" },
  );
}

export function verifyRunOwnership(runRoot: string, expectedRunId: string): void {
  const identity = JSON.parse(readFileSync(resolve(runRoot, "identity.json"), "utf8")) as RunIdentity;
  if (identity.id !== expectedRunId) throw new Error(`run ownership mismatch: ${identity.id} != ${expectedRunId}`);
  const regenerated = runIdentity(identity.assignmentId, identity.scenarioId, identity.repetition, identity.planFirst);
  if (regenerated.id !== identity.id) throw new Error(`run identity checksum mismatch: ${identity.id}`);
}

export function fixtureDigest(path: string): string {
  return sha256(readFileSync(path));
}
