import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  AGENTS_TREATMENTS,
  EFFORTS,
  RUBRIC,
  SKILL_TREATMENTS,
  TOPOLOGIES,
  WORKERS,
  type Assignment,
  type ChunkDefinition,
  type DelegatedFactors,
  type DesignLock,
  type ModelPins,
  type PilotAssignment,
  type TaskScenario,
  type Worker,
} from "./types.js";
import { canonicalJson, contentId, jsonLines, prettyCanonicalJson, sha256 } from "./canonical.js";
import { EXPERIMENT_ROOT, REPO_ROOT } from "./paths.js";

export const DESIGN_SEED = "sol-orchestration-v1-2026-07-10";
export const MODEL_PINS: ModelPins = {
  orchestrator: "gpt-5.6-sol",
  workers: {
    sol: "gpt-5.6-sol",
    terra: "gpt-5.6-terra",
    luna: "gpt-5.6-luna",
    "opus-4.8": "claude-opus-4-8",
  },
  judges: { gpt: "gpt-5.6-sol", claude: "claude-opus-4-8" },
};

export const REFERENCE_FACTORS: DelegatedFactors = {
  roster: ["sol"],
  topology: "single",
  agents: "absent",
  skills: "disabled",
  solEffort: "medium",
  workerEffort: "medium",
};

function rosterSubsets(): Worker[][] {
  const subsets: Worker[][] = [];
  for (let mask = 1; mask < 1 << WORKERS.length; mask++) {
    subsets.push(WORKERS.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets;
}

function factorIdentity(factors: DelegatedFactors): DelegatedFactors {
  return {
    roster: [...factors.roster],
    topology: factors.topology,
    agents: factors.agents,
    skills: factors.skills,
    solEffort: factors.solEffort,
    workerEffort: factors.workerEffort,
  };
}

export function generateAssignments(): Assignment[] {
  const assignments: Assignment[] = [];
  for (const roster of rosterSubsets()) {
    for (const topology of TOPOLOGIES) {
      for (const agents of AGENTS_TREATMENTS) {
        for (const skills of SKILL_TREATMENTS) {
          for (const solEffort of EFFORTS) {
            for (const workerEffort of EFFORTS) {
              const factors = factorIdentity({ roster, topology, agents, skills, solEffort, workerEffort });
              assignments.push({
                schemaVersion: 1,
                id: contentId("cfg", factors),
                ordinal: assignments.length,
                ...factors,
              });
            }
          }
        }
      }
    }
  }
  assertAssignments(assignments);
  return assignments;
}

export function assertAssignments(assignments: Assignment[]): void {
  if (assignments.length !== 11_520) throw new Error(`expected 11520 assignments, got ${assignments.length}`);
  const ids = new Set<string>();
  for (const [ordinal, assignment] of assignments.entries()) {
    if (assignment.ordinal !== ordinal) throw new Error(`assignment ordinal mismatch at ${ordinal}`);
    const factors = factorIdentity(assignment);
    const expectedId = contentId("cfg", factors);
    if (assignment.id !== expectedId) throw new Error(`altered assignment ${assignment.id}; expected ${expectedId}`);
    if (ids.has(assignment.id)) throw new Error(`duplicate assignment id ${assignment.id}`);
    ids.add(assignment.id);
  }
}

export function generateChunks(assignments: Assignment[]): ChunkDefinition[] {
  assertAssignments(assignments);
  const chunks: ChunkDefinition[] = [];
  for (let index = 0; index < assignments.length; index += 8) {
    const assignmentIds = assignments.slice(index, index + 8).map((entry) => entry.id);
    const identity = { assignmentIds };
    chunks.push({ schemaVersion: 1, id: contentId("chunk", identity), ordinal: chunks.length, assignmentIds });
  }
  if (chunks.length !== 1_440 || chunks.some((chunk) => chunk.assignmentIds.length !== 8)) {
    throw new Error("chunk generation did not produce 1440 eight-configuration chunks");
  }
  return chunks;
}

export function generatePilot(): PilotAssignment[] {
  const rows: PilotAssignment[] = [];
  const add = (
    kind: PilotAssignment["kind"],
    changedFactor: PilotAssignment["changedFactor"],
    changedLevel: PilotAssignment["changedLevel"],
    factors: DelegatedFactors | null,
  ) => {
    const identity = { kind, changedFactor, changedLevel, factors };
    rows.push({ schemaVersion: 1, id: contentId("pilot", identity), ordinal: rows.length, ...identity });
  };
  add("solo-control", null, null, null);
  add("reference", null, null, factorIdentity(REFERENCE_FACTORS));

  for (const roster of rosterSubsets()) {
    if (canonicalJson(roster) === canonicalJson(REFERENCE_FACTORS.roster)) continue;
    add("ofat", "roster", roster, { ...factorIdentity(REFERENCE_FACTORS), roster });
  }
  for (const topology of TOPOLOGIES) {
    if (topology !== REFERENCE_FACTORS.topology) add("ofat", "topology", topology, { ...factorIdentity(REFERENCE_FACTORS), topology });
  }
  for (const agents of AGENTS_TREATMENTS) {
    if (agents !== REFERENCE_FACTORS.agents) add("ofat", "agents", agents, { ...factorIdentity(REFERENCE_FACTORS), agents });
  }
  for (const skills of SKILL_TREATMENTS) {
    if (skills !== REFERENCE_FACTORS.skills) add("ofat", "skills", skills, { ...factorIdentity(REFERENCE_FACTORS), skills });
  }
  for (const solEffort of EFFORTS) {
    if (solEffort !== REFERENCE_FACTORS.solEffort) add("ofat", "solEffort", solEffort, { ...factorIdentity(REFERENCE_FACTORS), solEffort });
  }
  for (const workerEffort of EFFORTS) {
    if (workerEffort !== REFERENCE_FACTORS.workerEffort) add("ofat", "workerEffort", workerEffort, { ...factorIdentity(REFERENCE_FACTORS), workerEffort });
  }
  if (rows.length !== 30) throw new Error(`expected 30 OFAT pilot rows, got ${rows.length}`);
  return rows;
}

export function loadScenarios(root = EXPERIMENT_ROOT): TaskScenario[] {
  const path = resolve(root, "tasks/scenarios.json");
  const scenarios = JSON.parse(readFileSync(path, "utf8")) as TaskScenario[];
  if (scenarios.length !== 12) throw new Error(`expected 12 scenarios, got ${scenarios.length}`);
  const ids = new Set(scenarios.map((scenario) => scenario.id));
  if (ids.size !== 12) throw new Error("duplicate task scenario id");
  return scenarios;
}

function commandVersion(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unavailable";
  }
}

function filesRecursively(root: string): string[] {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = resolve(dir, name);
      const stats = statSync(full);
      if (stats.isDirectory()) visit(full);
      else if (stats.isFile()) result.push(full);
    }
  };
  visit(root);
  return result;
}

const CHECKSUM_SCOPES = ["tasks", "prompts", "skills", "agents", "fixtures"];

function scopedHashes(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const scope of CHECKSUM_SCOPES) {
    for (const path of filesRecursively(resolve(root, scope))) {
      result[relative(root, path)] = sha256(readFileSync(path));
    }
  }
  return result;
}

function shaRecord(content: string, records?: number): { sha256: string; bytes: number; records?: number } {
  return { sha256: sha256(content), bytes: Buffer.byteLength(content), ...(records === undefined ? {} : { records }) };
}

export function buildGeneratedArtifacts(root = EXPERIMENT_ROOT): {
  assignmentsText: string;
  chunksText: string;
  pilotText: string;
  design: DesignLock;
  checksumsText: string;
} {
  const assignments = generateAssignments();
  const chunks = generateChunks(assignments);
  const pilot = generatePilot();
  const assignmentsText = jsonLines(assignments);
  const chunksText = jsonLines(chunks);
  const pilotText = jsonLines(pilot);
  const scenarios = loadScenarios(root);
  const taskHashes = Object.fromEntries(scenarios.map((scenario) => [scenario.id, sha256(canonicalJson(scenario))]));
  const assets = scopedHashes(root);
  const design: DesignLock = {
    schemaVersion: 1,
    campaignVersion: "v1",
    generatedBy: "pnpm bench:orchestration generate",
    seed: DESIGN_SEED,
    repetitions: 3,
    scenarios: 12,
    assignmentCount: 11_520,
    chunkSize: 8,
    chunkCount: 1_440,
    candidateExecutionCount: 414_720,
    factors: {
      workers: WORKERS,
      topologies: TOPOLOGIES,
      agentsTreatments: AGENTS_TREATMENTS,
      skillTreatments: SKILL_TREATMENTS,
      solEfforts: EFFORTS,
      workerEfforts: EFFORTS,
    },
    hypotheses: [
      "Delegation can improve quality over raw Sol-alone execution.",
      "Topology and worker roster interact with task family.",
      "Task-independent optimized orchestration instructions improve constraint following.",
      "Explicit relevant skills improve quality relative to disabled and decoy treatments.",
      "Higher reasoning effort has diminishing quality returns relative to latency and allowance consumption.",
    ],
    models: MODEL_PINS,
    cliPins: {
      codex: commandVersion("codex", ["--version"]),
      claude: commandVersion("claude", ["--version"]),
      node: process.version,
    },
    taskHashes,
    rubric: RUBRIC,
    stoppingRules: {
      calibrationCandidateCap: 24,
      calibrationJudgeCallCap: 60,
      calibrationRemainingAllowanceFractionCap: 0.1,
      stopOnQuotaOrRateLimit: true,
      reservationContingency: 0.2,
      candidateConcurrencyDefault: 4,
      chunkConfigurations: 8,
      archiveStorage: "github-release-assets",
      archivePartBytes: 67_108_864,
      rawArchiveGitBlobs: false,
      pilotGate: ["fixtures", "capabilities", "judge-agreement", "isolation", "budget", "harness-integrity"],
    },
    environment: {
      platform: process.platform,
      architecture: process.arch,
      repository: basename(REPO_ROOT),
    },
    artifacts: {
      "assignments.jsonl": shaRecord(assignmentsText, assignments.length),
      "chunks.jsonl": shaRecord(chunksText, chunks.length),
      "pilot-ofat.jsonl": shaRecord(pilotText, pilot.length),
      ...Object.fromEntries(Object.entries(assets).map(([path, hash]) => [path, { sha256: hash, bytes: statSync(resolve(root, path)).size }])),
    },
  };
  const designText = prettyCanonicalJson(design);
  const allChecksums: Record<string, string> = {
    "design.lock.json": sha256(designText),
    "assignments.jsonl": sha256(assignmentsText),
    "chunks.jsonl": sha256(chunksText),
    "pilot-ofat.jsonl": sha256(pilotText),
    ...assets,
  };
  const checksumsText = `${Object.entries(allChecksums).sort(([a], [b]) => a.localeCompare(b)).map(([path, hash]) => `${hash}  ${path}`).join("\n")}\n`;
  return { assignmentsText, chunksText, pilotText, design, checksumsText };
}

export function writeGeneratedArtifacts(root = EXPERIMENT_ROOT): void {
  mkdirSync(root, { recursive: true });
  const generated = buildGeneratedArtifacts(root);
  writeFileSync(resolve(root, "assignments.jsonl"), generated.assignmentsText);
  writeFileSync(resolve(root, "chunks.jsonl"), generated.chunksText);
  writeFileSync(resolve(root, "pilot-ofat.jsonl"), generated.pilotText);
  writeFileSync(resolve(root, "design.lock.json"), prettyCanonicalJson(generated.design));
  writeFileSync(resolve(root, "checksums.sha256"), generated.checksumsText);
}

export interface VerificationResult {
  ok: boolean;
  errors: string[];
  assignments: number;
  chunks: number;
  pilotRows: number;
}

function parseJsonLines<T>(text: string): T[] {
  return text.trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

export function verifyGeneratedArtifacts(root = EXPERIMENT_ROOT): VerificationResult {
  const errors: string[] = [];
  let assignments: Assignment[] = [];
  let chunks: ChunkDefinition[] = [];
  let pilot: PilotAssignment[] = [];
  try {
    assignments = parseJsonLines<Assignment>(readFileSync(resolve(root, "assignments.jsonl"), "utf8"));
    assertAssignments(assignments);
    chunks = parseJsonLines<ChunkDefinition>(readFileSync(resolve(root, "chunks.jsonl"), "utf8"));
    pilot = parseJsonLines<PilotAssignment>(readFileSync(resolve(root, "pilot-ofat.jsonl"), "utf8"));
  } catch (error) {
    errors.push((error as Error).message);
  }
  try {
    const expected = buildGeneratedArtifacts(root);
    const comparisons: Array<[string, string]> = [
      ["assignments.jsonl", expected.assignmentsText],
      ["chunks.jsonl", expected.chunksText],
      ["pilot-ofat.jsonl", expected.pilotText],
      ["design.lock.json", prettyCanonicalJson(expected.design)],
      ["checksums.sha256", expected.checksumsText],
    ];
    for (const [name, content] of comparisons) {
      const path = resolve(root, name);
      if (!existsSync(path)) errors.push(`missing ${name}`);
      else if (!readFileSync(path).equals(Buffer.from(content))) errors.push(`${name} differs from deterministic regeneration`);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }
  if (chunks.length !== 1_440) errors.push(`expected 1440 chunks, got ${chunks.length}`);
  if (pilot.length !== 30) errors.push(`expected 30 pilot rows, got ${pilot.length}`);
  return { ok: errors.length === 0, errors, assignments: assignments.length, chunks: chunks.length, pilotRows: pilot.length };
}
