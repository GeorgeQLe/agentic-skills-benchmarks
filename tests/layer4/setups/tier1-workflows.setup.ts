import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import {
  assertContentIncludes,
  assertContentMatches,
  assertFileCreated,
  readGeneratedFile,
} from "../setup-helpers/artifacts.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";
import { assertNextCommand, assertRecommendedRoute } from "../setup-helpers/routing.js";

interface Tier1WorkflowDefinition {
  skill: string;
  outputPath: string;
  prompt: string;
  fixtureFiles: Record<string, string>;
  expectedIncludes: string[];
  expectedPattern?: RegExp;
  recommendedRoute?: string;
}

function createTier1WorkflowSetup(definition: Tier1WorkflowDefinition): SkillBenchSetup {
  return {
    skill: definition.skill,
    prompt: definition.prompt,
    perRunBudgetUsd: BENCH_BUDGETS_USD.smoke,
    timeoutMs: BENCH_TIMEOUTS_MS.smoke,

    setupProject(workDir: string): void {
      for (const [relativePath, content] of Object.entries(definition.fixtureFiles)) {
        mkdirSync(join(workDir, relativePath, ".."), { recursive: true });
        writeFileSync(join(workDir, relativePath), content);
      }
    },

    assertResult(result: RunResult): Assertion[] {
      const assertions: Assertion[] = [
        {
          description: "Agent command exited successfully",
          pass: result.exitCode === 0,
        },
        assertFileCreated(result, definition.outputPath),
      ];

      const content = readGeneratedFile(result, definition.outputPath);
      if (!content) return assertions;

      for (const expected of definition.expectedIncludes) {
        assertions.push(assertContentIncludes(content, expected, `Output includes ${expected}`));
      }

      if (definition.expectedPattern) {
        assertions.push(assertContentMatches(content, definition.expectedPattern, "Output matches workflow expectation"));
      }

      assertions.push(assertNextCommand(content));
      if (definition.recommendedRoute) {
        assertions.push(assertRecommendedRoute(content, definition.recommendedRoute));
      }

      return assertions;
    },
  };
}

const workflowDefinitions: Tier1WorkflowDefinition[] = [
  {
    skill: "run",
    outputPath: "run-plan.md",
    prompt: "You have the run skill installed. Using the local task files, write run-plan.md with the selected next step, files you would inspect or modify, validation commands, shipping note, and Next command. Do not modify task docs or run git.",
    fixtureFiles: {
      "CLAUDE.md": "# Project Rules\n\nShip verified changes on master.\n",
      "tasks/todo.md": "# Active Phase\n\n### Execution Profile\n**Parallel mode:** serial\n\n## Implementation\n\n- [ ] Step 1.1: Add a deterministic benchmark fixture.\n  - Files: modify `tests/example.test.ts`\n",
      "tasks/roadmap.md": "# Roadmap\n\n## Phase 1\n\n- [ ] Add benchmark fixture\n",
    },
    expectedIncludes: ["Step 1.1", "validation", "shipping"],
    expectedPattern: /tests\/example\.test\.ts|benchmark fixture/i,
    recommendedRoute: "$run",
  },
  {
    skill: "ship",
    outputPath: "ship-manifest.md",
    prompt: "You have the ship skill installed. Read the fixture task and diff summary, then write ship-manifest.md with User goal, Changed files, Tests run, Deploy status, Rollback note, and Next command. Do not run git.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n## Review\n\nValidation passed for the completed fixture step.\n",
      "diff-summary.txt": "M tests/example.test.ts\nM tasks/todo.md\n",
    },
    expectedIncludes: ["User goal", "Changed files", "Tests run", "Rollback note"],
    expectedPattern: /Deploy status|Deploy skipped/i,
    recommendedRoute: "$run",
  },
  {
    skill: "ship-end",
    outputPath: "session-handoff.md",
    prompt: "You have the ship-end skill installed. Write session-handoff.md summarizing completed work, validation evidence, remaining risks, next work, and Next command. Do not run git.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n- [x] Step 1.1 complete\n- [ ] Step 1.2 next\n",
      "tasks/history.md": "# History\n\n- Completed Step 1.1 with tests.\n",
    },
    expectedIncludes: ["completed work", "validation", "remaining risks", "Step 1.2"],
    recommendedRoute: "$run",
  },
  {
    skill: "roadmap",
    outputPath: "tasks/roadmap.md",
    prompt: "You have the roadmap skill installed. Convert specs/feature.md into tasks/roadmap.md with phases, acceptance criteria, verification, and Next command. Keep it concise.",
    fixtureFiles: {
      "specs/feature.md": "# Feature\n\nBuild benchmark coverage reporting with CLI status output and validation.\n",
    },
    expectedIncludes: ["Phase", "Acceptance Criteria", "verification"],
    expectedPattern: /benchmark coverage|CLI status/i,
    recommendedRoute: "$run",
  },
  {
    skill: "plan-phase",
    outputPath: "tasks/todo.md",
    prompt: "You have the plan-phase skill installed. Read tasks/roadmap.md and write tasks/todo.md for the next phase with Tests First, Implementation, file-level details, validation, and Next command.",
    fixtureFiles: {
      "tasks/roadmap.md": "# Roadmap\n\n## Phase 2: Coverage Reporting\n\nAcceptance Criteria:\n- CLI lists custom/generic/blocked coverage.\n- Tests cover blocked rows.\n",
    },
    expectedIncludes: ["Tests First", "Implementation", "CLI lists custom/generic/blocked"],
    recommendedRoute: "$run",
  },
  {
    skill: "feature-interview",
    outputPath: "specs/benchmark-reporting-feature-interview.md",
    prompt: "You have the feature-interview skill installed. Interview the supplied idea without asking follow-up questions by writing specs/benchmark-reporting-feature-interview.md with assumptions, evidence, decision, risks, and Next command.",
    fixtureFiles: {
      "feature-idea.md": "# Idea\n\nBenchmark reports should show whether a skill has custom, generic, or blocked coverage.\n",
    },
    expectedIncludes: ["Assumptions", "evidence", "decision", "risks"],
    expectedPattern: /custom|generic|blocked/i,
    recommendedRoute: "$spec-interview",
  },
  {
    skill: "spec-interview",
    outputPath: "specs/benchmark-reporting.md",
    prompt: "You have the spec-interview skill installed. Turn specs/draft.md into specs/benchmark-reporting.md with Overview, Goals, Non-Goals, Detailed Design, Edge Cases, Test Plan, Acceptance Criteria, Open Questions, Assumptions & Risks, and Next command.",
    fixtureFiles: {
      "specs/draft.md": "# Draft\n\nAdd benchmark coverage status to reports and list output.\n",
    },
    expectedIncludes: ["Overview", "Detailed Design", "Test Plan", "Acceptance Criteria", "Assumptions & Risks"],
    recommendedRoute: "$plan-phase",
  },
  {
    skill: "investigate",
    outputPath: "investigation-report.md",
    prompt: "You have the investigate skill installed. Investigate the failing log in logs/failure.txt and write investigation-report.md with Strategy Used, Root Cause, Fix Applied, Prevention, and Next command. Do not edit source.",
    fixtureFiles: {
      "logs/failure.txt": "ERROR: Custom benchmark coverage row for run points to missing setup_path.\n",
      "tests/harness/bench-coverage.ts": "coverage_status: \"custom\", setup_path: \"tests/layer4/setups/run.setup.ts\"",
    },
    expectedIncludes: ["Strategy Used", "Root Cause", "Prevention"],
    expectedPattern: /missing setup_path|run\.setup\.ts/i,
    recommendedRoute: "$run",
  },
  {
    skill: "session-triage",
    outputPath: "session-triage-report.md",
    prompt: "You have the session-triage skill installed. Triage session-log.md and write session-triage-report.md with Target, Verification verdict, Timeline, Root cause, Recommended fix, Validation plan, and Next command.",
    fixtureFiles: {
      "session-log.md": "# Session\n\nUser invoked $run. Agent skipped the planned coverage matrix validation and shipped anyway.\n",
      "tasks/lessons.md": "# Lessons\n\n- Run required validation before shipping.\n",
    },
    expectedIncludes: ["Verification verdict", "Timeline", "Root cause", "Validation plan"],
    expectedPattern: /coverage matrix validation|shipped anyway/i,
    recommendedRoute: "$targeted-skill-builder",
  },
  {
    skill: "targeted-skill-builder",
    outputPath: "skill-update-plan.md",
    prompt: "You have the targeted-skill-builder skill installed. Read correction.md and write skill-update-plan.md with workflow gap, existing-skill overlap, proposed contract change, validation checks, and Next command. Do not edit SKILL.md files.",
    fixtureFiles: {
      "correction.md": "# Correction\n\nFuture skill creation must add benchmark coverage handling or a blocked status.\n",
      "tasks/lessons.md": "# Lessons\n\n- Add durable validation after workflow corrections.\n",
    },
    expectedIncludes: ["workflow gap", "existing-skill overlap", "contract change", "validation"],
    expectedPattern: /benchmark coverage|blocked status/i,
    recommendedRoute: "$run",
  },
  {
    skill: "benchmark-test-skill",
    outputPath: "benchmark/test-run-2026-05-11.md",
    prompt: "You have the benchmark-test-skill skill installed. Using bench-output.txt and verify-output.txt, write benchmark/test-run-2026-05-11.md with verify status, benchmark pass rate, latency, cost, raw session path, and Next command. Do not run pnpm.",
    fixtureFiles: {
      "verify-output.txt": "layer1 PASS in 7.1s\nlayer2 SKIPPED no tests matched run\n",
      "bench-output.txt": "Benchmark coverage for run: custom\npassRate=1.0 p50=1200 totalCost=0.42 raw=tests/benchmarks/runs/run-codex-abc/report.json\n",
    },
    expectedIncludes: ["verify", "pass rate", "latency", "cost", "raw session path"],
    expectedPattern: /custom|1\.0|run-codex-abc/i,
    recommendedRoute: "$ship",
  },
];

const tier1Setups = Object.fromEntries(
  workflowDefinitions.map((definition) => [definition.skill, createTier1WorkflowSetup(definition)]),
) as Record<string, SkillBenchSetup>;

export const runSetup = tier1Setups.run;
export const shipSetup = tier1Setups.ship;
export const shipEndSetup = tier1Setups["ship-end"];
export const roadmapSetup = tier1Setups.roadmap;
export const planPhaseSetup = tier1Setups["plan-phase"];
export const featureInterviewSetup = tier1Setups["feature-interview"];
export const specInterviewSetup = tier1Setups["spec-interview"];
export const investigateSetup = tier1Setups.investigate;
export const sessionTriageSetup = tier1Setups["session-triage"];
export const targetedSkillBuilderSetup = tier1Setups["targeted-skill-builder"];
export const benchmarkTestSkillSetup = tier1Setups["benchmark-test-skill"];

