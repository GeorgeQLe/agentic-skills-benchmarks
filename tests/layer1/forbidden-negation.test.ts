import { describe, expect, it } from "vitest";
import { mentionIsNegated, qualityAssertions } from "../harness/bench-quality.js";
import { resolveBenchSetup } from "../harness/bench-setups.js";

// Class 1 — negation-aware forbidden-term matching. A forbidden term is a real
// violation only when it appears in a line that is NOT a negation context;
// naming a forbidden concept in order to reject it (a Non-Goals line, a Don'ts
// bullet) is compliant. Replays the May 17-18 skill-interview false-negative.

describe("forbiddenFabrications negation awareness", () => {
  const evaluate = qualityAssertions.forbiddenFabrications(["GitHub Actions"]);

  it("excuses an inline-negated mention on the same line", () => {
    expect(evaluate("Non-Goals: no GitHub Actions").score).toBe(1);
    expect(evaluate("We will not use GitHub Actions.").score).toBe(1);
  });

  it("still fails on a live, un-negated claim", () => {
    const result = evaluate("Configured a GitHub Actions workflow.");
    expect(result.score).toBe(0);
    expect(result.notes[0]).toContain("GitHub Actions");
  });

  it("excuses a bare bullet under a Non-Goals section heading", () => {
    expect(evaluate("## Non-Goals\n- GitHub Actions").score).toBe(1);
    // scope resets at the next heading — a live mention after it still fails
    expect(evaluate("## Non-Goals\n- GitHub Actions\n\n## Workflow\nRan a GitHub Actions job.").score).toBe(0);
  });

  it("strict:true stays presence-based (design-token semantics)", () => {
    const strict = qualityAssertions.forbiddenFabrications(["GitHub Actions"], { strict: true });
    expect(strict("Non-Goals: no GitHub Actions").score).toBe(0);
    expect(strict("## Non-Goals\n- GitHub Actions").score).toBe(0);
  });
});

describe("specificity forbiddenPhrases negation awareness", () => {
  it("negation-aware by default, presence-based under strict", () => {
    const lenient = qualityAssertions.specificity({
      requiredAny: ["Skill Contract"],
      forbiddenPhrases: ["GitHub Actions"],
    });
    expect(lenient("## Skill Contract\nNon-Goals: no GitHub Actions").score).toBe(1);

    const strict = qualityAssertions.specificity({
      requiredAny: ["Skill Contract"],
      forbiddenPhrases: ["GitHub Actions"],
      strict: true,
    });
    expect(strict("## Skill Contract\nNon-Goals: no GitHub Actions").score).toBe(0);
  });
});

describe("mentionIsNegated helper", () => {
  it("distinguishes rejection from a live claim", () => {
    expect(mentionIsNegated("Avoid GitHub Actions entirely.", "GitHub Actions")).toBe(true);
    expect(mentionIsNegated("## Out of Scope\n- GitHub Actions", "GitHub Actions")).toBe(true);
    expect(mentionIsNegated("The pipeline runs on GitHub Actions.", "GitHub Actions")).toBe(false);
  });

  it("returns false when the term is absent", () => {
    expect(mentionIsNegated("no forbidden concepts here", "GitHub Actions")).toBe(false);
  });
});

// End-to-end (offline): the skill-interview quality evaluator must PASS a
// compliant brief that lists "GitHub Actions" only as a rejected Non-Goal, and
// still FAIL a brief that claims it configured GitHub Actions.

const compliantSkillInterviewBrief = [
  "# benchmark-audit skill brief",
  "",
  "## Overview",
  "benchmark-audit interviews maintainers before adding benchmark coverage. It inspects",
  "tests/harness/bench-coverage.ts and bench-coverage.ts before asking questions. The",
  "source idea is captured in skill-idea.md.",
  "",
  "## Goals",
  "- Require a benchmark coverage plan before routing to create-agentic-skill.",
  "- Read tests/harness/bench-coverage.ts for existing rows.",
  "",
  "## Non-Goals",
  "- GitHub Actions",
  "- No CI wiring of any kind.",
  "",
  "## Skill Contract",
  "The skill routes to create-agentic-skill when the brief is complete and writes",
  "specs/benchmark-audit-skill-brief.md.",
  "",
  "## Workflow",
  "Interview, inspect tests/harness/bench-coverage.ts, then draft the brief.",
  "",
  "## Inputs and Outputs",
  "Input: skill-idea.md. Output: specs/benchmark-audit-skill-brief.md.",
  "",
  "## Safety and Side Effects",
  "No external side effects.",
  "",
  "## Verification and Benchmark Coverage",
  "Validation runs benchmark coverage checks and verifies via bench-coverage.ts.",
  "Add a benchmark coverage plan.",
  "",
  "## Related Skills",
  "create-agentic-skill.",
  "",
  "## Assumptions & Risks",
  "Assumes maintainer confirmation is already provided.",
  "",
  "## Recommended Creation Route",
  "Route to create-agentic-skill.",
  "",
  "## Next command",
  "`/create-agentic-skill`",
  "",
].join("\n");

const claimsGitHubActionsBrief = compliantSkillInterviewBrief.replace(
  "## Workflow\nInterview, inspect tests/harness/bench-coverage.ts, then draft the brief.",
  "## Workflow\nInterview, inspect tests/harness/bench-coverage.ts, then draft the brief.\nWe configured a GitHub Actions workflow to run the benchmark.",
);

describe("skill-interview end-to-end (offline)", () => {
  const setup = resolveBenchSetup("skill-interview");

  it("resolves a graded skill-interview setup with a quality evaluator", () => {
    expect(setup?.qualityEvaluator).toBeDefined();
  });

  it("passes a compliant brief that rejects GitHub Actions in Non-Goals", () => {
    const result = setup!.qualityEvaluator!.evaluate(compliantSkillInterviewBrief);
    expect(result.criticalFailures).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("still fails a brief that claims it configured GitHub Actions", () => {
    const result = setup!.qualityEvaluator!.evaluate(claimsGitHubActionsBrief);
    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toContain("no-fabricated-facts");
  });
});
