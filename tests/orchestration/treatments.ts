import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EXPERIMENT_ROOT } from "./paths.js";
import type { Assignment } from "./types.js";

export function installTreatments(fixtureRoot: string, assignment: Assignment): void {
  const agentsPath = resolve(fixtureRoot, "AGENTS.md");
  rmSync(agentsPath, { force: true });
  if (assignment.agents !== "absent") {
    const source = resolve(EXPERIMENT_ROOT, "agents", `${assignment.agents}.md`);
    writeFileSync(agentsPath, readFileSync(source));
  }

  const codexSkills = resolve(fixtureRoot, ".codex/skills");
  const claudeSkills = resolve(fixtureRoot, ".claude/skills");
  rmSync(resolve(fixtureRoot, ".codex"), { recursive: true, force: true });
  rmSync(resolve(fixtureRoot, ".claude"), { recursive: true, force: true });
  if (assignment.skills === "disabled") return;

  const relevant = resolve(EXPERIMENT_ROOT, "skills/relevant");
  for (const target of [resolve(codexSkills, "fixture-implementation"), resolve(claudeSkills, "fixture-implementation")]) {
    mkdirSync(dirname(target), { recursive: true });
    cpSync(relevant, target, { recursive: true, preserveTimestamps: false });
  }
  if (assignment.skills === "decoy") {
    const decoys = resolve(EXPERIMENT_ROOT, "skills/decoys");
    for (const root of [codexSkills, claudeSkills]) {
      cpSync(resolve(decoys, "dependency-first"), resolve(root, "dependency-first"), { recursive: true, preserveTimestamps: false });
      cpSync(resolve(decoys, "skip-verification"), resolve(root, "skip-verification"), { recursive: true, preserveTimestamps: false });
    }
  }
}
