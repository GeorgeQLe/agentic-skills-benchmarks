import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seededNumber } from "./canonical.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import type { Assignment, TaskScenario, Worker } from "./types.js";

export type ConsultationRole = "generalist" | "intent-analyst" | "planner" | "implementation-analyst" | "reviewer";

export interface Consultation {
  ordinal: number;
  topology: Assignment["topology"];
  worker: Worker;
  role: ConsultationRole;
  dependsOn: number[];
}

const MULTI_ROLES: Exclude<ConsultationRole, "generalist">[] = [
  "intent-analyst",
  "planner",
  "implementation-analyst",
  "reviewer",
];

export function allocateConsultations(assignment: Assignment, repetition: 0 | 1 | 2): Consultation[] {
  const slots = assignment.topology === "single" ? 1 : 4;
  const offset = seededNumber(`${assignment.id}:${repetition}`) % assignment.roster.length;
  const workers = Array.from({ length: slots }, (_, index) => assignment.roster[(offset + index) % assignment.roster.length]);
  const roles: ConsultationRole[] = assignment.topology === "single" ? ["generalist"] : MULTI_ROLES;
  return roles.map((role, ordinal) => ({
    ordinal,
    topology: assignment.topology,
    worker: workers[ordinal],
    role,
    dependsOn: assignment.topology === "pipeline" && ordinal > 0 ? [ordinal - 1] : [],
  }));
}

export function assertBalancedMultiRoster(assignment: Assignment, consultations: Consultation[]): void {
  if (assignment.topology === "single") return;
  const used = new Set(consultations.map((consultation) => consultation.worker));
  for (const worker of assignment.roster) {
    if (!used.has(worker)) throw new Error(`${assignment.id} did not allocate included worker ${worker}`);
  }
}

export function buildCandidatePrompt(
  assignment: Assignment,
  scenario: TaskScenario,
  workerEvidence: Array<{ consultation: Consultation; output: string }>,
  planFirst = false,
): string {
  const sol = readFileSync(resolve(EXPERIMENT_ROOT, "prompts/sol.md"), "utf8").trim();
  const plan = planFirst ? `\n\n${readFileSync(resolve(EXPERIMENT_ROOT, "prompts/plan-first.md"), "utf8").trim()}` : "";
  const skill = assignment.skills === "explicit"
    ? "\n\nUse the installed `fixture-implementation` skill for this task."
    : "";
  const evidence = workerEvidence.length === 0
    ? "No worker consultation was used (raw Sol-alone control)."
    : workerEvidence.map(({ consultation, output }) =>
      `## Advisory ${consultation.ordinal + 1}: ${consultation.role} (${consultation.worker})\n${output}`,
    ).join("\n\n");
  return `${sol}${plan}${skill}\n\n# Task\n${scenario.prompt}\n\n# Metered advisory evidence\n${evidence}\n`;
}

export function buildWorkerPrompt(
  scenario: TaskScenario,
  consultation: Consultation,
  priorOutputs: string[] = [],
): string {
  const contract = readFileSync(resolve(EXPERIMENT_ROOT, "prompts/worker.md"), "utf8").trim();
  const handoff = priorOutputs.length > 0 ? `\n\n# Prior pipeline handoff\n${priorOutputs.join("\n\n")}` : "";
  return `${contract}\n\n# Role\n${consultation.role}\n\n# Task\n${scenario.prompt}${handoff}\n`;
}
