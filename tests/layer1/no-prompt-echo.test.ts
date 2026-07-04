import { describe, expect, it } from "vitest";
import {
  CUSTOM_BENCH_SCENARIOS,
  CUSTOM_BENCH_SETUPS,
} from "../harness/bench-setups.js";
import type { QualityCriterion, SkillBenchSetup } from "../harness/bench-types.js";

// Anti-prompt-echo lint. A *critical* quality gate that can be satisfied purely
// by transcribing the prompt tests nothing about the skill — the agent passes by
// copying instructions rather than deriving conclusions from the fixture. This
// lint fails a suite when EVERY required literal of a critical fact-criterion is
// either echoed in the prompt or an allowlisted dictated token (route, file path,
// skill/pack identity), i.e. the criterion forces no fixture reading at all.
//
// Its green state is the definition of "de-leaked". A new suite whose critical
// fact-gate merely re-checks prompt tokens fails here until it gates on a
// fixture-derived conclusion the prompt does not name.

// benchmark-test-skill is a benchmark self-test whose entire contract IS the
// exact transcription of fixture evidence into a structured report, so its
// evidence-linked gate legitimately re-checks the prompt-named values.
const EXEMPT_SETUPS = new Set(["benchmark-test-skill"]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[`*_'"]/g, "").replace(/\s+/g, " ").trim();
}

// Tokens the prompt is allowed to dictate: routes, file paths, and the skill/pack
// identity. Requiring the output to name these is provenance/routing, not a
// leaked conclusion.
function isDictatedToken(literal: string, setup: SkillBenchSetup): boolean {
  const trimmed = literal.trim();
  const folded = trimmed.toLowerCase();
  if (folded === setup.skill.toLowerCase()) return true;
  // Route/path/filename detection applies only to single-token literals — a
  // whole sentence that merely contains a path is fixture content, not a
  // dictated token.
  if (/\s/.test(trimmed)) return false;
  if (/^[/$]/.test(trimmed)) return true; // route command, e.g. /exec, $ship
  if (trimmed.includes("/")) return true; // path-shaped, e.g. tasks/todo.md
  if (/\.\w{1,5}$/.test(trimmed)) return true; // filename, e.g. pack-input.md
  return false;
}

function criticalFactCriteria(setup: SkillBenchSetup): QualityCriterion[] {
  const rubric = setup.qualityEvaluator?.rubric;
  if (!rubric) return [];
  return rubric.criteria.filter(
    (criterion) => criterion.critical && (criterion.requiredLiterals?.length ?? 0) > 0,
  );
}

interface Leak {
  skill: string;
  criterion: string;
  literals: string[];
}

function findLeaks(name: string, setup: SkillBenchSetup): Leak[] {
  if (EXEMPT_SETUPS.has(name)) return [];
  const prompt = normalize(setup.prompt);
  const leaks: Leak[] = [];
  for (const criterion of criticalFactCriteria(setup)) {
    const literals = criterion.requiredLiterals ?? [];
    // Dictated tokens (routes, paths, filenames, skill identity) are legitimate
    // provenance requirements; a gate made only of them is not a leak. A gate is
    // a leak when it has real content literals AND every one is echoed in the
    // prompt — i.e. it forces no fixture reading.
    const contentLiterals = literals.filter((literal) => !isDictatedToken(literal, setup));
    if (contentLiterals.length === 0) continue;
    if (contentLiterals.every((literal) => prompt.includes(normalize(literal)))) {
      leaks.push({ skill: name, criterion: criterion.id, literals: contentLiterals });
    }
  }
  return leaks;
}

function allLeaks(): Leak[] {
  const setups = { ...CUSTOM_BENCH_SETUPS, ...CUSTOM_BENCH_SCENARIOS };
  return Object.entries(setups).flatMap(([name, setup]) => findLeaks(name, setup));
}

describe("no prompt-echo in critical quality gates", () => {
  it("no critical fact-gate is fully satisfiable by transcribing the prompt", () => {
    const leaks = allLeaks();
    const report = leaks
      .map((leak) => `${leak.skill} · ${leak.criterion}: [${leak.literals.join(", ")}]`)
      .join("\n");
    expect(leaks, `prompt-echoed critical fact gates:\n${report}`).toEqual([]);
  });
});
