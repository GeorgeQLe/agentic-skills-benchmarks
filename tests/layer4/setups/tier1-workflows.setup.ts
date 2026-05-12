import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import {
  assertContentIncludes,
  assertContentMatches,
  assertFileCreated,
  readGeneratedFile,
} from "../setup-helpers/artifacts.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";
import { assertNextCommand, assertRecommendedRoute } from "../setup-helpers/routing.js";
import {
  concreteCommandReferenceCriterion,
  concreteFileReferenceCriterion,
  createSetupQualityEvaluator,
  forbiddenFabricationCriterion,
  nextRouteCriterion,
  referenceTraitCriterion,
  requiredFactCoverageCriterion,
  requiredPatternCriterion,
  specificityCriterion,
} from "../setup-helpers/quality.js";

interface Tier1WorkflowDefinition {
  skill: string;
  outputPath: string;
  prompt: string;
  fixtureFiles: Record<string, string>;
  expectedIncludes: string[];
  expectedPattern?: RegExp;
  perRunBudgetUsd?: number;
  timeoutMs?: number;
  recommendedRoute?: string;
  recommendedRoutes?: Partial<Record<BenchAgent, string>>;
  qualityEvaluator?: SkillBenchSetup["qualityEvaluator"];
}

function expectedRoute(definition: Tier1WorkflowDefinition, agent?: BenchAgent): string | undefined {
  if (agent && definition.recommendedRoutes?.[agent]) {
    return definition.recommendedRoutes[agent];
  }
  return definition.recommendedRoute;
}

function workflowQualityEvaluator(options: {
  minimumScore?: number;
  evidenceFacts: string[];
  specificMarkers: string[];
  nextRoute?: string;
  coreTraitId: string;
  coreTraitDescription: string;
  coreTraits: string[];
  validationPatterns?: RegExp[];
  concreteFiles?: string[];
  concreteCommands?: string[];
  nextRoutes?: string[];
  forbidden?: string[];
}): SkillBenchSetup["qualityEvaluator"] {
  return createSetupQualityEvaluator({
    minimumScore: options.minimumScore ?? 0.78,
    criteria: [
      requiredFactCoverageCriterion({
        id: "evidence-linked",
        description: "Names concrete fixture facts used as evidence",
        weight: 3,
        critical: true,
        facts: options.evidenceFacts,
      }),
      ...(options.concreteFiles
        ? [
          concreteFileReferenceCriterion({
            id: "file-reference",
            description: "Names concrete fixture files or generated outputs",
            weight: 1,
            critical: true,
            files: options.concreteFiles,
          }),
        ]
        : []),
      specificityCriterion({
        id: "scope-control",
        description: "Keeps the answer scoped to the supplied workflow fixture",
        weight: 2,
        requiredAny: options.specificMarkers,
        forbiddenPhrases: ["production deploy", "GitHub Actions", "database migration"],
      }),
      referenceTraitCriterion({
        id: options.coreTraitId,
        description: options.coreTraitDescription,
        weight: 2,
        traits: options.coreTraits,
      }),
      ...(options.validationPatterns
        ? [
          requiredPatternCriterion({
            id: "validation-specificity",
            description: "Names concrete validation or verification evidence",
            weight: 2,
            patterns: options.validationPatterns,
          }),
        ]
        : []),
      ...(options.concreteCommands
        ? [
          concreteCommandReferenceCriterion({
            id: "command-reference",
            description: "Names concrete commands from the fixture",
            weight: 1,
            commands: options.concreteCommands,
          }),
        ]
        : []),
      nextRouteCriterion({
        id: "actionable-next-route",
        description: "Includes an explicit next command handoff",
        weight: 1,
        route: options.nextRoutes ?? options.nextRoute,
      }),
      forbiddenFabricationCriterion({
        id: "no-fabricated-facts",
        description: "Avoids fabricated files, deploys, services, and GitHub Actions",
        weight: 3,
        critical: true,
        forbidden: [
          ".github/workflows",
          "GitHub Actions",
          "Postgres",
          "OpenAI Evals API",
          "production deploy",
          ...(options.forbidden ?? []),
        ],
      }),
    ],
  });
}

function createTier1WorkflowSetup(definition: Tier1WorkflowDefinition): SkillBenchSetup {
  return {
    skill: definition.skill,
    prompt: definition.prompt,
    perRunBudgetUsd: definition.perRunBudgetUsd ?? BENCH_BUDGETS_USD.smoke,
    timeoutMs: definition.timeoutMs ?? BENCH_TIMEOUTS_MS.smoke,
    qualityOutputPath: definition.outputPath,
    qualityEvaluator: definition.qualityEvaluator,

    setupProject(workDir: string): void {
      for (const [relativePath, content] of Object.entries(definition.fixtureFiles)) {
        mkdirSync(join(workDir, relativePath, ".."), { recursive: true });
        writeFileSync(join(workDir, relativePath), content);
      }
    },

    assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[] {
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
      const route = expectedRoute(definition, context?.agent);
      if (route) {
        assertions.push(assertRecommendedRoute(content, route));
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
    expectedIncludes: ["Step 1.1", "validation", "Shipping"],
    expectedPattern: /tests\/example\.test\.ts|benchmark fixture/i,
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
    qualityEvaluator: createSetupQualityEvaluator({
      minimumScore: 0.8,
      criteria: [
        requiredFactCoverageCriterion({
          id: "evidence-linked",
          description: "Names concrete task files and fixture facts used as evidence",
          weight: 3,
          critical: true,
          facts: ["Step 1.1"],
        }),
        concreteFileReferenceCriterion({
          id: "file-reference",
          description: "Names the concrete fixture file from the planned work",
          weight: 1,
          critical: true,
          files: ["tests/example.test.ts"],
        }),
        specificityCriterion({
          id: "scope-control",
          description: "Keeps the plan focused on the selected run step",
          weight: 2,
          requiredAny: ["Step 1.1", "benchmark fixture", "tests/example.test.ts"],
          forbiddenPhrases: ["full phase", "all remaining steps", "production"],
        }),
        requiredPatternCriterion({
          id: "validation-specificity",
          description: "Names concrete validation rather than generic checking",
          weight: 2,
          patterns: [/validation/i, /test|git diff --check|verify/i],
        }),
        nextRouteCriterion({
          id: "actionable-next-route",
          description: "Includes an explicit next command handoff",
          weight: 1,
        }),
        forbiddenFabricationCriterion({
          id: "no-fabricated-facts",
          description: "Avoids fabricated files, deploys, services, and GitHub Actions",
          weight: 3,
          critical: true,
          forbidden: [
            ".github/workflows",
            "GitHub Actions",
            "Postgres",
            "OpenAI Evals API",
          ],
        }),
      ],
    }),
    recommendedRoutes: {
      claude: "/ship",
      codex: "$run",
    },
  },
  {
    skill: "ship",
    outputPath: "ship-manifest.md",
    prompt: "You have the ship skill installed. Read the fixture task and diff summary, then write ship-manifest.md with User goal, Changed files, Tests run, Deploy status, Rollback note, and Next command. Use your runner's command convention for Next command: Claude uses `/run`; Codex uses `$run`. Do not run git.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n## Review\n\nValidation passed for the completed fixture step.\n",
      "diff-summary.txt": "M tests/example.test.ts\nM tasks/todo.md\n",
    },
    expectedIncludes: ["User goal", "Changed files", "Tests run", "Rollback note"],
    expectedPattern: /Deploy status|Deploy skipped/i,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["Validation passed", "M tests/example.test.ts", "M tasks/todo.md"],
      specificMarkers: ["User goal", "Changed files", "Rollback note"],
      nextRoutes: ["/run", "$run"],
      coreTraitId: "shipping-manifest-completeness",
      coreTraitDescription: "Includes the required shipping manifest fields",
      coreTraits: ["User goal", "Changed files", "Tests run", "Deploy status", "Rollback note"],
      validationPatterns: [/Validation passed|Tests run/i],
      concreteFiles: ["tests/example.test.ts", "tasks/todo.md"],
    }),
    recommendedRoutes: {
      claude: "/run",
      codex: "$run",
    },
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["Step 1.1", "Step 1.2", "Completed Step 1.1 with tests"],
      specificMarkers: ["completed work", "remaining risks", "Step 1.2"],
      nextRoute: "$run",
      coreTraitId: "handoff-continuity",
      coreTraitDescription: "Connects completed work to the next project task",
      coreTraits: ["completed work", "validation", "remaining risks", "next work"],
      validationPatterns: [/validation|tests/i],
      concreteFiles: ["tasks/todo.md", "tasks/history.md"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark coverage reporting", "CLI status output"],
      specificMarkers: ["Phase", "Acceptance Criteria", "verification"],
      nextRoute: "$run",
      coreTraitId: "roadmap-phase-structure",
      coreTraitDescription: "Turns the fixture idea into phased, verifiable project work",
      coreTraits: ["Phase", "Acceptance Criteria", "verification", "Next command"],
      validationPatterns: [/verification|test|validate/i],
      concreteFiles: ["specs/feature.md", "tasks/roadmap.md"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["Phase 2: Coverage Reporting", "CLI lists custom/generic/blocked", "Tests cover blocked rows"],
      specificMarkers: ["Tests First", "Implementation", "file-level", "CLI lists custom/generic/blocked"],
      nextRoute: "$run",
      coreTraitId: "phase-plan-specificity",
      coreTraitDescription: "Creates a tests-first phase plan with implementation detail",
      coreTraits: ["Tests First", "Implementation", "file-level", "validation"],
      validationPatterns: [/test|validation|blocked rows/i],
      concreteFiles: ["tasks/roadmap.md", "tasks/todo.md"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["custom", "generic", "blocked", "Benchmark reports"],
      specificMarkers: ["Assumptions", "evidence", "decision", "risks"],
      nextRoute: "$spec-interview",
      coreTraitId: "interview-decision-quality",
      coreTraitDescription: "Frames the product idea with evidence, decision, and risk",
      coreTraits: ["Assumptions", "evidence", "decision", "risks"],
      validationPatterns: [/custom|generic|blocked/i],
      concreteFiles: ["feature-idea.md", "specs/benchmark-reporting-feature-interview.md"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark coverage status", "reports", "list output"],
      specificMarkers: ["Overview", "Detailed Design", "Test Plan", "Acceptance Criteria"],
      nextRoute: "$roadmap",
      coreTraitId: "spec-completeness",
      coreTraitDescription: "Produces a complete implementation-ready spec from the draft",
      coreTraits: ["Overview", "Goals", "Non-Goals", "Detailed Design", "Edge Cases", "Test Plan", "Acceptance Criteria", "Assumptions & Risks"],
      validationPatterns: [/Test Plan|Acceptance Criteria/i],
    }),
    recommendedRoute: "$roadmap",
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["custom benchmark coverage row", "setup_path", "run.setup.ts"],
      specificMarkers: ["Root Cause", "Prevention", "missing setup_path"],
      coreTraitId: "root-cause-specificity",
      coreTraitDescription: "Identifies the concrete failure cause and prevention path",
      coreTraits: ["Strategy Used", "Root Cause", "Fix Applied", "Prevention"],
      validationPatterns: [/missing setup_path|run\.setup\.ts/i],
      concreteFiles: ["tests/harness/bench-coverage.ts"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["coverage matrix validation", "shipped anyway", "Run required validation before shipping"],
      specificMarkers: ["Verification verdict", "Timeline", "Root cause", "Validation plan"],
      nextRoute: "$targeted-skill-builder",
      coreTraitId: "incident-triage-specificity",
      coreTraitDescription: "Connects the session failure to a concrete validation gap",
      coreTraits: ["Verification verdict", "Timeline", "Root cause", "Recommended fix", "Validation plan"],
      validationPatterns: [/coverage matrix validation|validation plan/i],
      concreteFiles: ["session-log.md", "tasks/lessons.md"],
    }),
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
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark coverage handling", "blocked status", "durable validation"],
      specificMarkers: ["workflow gap", "existing-skill overlap", "contract change", "validation"],
      nextRoute: "$run",
      coreTraitId: "correction-to-contract-mapping",
      coreTraitDescription: "Maps the correction to a durable skill contract and validation check",
      coreTraits: ["workflow gap", "existing-skill overlap", "contract change", "validation checks"],
      validationPatterns: [/benchmark coverage|blocked status|validation/i],
      concreteFiles: ["correction.md", "tasks/lessons.md"],
    }),
    recommendedRoute: "$run",
  },
  {
    skill: "benchmark-test-skill",
    outputPath: "benchmark/test-run-2026-05-11.md",
    prompt: "You have the benchmark-test-skill skill installed. Use only bench-output.txt and verify-output.txt; do not search the repository, read extra skill files, or run pnpm. Write benchmark/test-run-2026-05-11.md as a structured benchmark report with `## Verify`, `## Benchmark Metrics`, `## Raw Evidence`, and `## Next Route` sections. Use Markdown tables for the verify and benchmark metrics sections. Include exact evidence from the fixture: `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0` or `100%`, `p50=1200`, `totalCost=0.42`, raw session path `run-agent-abc`, source file names, literal report path `benchmark/test-run-2026-05-11.md`, and a literal `Recommended next command:` line. Use your runner's command convention for the route, regardless of fixture file names or raw session path text: Claude `/ship`, Codex `$ship`.",
    fixtureFiles: {
      "verify-output.txt": "layer1 PASS in 7.1s\nlayer2 SKIPPED no tests matched run\n",
      "bench-output.txt": "Benchmark coverage for run: custom\npassRate=1.0 p50=1200 totalCost=0.42 raw=tests/benchmarks/runs/run-agent-abc/report.json\n",
    },
    expectedIncludes: [
      "layer1 PASS",
      "layer2 SKIPPED",
      "## Verify",
      "## Benchmark Metrics",
      "## Raw Evidence",
      "## Next Route",
      "|",
      "p50=1200",
      "totalCost=0.42",
      "raw session path",
      "run-agent-abc",
      "bench-output.txt",
      "verify-output.txt",
      "benchmark/test-run-2026-05-11.md",
    ],
    expectedPattern: /## Verify[\s\S]*\|[\s\S]*(?:layer1 PASS)[\s\S]*## Benchmark Metrics[\s\S]*\|[\s\S]*(?:passRate=1\.0|100%)[\s\S]*## Raw Evidence[\s\S]*run-agent-abc[\s\S]*## Next Route/i,
    timeoutMs: BENCH_TIMEOUTS_MS.standard,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["layer1 PASS", "p50", "1200", "0.42", "run-agent-abc"],
      specificMarkers: ["verify", "pass rate", "latency", "cost", "raw session path"],
      nextRoutes: ["/ship", "$ship"],
      coreTraitId: "benchmark-evidence-reporting",
      coreTraitDescription: "Reports benchmark evidence in a structured operator-readable format without overstating the result",
      coreTraits: ["layer1 PASS", "passRate", "p50", "totalCost", "raw session path", "## Verify", "## Benchmark Metrics"],
      validationPatterns: [/passRate=1\.0|1\.0|100/i, /run-agent-abc/i, /## Verify[\s\S]*\|[\s\S]*## Benchmark Metrics[\s\S]*\|/i],
      concreteFiles: ["bench-output.txt", "verify-output.txt", "benchmark/test-run-2026-05-11.md"],
    }),
    recommendedRoutes: {
      claude: "/ship",
      codex: "$ship",
    },
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
