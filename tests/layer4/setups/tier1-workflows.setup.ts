import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchAgent, QualityCriterion, SkillBenchSetup } from "../../harness/bench-types.js";
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
  evidenceCriterion?: QualityCriterion;
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
  extraCriteria?: QualityCriterion[];
}): SkillBenchSetup["qualityEvaluator"] {
  return createSetupQualityEvaluator({
    minimumScore: options.minimumScore ?? 0.78,
    criteria: [
      options.evidenceCriterion ?? requiredFactCoverageCriterion({
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
        forbiddenPhrases: ["deployed to production", "production deploy completed", "GitHub Actions", "database migration"],
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
          "deployed to production",
          "production deploy completed",
          ...(options.forbidden ?? []),
        ],
      }),
      ...(options.extraCriteria ?? []),
    ],
  });
}

const sessionTriageNoOverRemediationCriterion: QualityCriterion = {
  id: "no-over-remediation-route",
  description: "Does not route one-off noncompliance with an adequate contract to an unconditional skill or contract change",
  weight: 5,
  critical: true,
  evaluate(output: string) {
    const saysContractAdequate = /\b(contract|rule|instruction)s?\b[^.\n]{0,80}\b(already|adequate|clear|explicit|existing)\b/i.test(output)
      || /\b(already|adequate|clear|explicit|existing)\b[^.\n]{0,80}\b(contract|rule|instruction)s?\b/i.test(output);
    const saysOneOffNoncompliance = /one[- ]off|agent noncompliance|noncompliance with an adequate|do not change (a )?skill|no skill change/i.test(output);
    const unconditionalSkillBuilderRoute = /Recommended next (skill|command):\s*[`'"]?\/?\$?targeted-skill-builder\b/im.test(output)
      || /## Next command\s+[`'"]?\/?\$?targeted-skill-builder\b/im.test(output);
    const rebrandsExistingRuleAsContractChange = /\b(add|patch|update|rewrite|harden|upgrade|tighten)\b[^.\n]{0,120}\b(pre-ship validation|validation evidence|evidence gate|validation gate|contract|run skill|\$run|\/run)\b/i.test(output)
      || /\b(pre-ship validation|validation evidence|evidence gate|validation gate)\b[^.\n]{0,120}\b(contract change|skill change|targeted-skill-builder|patch|update|rewrite)\b/i.test(output);
    const explicitlyRejectsSkillChange = /\b(no skill change|do not change (a )?skill|not (the )?skill contract|no .*contract gap|none verified)\b/i.test(output)
      || /\bunless\b[^.\n]{0,100}\b(additional evidence|recurrence|contract gap)\b/i.test(output);

    if ((unconditionalSkillBuilderRoute || (rebrandsExistingRuleAsContractChange && !explicitlyRejectsSkillChange)) && (saysContractAdequate || saysOneOffNoncompliance)) {
      return {
        score: 0,
        notes: [
          "output recommends a skill or contract change even though it frames the incident as one-off noncompliance or an adequate existing contract",
        ],
      };
    }

    if (/Recommended next skill:?\s*(?:\n\s*)?[`'"]?none\b/im.test(output) || /Recommended next command:\s*[`'"]?\$?run\b/im.test(output) || (!unconditionalSkillBuilderRoute && !rebrandsExistingRuleAsContractChange)) {
      return { score: 1 };
    }

    return {
      score: 0.5,
      notes: ["output includes targeted-skill-builder language but does not clearly make it conditional on recurrence or a proven contract gap"],
    };
  },
};

const investigateCleanShippedNoShipEndCriterion: QualityCriterion = {
  id: "clean-shipped-no-ship-end",
  description: "Does not route a clean already-pushed investigation to ship-end",
  weight: 5,
  critical: true,
  evaluate(output: string) {
    const recommendsShipEnd = /Recommended next (?:command|skill):\s*[`'"]?\$ship-end\b/im.test(output)
      || /\bnext (?:command|skill|step)\b[^.\n]{0,80}\$ship-end\b/i.test(output);
    const saysCleanShipped = /\b(?:committed|commit)\b[\s\S]{0,300}\b(?:pushed|push)\b/i.test(output)
      && /\b(?:clean tree|tree is clean|working tree clean|working-tree state:\s*clean|no unpushed commits)\b/i.test(output);
    const noneRoute = /\*\*Next work:\*\*\s*none\b/i.test(output)
      && /\*\*Recommended next command:\*\*\s*none\b/i.test(output);

    if (saysCleanShipped && recommendsShipEnd) {
      return {
        score: 0,
        notes: ["output recommends $ship-end even though it says the investigation was committed, pushed, and clean"],
      };
    }

    if (saysCleanShipped && !noneRoute) {
      return {
        score: 0,
        notes: ["clean already-pushed investigation must end with Next work none and Recommended next command none"],
      };
    }

    return { score: 1 };
  },
};

const singleActiveRunnerFinalRouteCriterion: QualityCriterion = {
  id: "single-active-runner-final-route",
  description: "Final handoff contains one active-runner next command, not both Claude and Codex route spellings",
  weight: 4,
  critical: true,
  evaluate(output: string) {
    const finalHandoff = output.match(
      /(?:^|\n)(?:#{1,6}\s*)?(?:Recommended next command|Next command|Next Command)\s*:?\s*([\s\S]*?)$/i,
    )?.[1] ?? output;
    const hasSlashRun = /(?:^|[\s`'"(:-])\/run(?:[\s`'".,)]|$)/i.test(finalHandoff);
    const hasDollarRun = /(?:^|[\s`'"(:-])\$run(?:[\s`'".,)]|$)/i.test(finalHandoff);

    if (hasSlashRun && hasDollarRun) {
      return {
        score: 0,
        notes: ["final handoff lists both /run and $run instead of one active-runner command"],
      };
    }

    return { score: 1 };
  },
};

const shipGoalSpecificityCriterion: QualityCriterion = {
  id: "ship-goal-specificity",
  description: "Frames the User goal as the completed validated fixture step, not merely writing a manifest",
  weight: 3,
  critical: true,
  evaluate(output: string) {
    const headingUserGoal = output.match(
      /(?:^|\n)(?:##\s*)?User goal[:\s]*([\s\S]*?)(?=\n(?:##\s*)?(?:Changed files|Tests run|Deploy status|Rollback note|Next command)\b|$)/i,
    )?.[1];
    const fieldUserGoal = output.match(
      /(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?User goal(?:\*\*)?\s*:\s*([^\n]+)/i,
    )?.[1];
    const userGoalSection = headingUserGoal ?? fieldUserGoal ?? "";
    const inspectedText = userGoalSection || output;
    const namesCompletedWork = /\b(completed|validated|validation passed|fixture step|shipping handoff|wrap up)\b/i.test(inspectedText);
    const metaManifestGoal = /^\s*(?:write|create|record|produce|prepare)\b[^.\n]{0,80}\b(?:manifest|shipping summary|handoff)\b/i
      .test(inspectedText);

    if (!userGoalSection.trim()) {
      return { score: 0, notes: ["missing User goal section text"] };
    }
    if (metaManifestGoal) {
      return {
        score: 0,
        notes: ["User goal is framed as writing the manifest instead of summarizing the completed fixture work"],
      };
    }
    if (!namesCompletedWork) {
      return {
        score: 0,
        notes: ["User goal does not connect the handoff to the completed validated fixture step"],
      };
    }
    return { score: 1 };
  },
};

const featureInterviewEvidenceCriterion: QualityCriterion = {
  id: "evidence-linked",
  description: "Names concrete fixture facts used as evidence",
  weight: 3,
  critical: true,
  evaluate(output: string) {
    const missing = [
      !/custom/i.test(output) ? "custom" : undefined,
      !/generic/i.test(output) ? "generic" : undefined,
      !/blocked/i.test(output) ? "blocked" : undefined,
      !/(benchmark reporting|benchmark coverage|skill coverage|coverage dashboard|coverage quality)/i.test(output) ? "benchmark/coverage dashboard concept" : undefined,
      !/(fake rows|fake data|fixture|fixture-backed|in-memory|static data)/i.test(output) ? "fake or fixture rows" : undefined,
    ].filter(Boolean);

    if (missing.length === 0) {
      return { score: 1 };
    }

    return {
      score: 0,
      notes: [`missing required fact: ${missing.join(", ")}`],
    };
  },
};

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
        if (definition.skill === "ship-end") {
          const alternateRoute = route === "/run" ? "$run" : "/run";
          assertions.push({
            description: "Output uses single active-runner final route",
            pass: !new RegExp(`(?:^|[\\s\`'"(:-])${alternateRoute.replace("$", "\\$")}(?:[\\s\`'".,)]|$)`, "im").test(content),
            message: `Expected final handoff to avoid alternate runner route ${alternateRoute}`,
          });
        }
      }

      return assertions;
    },
  };
}

const workflowDefinitions: Tier1WorkflowDefinition[] = [
  {
    skill: "run",
    outputPath: "run-plan.md",
    prompt: "You have the run skill installed. Using the local task files, write run-plan.md with the selected next step, files you would inspect or modify, validation commands, shipping note, and Next command. This is a new SaaS dashboard prototype; do not modify task docs or run git.",
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
      evidenceFacts: ["tests/example.test.ts", "tasks/todo.md"],
      specificMarkers: ["User goal", "Changed files", "Rollback note"],
      nextRoutes: ["/run", "$run"],
      coreTraitId: "shipping-manifest-completeness",
      coreTraitDescription: "Includes the required shipping manifest fields",
      coreTraits: ["User goal", "Changed files", "Tests run", "Deploy status", "Rollback note"],
      validationPatterns: [/validation\b[\s\S]{0,80}\bpassed/i],
      concreteFiles: ["tests/example.test.ts", "tasks/todo.md"],
      extraCriteria: [
        shipGoalSpecificityCriterion,
        requiredPatternCriterion({
          id: "validation-evidence",
          description: "Names validation evidence without requiring exact fixture wording",
          weight: 2,
          critical: true,
          patterns: [/validation\b[\s\S]{0,80}\bpassed/i],
        }),
      ],
    }),
    recommendedRoutes: {
      claude: "/run",
      codex: "$run",
    },
  },
  {
    skill: "ship-end",
    outputPath: "session-handoff.md",
    prompt: "You have the ship-end skill installed. Write session-handoff.md summarizing completed work, validation evidence, remaining risks, next work, and Next command. Use the fixture task files as the source of truth, not the benchmark session's lack of git activity, and name both `tasks/todo.md` and `tasks/history.md` in the handoff. The final Next command must contain exactly one command for the active runner: `/run` when running as Claude, or `$run` when running as Codex. Do not list alternate runner routes in the final handoff. Do not run git.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n- [x] Step 1.1 complete\n- [ ] Step 1.2 next\n",
      "tasks/history.md": "# History\n\n- Completed Step 1.1 with tests.\n",
    },
    expectedIncludes: ["completed work", "validation", "remaining risks", "Step 1.2"],
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["Step 1.1", "Step 1.2", "Completed Step 1.1 with tests"],
      specificMarkers: ["completed work", "remaining risks", "Step 1.2"],
      nextRoutes: ["/run", "$run"],
      coreTraitId: "handoff-continuity",
      coreTraitDescription: "Connects completed work to the next project task",
      coreTraits: ["completed work", "validation", "remaining risks", "next work"],
      validationPatterns: [/validation|tests/i],
      concreteFiles: ["tasks/todo.md", "tasks/history.md"],
      extraCriteria: [singleActiveRunnerFinalRouteCriterion],
    }),
    recommendedRoutes: {
      claude: "/run",
      codex: "$run",
    },
  },
  {
    skill: "roadmap",
    outputPath: "tasks/roadmap.md",
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
    prompt: "You have the roadmap skill installed. Convert specs/feature.md into tasks/roadmap.md with phases, acceptance criteria, verification, and an exact `## Next Command` section containing `$plan-phase 1`. The consolidated prototype is already complete upstream. Keep it concise.",
    fixtureFiles: {
      "specs/feature.md": "# Feature\n\nBuild a SaaS-style benchmark coverage reporting dashboard with CLI status output and validation. The consolidated prototype at prototypes/dashboard/consolidated/index.html has been accepted. Implement the production version based on the prototype.\n",
      "prototypes/dashboard/consolidated/index.html": "<html><body><h1>Consolidated Dashboard Prototype</h1><table><tr><th>Skill</th><th>Status</th><th>Blocked Reason</th></tr><tr><td>run</td><td>custom</td><td></td></tr></table></body></html>",
    },
    expectedIncludes: ["Phase", "Acceptance Criteria", "verification", "prototype"],
    expectedPattern: /benchmark coverage|CLI status/i,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark coverage", "CLI status output", "fake rows"],
      evidenceCriterion: requiredPatternCriterion({
        id: "evidence-linked",
        description: "Names concrete fixture facts used as evidence",
        weight: 3,
        critical: true,
        patterns: [
          /benchmark coverage/i,
          /(?:CLI[\s\S]{0,120}status output|status output[\s\S]{0,120}CLI)/i,
        ],
      }),
      specificMarkers: ["Phase", "Acceptance Criteria", "verification"],
      nextRoute: "$plan-phase 1",
      coreTraitId: "roadmap-phase-structure",
      coreTraitDescription: "Turns the fixture idea into phased, verifiable project work",
      coreTraits: ["Phase", "Acceptance Criteria", "verification", "Next Command", "prototype"],
      validationPatterns: [/verification|test|validate/i],
      concreteFiles: ["specs/feature.md"],
      extraCriteria: [],
    }),
    recommendedRoute: "$plan-phase 1",
  },
  {
    skill: "plan-phase",
    outputPath: "tasks/todo.md",
    prompt: "You have the plan-phase skill installed. Read tasks/roadmap.md and write tasks/todo.md for the next phase with Tests First, Implementation, file-level details, validation, and Next command. Use the consolidated prototype as the visual spec.",
    fixtureFiles: {
      "tasks/roadmap.md": "# Roadmap\n\n## Phase 2: SaaS Coverage Dashboard Implementation\n\nAcceptance Criteria:\n- Users can view a dashboard showing custom/generic/blocked coverage.\n- Implementation matches the consolidated prototype.\n- Prototype uses fake benchmark rows.\n",
      "prototypes/dashboard/consolidated/index.html": "<html><body><h1>Consolidated Dashboard Prototype</h1><table><tr><th>Skill</th><th>Status</th></tr></table></body></html>",
    },
    expectedIncludes: ["Tests First", "Implementation", "click", "prototype"],
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["Phase 2: SaaS Coverage Dashboard Prototype", "fake benchmark rows", "Production database, auth, analytics, and deployment are not approved"],
      specificMarkers: ["Tests First", "Implementation", "file-level", "prototype"],
      nextRoute: "$run",
      coreTraitId: "phase-plan-specificity",
      coreTraitDescription: "Creates a tests-first phase plan with implementation detail",
      coreTraits: ["Tests First", "Implementation", "file-level", "validation", "prototype"],
      validationPatterns: [/test|validation|click|prototype/i],
      concreteFiles: ["tasks/roadmap.md", "tasks/todo.md"],
      extraCriteria: [],
    }),
    recommendedRoute: "$run",
  },
  {
    skill: "feature-interview",
    outputPath: "specs/benchmark-reporting-feature-interview.md",
    prompt: "You have the feature-interview skill installed. Interview the supplied SaaS dashboard idea without asking follow-up questions by writing specs/benchmark-reporting-feature-interview.md with an explicit Artifact path line, assumptions, evidence, decision, risks, scope triage (small/medium/large re-entry), and Next command. Treat the planning destination as confirmed for roadmap sequencing; do not route directly to spec-interview.",
    fixtureFiles: {
      "feature-idea.md": "# Idea\n\nBuild a SaaS dashboard where maintainers compare whether a skill has custom, generic, or blocked coverage. Use fake rows first. Do not build auth, Stripe, analytics, or a database until the dashboard flow feels right.\n",
    },
    expectedIncludes: ["Assumptions", "evidence", "decision", "risks", "prototype"],
    expectedPattern: /custom|generic|blocked/i,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["custom", "generic", "blocked"],
      evidenceCriterion: featureInterviewEvidenceCriterion,
      specificMarkers: ["Assumptions", "evidence", "decision", "risks"],
      nextRoutes: ["/roadmap", "$roadmap"],
      coreTraitId: "interview-decision-quality",
      coreTraitDescription: "Frames the product idea with evidence, decision, and risk",
      coreTraits: ["Assumptions", "evidence", "decision", "risks"],
      validationPatterns: [/custom|generic|blocked/i],
      concreteFiles: ["feature-idea.md", "specs/benchmark-reporting-feature-interview.md"],
      extraCriteria: [],
    }),
    recommendedRoutes: {
      claude: "/roadmap",
      codex: "$roadmap",
    },
  },
  {
    skill: "skill-interview",
    outputPath: "specs/benchmark-audit-skill-brief.md",
    prompt: "You have the skill-interview skill installed. Interview the supplied skill idea without asking follow-up questions by writing specs/benchmark-audit-skill-brief.md with Overview, Goals, Non-Goals, Skill Contract, Workflow, Inputs and Outputs, Safety and Side Effects, Verification and Benchmark Coverage, Related Skills, Assumptions & Risks, Recommended Creation Route, and Next command. Treat the user's confirmation as already provided for this benchmark fixture.",
    fixtureFiles: {
      "skill-idea.md": "# Skill idea\n\nCreate a repo-managed mirrored skill named benchmark-audit that interviews maintainers before adding benchmark coverage. It should inspect tests/harness/bench-coverage.ts, tests/harness/bench-setups.ts, and tests/layer4/setups before asking questions; avoid GitHub Actions; require a benchmark coverage plan; and route to create-agentic-skill when the brief is complete.\n",
      "tests/harness/bench-coverage.ts": "coverage_status: \"custom\", setup_path: \"tests/layer4/setups/tier1-workflows.setup.ts\"",
    },
    expectedIncludes: ["Skill Contract", "Workflow", "Verification and Benchmark Coverage", "Recommended Creation Route"],
    expectedPattern: /benchmark-audit|bench-coverage|create-agentic-skill/i,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark-audit", "bench-coverage.ts", "create-agentic-skill"],
      specificMarkers: ["Skill Contract", "Workflow", "Verification and Benchmark Coverage", "Recommended Creation Route"],
      nextRoutes: ["/create-agentic-skill", "$create-agentic-skill"],
      coreTraitId: "skill-brief-completeness",
      coreTraitDescription: "Produces an implementation-ready skill brief from the user's skill idea",
      coreTraits: ["Overview", "Goals", "Non-Goals", "Skill Contract", "Workflow", "Verification and Benchmark Coverage"],
      validationPatterns: [/benchmark coverage|bench-coverage\.ts|verify|validation/i],
      concreteFiles: ["skill-idea.md", "tests/harness/bench-coverage.ts", "specs/benchmark-audit-skill-brief.md"],
      forbidden: ["GitHub Actions"],
    }),
    recommendedRoutes: {
      claude: "/create-agentic-skill",
      codex: "$create-agentic-skill",
    },
  },
  {
    skill: "spec-interview",
    outputPath: "specs/benchmark-reporting.md",
    prompt: "You have the spec-interview skill installed. Walk through the consolidated prototype at prototypes/dashboard/consolidated/index.html screen by screen and extract production specifications into specs/benchmark-reporting.md with Overview, Goals, Non-Goals, Detailed Design, Edge Cases, Test Plan, Acceptance Criteria, Open Questions, Assumptions & Risks, and Next command.",
    fixtureFiles: {
      "specs/draft.md": "# Draft\n\nCreate a SaaS-style benchmark coverage dashboard based on the accepted consolidated prototype.\n",
      "prototypes/dashboard/consolidated/index.html": "<html><body><h1>Consolidated Dashboard Prototype</h1><table><tr><th>Skill</th><th>Status</th><th>Blocked Reason</th></tr><tr><td>run</td><td>custom</td><td></td></tr><tr><td>deploy</td><td>blocked</td><td>Requires credentials</td></tr></table></body></html>",
    },
    expectedIncludes: ["Overview", "Detailed Design", "Test Plan", "Acceptance Criteria", "Assumptions & Risks"],
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["benchmark coverage status", "reports", "list output"],
      specificMarkers: ["Overview", "Detailed Design", "Test Plan", "Acceptance Criteria"],
      nextRoute: "$research-roadmap --post-spec",
      coreTraitId: "spec-completeness",
      coreTraitDescription: "Produces a complete implementation-ready spec from the consolidated prototype",
      coreTraits: ["Overview", "Goals", "Non-Goals", "Detailed Design", "Edge Cases", "Test Plan", "Acceptance Criteria", "Assumptions & Risks"],
      validationPatterns: [/Test Plan|Acceptance Criteria/i],
      extraCriteria: [],
    }),
    recommendedRoute: "$research-roadmap --post-spec",
  },
  {
    skill: "investigate",
    outputPath: "investigation-report.md",
    prompt: "You have the investigate skill installed. Investigate the failing log in logs/failure.txt and write investigation-report.md with Strategy Used, Root Cause, Fix Applied, Prevention, and Next command. Do not edit source. Treat the investigation as already fixed, validated, committed, and pushed: commit 50e118c is on origin/master, `git status --short --branch` is clean, and there are no unpushed commits. Because there is nothing left to ship or document, the final handoff must not recommend ship-end.",
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
      extraCriteria: [investigateCleanShippedNoShipEndCriterion],
    }),
  },
  {
    skill: "session-triage",
    outputPath: "session-triage-report.md",
    prompt: [
      "You have the session-triage skill installed.",
      "Read session-log.md and tasks/lessons.md, then write session-triage-report.md in the project root before doing any optional exploration.",
      "Keep the report evidence-bound.",
      "Include Target, User-identified issue, Verification verdict, Timeline, Root cause, Responsible contract gap, Recommended fix, Validation plan, Confidence and evidence gaps, and Recommended next skill.",
      "If the evidence points to one-off agent noncompliance with an adequate existing validation rule, recommend no skill change.",
      "After writing the report, verify that session-triage-report.md exists in the project root. If it is missing, create it before responding.",
    ].join(" "),
    fixtureFiles: {
      "session-log.md": "# Session\n\nUser invoked $run. Agent skipped the planned coverage matrix validation and shipped anyway.\n",
      "tasks/lessons.md": "# Lessons\n\n- Run required validation before shipping.\n",
    },
    expectedIncludes: ["Verification verdict", "Timeline", "Root cause", "Responsible contract gap", "Validation plan"],
    expectedPattern: /coverage matrix validation|shipped anyway/i,
    qualityEvaluator: workflowQualityEvaluator({
      evidenceFacts: ["coverage matrix validation", "shipped anyway", "Run required validation before shipping"],
      specificMarkers: ["Verification verdict", "Timeline", "Root cause", "Validation plan"],
      coreTraitId: "incident-triage-specificity",
      coreTraitDescription: "Connects the session failure to a concrete validation gap",
      coreTraits: ["Verification verdict", "Timeline", "Root cause", "Recommended fix", "Validation plan"],
      validationPatterns: [/coverage matrix validation|validation plan/i],
      concreteFiles: ["session-log.md", "tasks/lessons.md"],
      extraCriteria: [sessionTriageNoOverRemediationCriterion],
    }),
  },
  {
    skill: "targeted-skill-builder",
    outputPath: "skill-update-plan.md",
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
    prompt: "You have the targeted-skill-builder skill installed. Read correction.md and write skill-update-plan.md with workflow gap, existing-skill overlap, proposed contract change, validation checks, and Next command. End with `Recommended next command: $run`. Do not edit SKILL.md files.",
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
    prompt: "You have the benchmark-test-skill skill installed. Use only bench-output.txt and verify-output.txt; do not search the repository, read extra skill files, or run pnpm. Write benchmark/test-run-2026-05-11.md as a structured benchmark report with `## Verify`, `## Benchmark Metrics`, `## Raw Evidence`, and `## Next Route` sections. Use Markdown tables for the verify and benchmark metrics sections. In the `## Benchmark Metrics` section, create one row each for pass rate, p50 latency, total cost, and raw session path. The pass-rate row must contain `passRate=1.0` or `100%`; the p50 row must contain `p50=1200`; the total-cost row must contain `totalCost=0.42`; the raw-session row must contain `run-agent-abc`. Include exact evidence from the fixture: `layer1 PASS`, `layer2 SKIPPED`, `passRate=1.0` or `100%`, `p50=1200`, `totalCost=0.42`, raw session path `run-agent-abc`, source file names, literal report path `benchmark/test-run-2026-05-11.md`, and a literal `Recommended next command:` line. Use your runner's command convention for the route, regardless of fixture file names or raw session path text: Claude `/ship`, Codex `$ship`.",
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
    expectedPattern: /## Verify[\s\S]*^\|[^\n]*layer1 PASS[^\n]*\|[^\n]*$[\s\S]*## Benchmark Metrics(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*(?:pass(?:\s|-)?rate|passRate)[^\n]*\|[^\n]*(?:passRate=1\.0|100%)[^\n]*\|[^\n]*$(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*p50[^\n]*\|[^\n]*p50=1200[^\n]*\|[^\n]*$(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*(?:total(?:\s|-)?cost|totalCost)[^\n]*\|[^\n]*totalCost=0\.42[^\n]*\|[^\n]*$(?:(?!## Raw Evidence)[\s\S])*## Raw Evidence[\s\S]*run-agent-abc[\s\S]*## Next Route/im,
    timeoutMs: BENCH_TIMEOUTS_MS.standard,
    qualityEvaluator: createSetupQualityEvaluator({
      minimumScore: 0.82,
      criteria: [
        requiredFactCoverageCriterion({
          id: "evidence-linked",
          description: "Names exact fixture facts used as evidence",
          weight: 3,
          critical: true,
          facts: ["layer1 PASS", "p50=1200", "totalCost=0.42", "run-agent-abc"],
        }),
        concreteFileReferenceCriterion({
          id: "file-reference",
          description: "Names concrete fixture files and generated report",
          weight: 1,
          critical: true,
          files: ["bench-output.txt", "verify-output.txt", "benchmark/test-run-2026-05-11.md"],
        }),
        requiredPatternCriterion({
          id: "metrics-table-structure",
          description: "Places pass rate, p50 latency, and total cost inside the Benchmark Metrics table",
          weight: 3,
          critical: true,
          patterns: [
            /## Benchmark Metrics(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*(?:pass(?:\s|-)?rate|passRate)[^\n]*\|[^\n]*(?:passRate=1\.0|100%)[^\n]*\|[^\n]*$/im,
            /## Benchmark Metrics(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*p50[^\n]*\|[^\n]*p50=1200[^\n]*\|[^\n]*$/im,
            /## Benchmark Metrics(?:(?!## Raw Evidence)[\s\S])*^\|[^\n]*(?:total(?:\s|-)?cost|totalCost)[^\n]*\|[^\n]*totalCost=0\.42[^\n]*\|[^\n]*$/im,
          ],
        }),
        specificityCriterion({
          id: "scope-control",
          description: "Keeps the answer scoped to the supplied workflow fixture",
          weight: 2,
          requiredAny: ["verify", "pass rate", "latency", "cost", "raw session path"],
          forbiddenPhrases: ["production deploy", "GitHub Actions", "database migration"],
        }),
        referenceTraitCriterion({
          id: "benchmark-evidence-reporting",
          description: "Reports benchmark evidence in a structured operator-readable format without overstating the result",
          weight: 2,
          traits: ["layer1 PASS", "passRate", "p50", "totalCost", "raw session path", "## Verify", "## Benchmark Metrics"],
        }),
        nextRouteCriterion({
          id: "actionable-next-route",
          description: "Includes an explicit next command handoff",
          weight: 1,
          route: ["/ship", "$ship"],
        }),
        forbiddenFabricationCriterion({
          id: "no-fabricated-facts",
          description: "Avoids fabricated files, deploys, services, and GitHub Actions",
          weight: 3,
          critical: true,
          forbidden: ["GitHub Actions", "production deploy", "database migration"],
        }),
      ],
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
export const skillInterviewSetup = tier1Setups["skill-interview"];
export const specInterviewSetup = tier1Setups["spec-interview"];
export const investigateSetup = tier1Setups.investigate;
export const sessionTriageSetup = tier1Setups["session-triage"];
export const targetedSkillBuilderSetup = tier1Setups["targeted-skill-builder"];
export const benchmarkTestSkillSetup = tier1Setups["benchmark-test-skill"];
