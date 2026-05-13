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
import {
  concreteFileReferenceCriterion,
  createSetupQualityEvaluator,
  forbiddenFabricationCriterion,
  nextRouteCriterion,
  referenceTraitCriterion,
  requiredFactCoverageCriterion,
  requiredPatternCriterion,
} from "../setup-helpers/quality.js";
import { assertNextCommand, assertRecommendedRoute } from "../setup-helpers/routing.js";

interface GlobalWorkflowDefinition {
  skill: string;
  outputPath: string;
  prompt: string;
  fixtureFiles: Record<string, string>;
  expectedIncludes: string[];
  expectedPattern?: RegExp;
  recommendedRoute?: string;
  recommendedRoutes?: Partial<Record<BenchAgent, string>>;
}

function expectedRoute(definition: GlobalWorkflowDefinition, agent?: BenchAgent): string | undefined {
  if (agent && definition.recommendedRoutes?.[agent]) {
    return definition.recommendedRoutes[agent];
  }
  return definition.recommendedRoute;
}

function qualityRoutes(definition: GlobalWorkflowDefinition): string | string[] | undefined {
  const routes = Object.values(definition.recommendedRoutes ?? {});
  if (routes.length > 0) {
    return routes;
  }
  return definition.recommendedRoute;
}

function createGlobalWorkflowSetup(definition: GlobalWorkflowDefinition): SkillBenchSetup {
  return {
    skill: definition.skill,
    prompt: definition.prompt,
    perRunBudgetUsd: BENCH_BUDGETS_USD.smoke,
    timeoutMs: BENCH_TIMEOUTS_MS.smoke,
    qualityOutputPath: definition.outputPath,
    qualityEvaluator: createGlobalWorkflowQualityEvaluator(definition),

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

function createGlobalWorkflowQualityEvaluator(definition: GlobalWorkflowDefinition) {
  return createSetupQualityEvaluator({
    minimumScore: 0.8,
    criteria: [
      requiredFactCoverageCriterion({
        id: "workflow-fixture-facts",
        description: "Output preserves the setup's required fixture terms.",
        weight: 3,
        critical: true,
        facts: definition.expectedIncludes,
      }),
      concreteFileReferenceCriterion({
        id: "workflow-artifact-reference",
        description: "Output names the generated workflow artifact.",
        weight: 1,
        files: [definition.outputPath],
      }),
      nextRouteCriterion({
        id: "workflow-next-route",
        description: "Output includes the expected next command route.",
        weight: 2,
        critical: true,
        route: qualityRoutes(definition),
      }),
      ...(definition.expectedPattern
        ? [
          requiredPatternCriterion({
            id: "workflow-domain-specificity",
            description: "Output includes the setup-specific domain evidence pattern.",
            weight: 2,
            critical: true,
            patterns: [definition.expectedPattern],
          }),
        ]
        : []),
      referenceTraitCriterion({
        id: "workflow-actionability",
        description: "Output has practical workflow evidence, validation, risk, or action language.",
        weight: 1,
        traits: ["validation", "risk", "evidence", "Next command"],
      }),
      forbiddenFabricationCriterion({
        id: "no-generic-or-external-overreach",
        description: "Output avoids generic filler and external actions not present in fixtures.",
        weight: 2,
        critical: true,
        forbidden: [
          "Lorem ipsum",
          "production deployment completed",
          "package-lock.json",
          "AWS account",
          "Vercel project configured",
        ],
      }),
    ],
  });
}

const globalWorkflowDefinitions: GlobalWorkflowDefinition[] = [
  {
    skill: "affected",
    outputPath: "affected-report.md",
    prompt: "You have the affected skill installed. Read the fixture git diff and package map, then write affected-report.md with changed files, affected packages/apps, validation commands, and Next command. Do not run package managers.",
    fixtureFiles: {
      "diff.txt": "M packages/web/src/button.ts\nM packages/shared/src/tokens.ts\n",
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      "packages/web/package.json": "{\"name\":\"web\",\"dependencies\":{\"shared\":\"workspace:*\"}}\n",
      "packages/shared/package.json": "{\"name\":\"shared\"}\n",
    },
    expectedIncludes: ["changed files", "affected packages", "validation commands"],
    expectedPattern: /web|shared/i,
    recommendedRoute: "$run",
  },
  {
    skill: "analyze-sessions",
    outputPath: "session-analysis.md",
    prompt: "You have the analyze-sessions skill installed. Analyze sessions/log-1.md and write session-analysis.md with recurring patterns, automation opportunities, risks, and Next command.",
    fixtureFiles: {
      "sessions/log-1.md": "Skipped validation twice after task-doc edits. User corrected missing lessons update.",
    },
    expectedIncludes: ["recurring patterns", "automation opportunities", "risks"],
    expectedPattern: /validation|lessons/i,
    recommendedRoute: "$targeted-skill-builder",
  },
  {
    skill: "bootstrap-repo",
    outputPath: "README.md",
    prompt: "You have the bootstrap-repo skill installed. Convert brief.md into README.md and AGENTS.md with project purpose, workflows, verification, and Next command. Keep files concise.",
    fixtureFiles: {
      "brief.md": "# Brief\n\nA local benchmark harness for agent skills with layer validation.\n",
    },
    expectedIncludes: ["project purpose", "verification", "Next command"],
    expectedPattern: /benchmark harness|agent skills/i,
    recommendedRoute: "$run",
  },
  {
    skill: "brainstorm",
    outputPath: "tasks/ideas.md",
    prompt: "You have the brainstorm skill installed. Read project-state.md and write tasks/ideas.md with evidence, three candidate next phases, tradeoffs, and Next command.",
    fixtureFiles: {
      "project-state.md": "Benchmark coverage is working for Tier 1 but lacks pack coverage and future creation enforcement.",
    },
    expectedIncludes: ["candidate next phases", "evidence", "tradeoffs"],
    expectedPattern: /pack coverage|creation enforcement/i,
    recommendedRoute: "$feature-interview",
  },
  {
    skill: "branch-lifecycle",
    outputPath: "branch-lifecycle-report.md",
    prompt: "You have the branch-lifecycle skill installed. Read branches.tsv and write branch-lifecycle-report.md with merge, salvage, keep, delete decisions and Next command.",
    fixtureFiles: {
      "branches.tsv": "branch\tage_days\tpr\tstatus\nfeature/old\t45\tclosed\tstale\nfeature/coverage\t3\topen\tgreen\n",
    },
    expectedIncludes: ["merge", "salvage", "delete"],
    expectedPattern: /feature\/old|feature\/coverage/i,
    recommendedRoute: "$ship",
  },
  {
    skill: "codebase-status",
    outputPath: "codebase-status.md",
    prompt: "You have the codebase-status skill installed. Read repo-summary.md and tasks/todo.md, then write codebase-status.md with what this repo is, current status, outstanding work, and Next command.",
    fixtureFiles: {
      "repo-summary.md": "agentic-skills stores global and pack skills with validation tests.",
      "tasks/todo.md": "# Active Phase\n\n- [ ] Step 2: Add pack coverage.\n",
    },
    expectedIncludes: ["what this repo is", "current status", "outstanding work"],
    expectedPattern: /pack coverage|skills/i,
    recommendedRoute: "$run",
  },
  {
    skill: "concept-exploration",
    outputPath: "specs/concept-brief.md",
    prompt: "You have the concept-exploration skill installed. Turn idea.md into specs/concept-brief.md with problem, audience, value, constraints, open questions, and Next command.",
    fixtureFiles: {
      "idea.md": "A benchmark dashboard that shows custom, generic, and blocked skill coverage.",
    },
    expectedIncludes: ["problem", "audience", "value", "open questions"],
    expectedPattern: /benchmark dashboard|coverage/i,
    recommendedRoute: "$spec-interview",
  },
  {
    skill: "create-agentic-skill",
    outputPath: "skills/coverage-auditor/SKILL.md",
    prompt: "You have the create-agentic-skill skill installed. Create skills/coverage-auditor/SKILL.md from request.md with frontmatter, workflow, validation notes, benchmark coverage note, and Next command.",
    fixtureFiles: {
      "request.md": "Create a repo-managed skill that audits benchmark coverage rows.",
    },
    expectedIncludes: ["name:", "workflow", "benchmark coverage"],
    expectedPattern: /coverage-auditor|validation/i,
    recommendedRoute: "$run",
  },
  {
    skill: "create-local-skill",
    outputPath: "local-skill-plan.md",
    prompt: "You have the create-local-skill skill installed. Write local-skill-plan.md for request.md with local skill path, scaffold contents, validation, promotion option, and Next command. Do not write outside the project.",
    fixtureFiles: {
      "request.md": "Create a personal helper skill for reading benchmark reports.",
    },
    expectedIncludes: ["local skill path", "validation", "promotion option"],
    expectedPattern: /benchmark reports|personal helper/i,
    recommendedRoute: "$ship",
  },
  {
    skill: "dead-code",
    outputPath: "dead-code-report.md",
    prompt: "You have the dead-code skill installed. Analyze exports.txt and imports.txt, then write dead-code-report.md with unused exports, orphaned files, stale dependencies, validation, and Next command.",
    fixtureFiles: {
      "exports.txt": "src/unused.ts: unusedHelper\nsrc/live.ts: liveHelper\n",
      "imports.txt": "src/index.ts imports liveHelper\n",
    },
    expectedIncludes: ["unused exports", "orphaned files", "stale dependencies"],
    expectedPattern: /unusedHelper|unused\.ts/i,
    recommendedRoute: "$run",
  },
  {
    skill: "debug",
    outputPath: "debug-report.md",
    prompt: "You have the debug skill installed. Read logs/error.txt and write debug-report.md with symptoms, root cause, fix, verification, and Next command.",
    fixtureFiles: {
      "logs/error.txt": "TypeError: Cannot read properties of undefined (reading 'coverage_status') in bench-setups.ts",
    },
    expectedIncludes: ["symptoms", "root cause", "verification"],
    expectedPattern: /coverage_status|bench-setups/i,
    recommendedRoute: "$run",
  },
  {
    skill: "decommission",
    outputPath: "decommission-plan.md",
    prompt: "You have the decommission skill installed. Read service-inventory.md and write decommission-plan.md with owners, removal order, validation, rollback, and Next command.",
    fixtureFiles: {
      "service-inventory.md": "legacy-benchmark-reporter writes obsolete JSON files consumed by no packages.",
    },
    expectedIncludes: ["owners", "removal order", "validation", "rollback"],
    expectedPattern: /legacy-benchmark-reporter|obsolete/i,
    recommendedRoute: "$run",
  },
  {
    skill: "dogfood",
    outputPath: "dogfood-scenarios.md",
    prompt: "You have the dogfood skill installed. Write dogfood-scenarios.md from product-evidence.md with owner scenarios, cadence, adoption instructions, manual checks, and Next command.",
    fixtureFiles: {
      "product-evidence.md": "Maintainers run benchmark coverage before shipping new skills.",
    },
    expectedIncludes: ["owner scenarios", "cadence", "manual checks"],
    expectedPattern: /benchmark coverage|maintainers/i,
    recommendedRoute: "$uat",
  },
  {
    skill: "expert-review",
    outputPath: "expert-review.md",
    prompt: "You have the expert-review skill installed. Review change-summary.md and write expert-review.md with findings by severity, open questions, test gaps, and Next command.",
    fixtureFiles: {
      "change-summary.md": "Added coverage status CLI output but did not test blocked rows.",
    },
    expectedIncludes: ["findings", "open questions", "test gaps"],
    expectedPattern: /blocked rows|coverage status/i,
    recommendedRoute: "$run",
  },
  {
    skill: "guide",
    outputPath: "manual-guide.md",
    prompt: "You have the guide skill installed. Turn blocker.md into manual-guide.md with click-by-click steps, prerequisites, verification evidence, and Next command.",
    fixtureFiles: {
      "blocker.md": "Configure a provider endpoint for the static newsletter form.",
    },
    expectedIncludes: ["prerequisites", "verification evidence", "Next command"],
    expectedPattern: /provider endpoint|newsletter/i,
    recommendedRoute: "$run",
  },
  {
    skill: "handoff",
    outputPath: "HANDOFF.md",
    prompt: "You have the handoff skill installed. Read tasks/todo.md and tasks/history.md, then write HANDOFF.md with current goal, completed work, validation, risks, next work, and Next command.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n- [x] Step 1\n- [ ] Step 2\n",
      "tasks/history.md": "# History\n\n- Step 1 completed with tests.\n",
    },
    expectedIncludes: ["current goal", "completed work", "validation", "next work"],
    expectedPattern: /Step 2|risks/i,
    recommendedRoute: "$run",
  },
  {
    skill: "hygiene",
    outputPath: "hygiene-report.md",
    prompt: "You have the hygiene skill installed. Inspect tree.txt and write hygiene-report.md with convention violations, missing files, template drift, fixes, and Next command.",
    fixtureFiles: {
      "tree.txt": "global/codex/foo/SKILL.md\npacks/example/PACK.md\npacks/example/codex/bar/SKILL.md\n",
    },
    expectedIncludes: ["convention violations", "missing files", "template drift"],
    expectedPattern: /SKILL\.md|PACK\.md/i,
    recommendedRoute: "$run",
  },
  {
    skill: "icon-handler",
    outputPath: "icon-audit.md",
    prompt: "You have the icon-handler skill installed. Audit the Next App Router fixture and write icon-audit.md with framework, source asset, missing/stale icon surfaces, proposed fix, approval requirement, verification commands, and Next command. Do not modify files.",
    fixtureFiles: {
      "package.json": "{\"dependencies\":{\"next\":\"15.5.15\"},\"scripts\":{\"build\":\"next build\"}}\n",
      "calc-mascot-icon.png": "fixture-png-placeholder\n",
      "src/app/layout.tsx": "export const metadata = { title: 'Fixture' }\n",
      "src/app/favicon.ico": "stale-ico-placeholder\n",
      "src/app/icon.png": "old-icon-placeholder\n",
    },
    expectedIncludes: ["framework", "source asset", "missing", "approval"],
    expectedPattern: /favicon\.ico|apple-touch-icon|Next App Router/i,
    recommendedRoutes: {
      claude: "/icon-handler",
      codex: "$icon-handler",
    },
  },
  {
    skill: "migrate",
    outputPath: "migration-plan.md",
    prompt: "You have the migrate skill installed. Read migration-request.md and write migration-plan.md with phases, file changes, compatibility risks, validation, rollback, and Next command.",
    fixtureFiles: {
      "migration-request.md": "Move benchmark coverage helpers into grouped setup modules without changing CLI behavior.",
    },
    expectedIncludes: ["phases", "compatibility risks", "validation", "rollback"],
    expectedPattern: /coverage helpers|CLI behavior/i,
    recommendedRoute: "$run",
  },
  {
    skill: "mono-plan",
    outputPath: "mono-plan.md",
    prompt: "You have the mono-plan skill installed. Read workspace.txt and write mono-plan.md with package boundaries, shared chokepoints, safe lanes, verification, and Next command.",
    fixtureFiles: {
      "workspace.txt": "packages/web depends on packages/shared; packages/api also depends on packages/shared.",
    },
    expectedIncludes: ["package boundaries", "shared chokepoints", "safe lanes"],
    expectedPattern: /packages\/shared|web|api/i,
    recommendedRoute: "$run",
  },
  {
    skill: "pack",
    outputPath: "pack-plan.md",
    prompt: "You have the pack skill installed. Read pack-request.md and write pack-plan.md with project designation, enabled packs, install checks, validation, and Next command.",
    fixtureFiles: {
      "pack-request.md": "Enable the benchmark pack for this project without installing domain skills globally.",
    },
    expectedIncludes: ["project designation", "enabled packs", "validation"],
    expectedPattern: /benchmark pack|domain skills/i,
    recommendedRoute: "$run",
  },
  {
    skill: "provision-agentic-config",
    outputPath: "AGENTS.md",
    prompt: "You have the provision-agentic-config skill installed. Read workflow.md and write AGENTS.md with orchestration rules, verification, shipping, monorepo safety, and Next command.",
    fixtureFiles: {
      "workflow.md": "Use plan-first execution, no GitHub Actions, and benchmark coverage validation before shipping.",
    },
    expectedIncludes: ["orchestration rules", "verification", "shipping", "monorepo safety"],
    expectedPattern: /GitHub Actions|benchmark coverage/i,
    recommendedRoute: "$run",
  },
  {
    skill: "reconcile-dev-docs",
    outputPath: "tasks/reconciliation-report.md",
    prompt: "You have the reconcile-dev-docs skill installed. Compare docs-state.md with code-state.md and write tasks/reconciliation-report.md with stale docs, missing tasks, fixes, validation, and Next command.",
    fixtureFiles: {
      "docs-state.md": "tasks/todo says Step 2 is pending.",
      "code-state.md": "Step 2 files and tests are already implemented.",
    },
    expectedIncludes: ["stale docs", "missing tasks", "validation"],
    expectedPattern: /Step 2|already implemented/i,
    recommendedRoute: "$ship",
  },
  {
    skill: "regression-check",
    outputPath: "regression-check.md",
    prompt: "You have the regression-check skill installed. Read validation-plan.md and write regression-check.md with health checks, command results, failures, accepted risks, and Next command.",
    fixtureFiles: {
      "validation-plan.md": "Run layer1 tests, coverage validation, list-skills smoke, and git diff --check.",
    },
    expectedIncludes: ["health checks", "command results", "accepted risks"],
    expectedPattern: /layer1|coverage validation/i,
    recommendedRoute: "$ship",
  },
  {
    skill: "research-roadmap",
    outputPath: "tasks/research-roadmap.md",
    prompt: "You have the research-roadmap skill installed. Read research-index.md and write tasks/research-roadmap.md with documentation health, priority queue, stale areas, and Next command.",
    fixtureFiles: {
      "research-index.md": "Specs exist for benchmark coverage, but pack coverage notes are missing.",
    },
    expectedIncludes: ["documentation health", "priority queue", "stale areas"],
    expectedPattern: /pack coverage|benchmark/i,
    recommendedRoute: "$run",
  },
  {
    skill: "scaffold",
    outputPath: "scaffold-plan.md",
    prompt: "You have the scaffold skill installed. Read scaffold-request.md and write scaffold-plan.md with package path, files, conventions, validation, and Next command. Do not install dependencies.",
    fixtureFiles: {
      "scaffold-request.md": "Add a tests fixture package for benchmark report parsing.",
    },
    expectedIncludes: ["package path", "files", "conventions", "validation"],
    expectedPattern: /benchmark report parsing|fixture package/i,
    recommendedRoute: "$run",
  },
  {
    skill: "skills",
    outputPath: "skills-index.md",
    prompt: "You have the skills skill installed. Read skill-list.txt and write skills-index.md grouping skills by workflow stage, activity type, and Next command.",
    fixtureFiles: {
      "skill-list.txt": "run\nship\nplan-phase\nexpert-review\nbenchmark-test-skill\n",
    },
    expectedIncludes: ["workflow stage", "activity type", "Next command"],
    expectedPattern: /benchmark-test-skill|expert-review/i,
    recommendedRoute: "$run",
  },
  {
    skill: "slim-audit",
    outputPath: "slim-audit.md",
    prompt: "You have the slim-audit skill installed. Read loc-report.txt and write slim-audit.md with simplification opportunities, risk, preserved behavior, validation, and Next command.",
    fixtureFiles: {
      "loc-report.txt": "bench-setups.ts 220 LOC with repeated setup assertion code.",
    },
    expectedIncludes: ["simplification opportunities", "preserved behavior", "validation"],
    expectedPattern: /repeated setup assertion|bench-setups/i,
    recommendedRoute: "$run",
  },
  {
    skill: "spec-drift",
    outputPath: "spec-drift-report.md",
    prompt: "You have the spec-drift skill installed. Compare spec.md and implementation.md, then write spec-drift-report.md with implemented, missing, undocumented, tests, and Next command.",
    fixtureFiles: {
      "spec.md": "CLI must show custom, generic, and blocked coverage.",
      "implementation.md": "CLI shows custom and generic coverage only.",
    },
    expectedIncludes: ["implemented", "missing", "undocumented", "tests"],
    expectedPattern: /blocked coverage|custom|generic/i,
    recommendedRoute: "$run",
  },
  {
    skill: "trace",
    outputPath: "trace-report.md",
    prompt: "You have the trace skill installed. Trace request.md through route.md and storage.md, then write trace-report.md with entrypoint, data flow, side effects, failure modes, and Next command.",
    fixtureFiles: {
      "request.md": "pnpm bench --skill run should print coverage status.",
      "route.md": "bench.ts parses --skill and calls resolveBenchTarget.",
      "storage.md": "bench-coverage.ts stores coverage rows.",
    },
    expectedIncludes: ["entrypoint", "data flow", "side effects", "failure modes"],
    expectedPattern: /resolveBenchTarget|coverage rows/i,
    recommendedRoute: "$run",
  },
  {
    skill: "uat",
    outputPath: "uat-journeys.md",
    prompt: "You have the uat skill installed. Read specs/ui-layout-variations-dashboard.md and write uat-journeys.md with variant evaluation, acceptance criteria, evidence capture, and Next command.",
    fixtureFiles: {
      "specs/ui-layout-variations-dashboard.md": "Variation A uses a dense table. Variation B uses a card grid. Both must help maintainers compare custom, generic, and blocked benchmark coverage.",
    },
    expectedIncludes: ["variant evaluation", "acceptance criteria", "evidence capture"],
    expectedPattern: /dense table|card grid|benchmark coverage/i,
    recommendedRoute: "$ui-consolidate",
  },
  {
    skill: "ui-consolidate",
    outputPath: "specs/ui-final-dashboard.md",
    prompt: "You have the ui-consolidate skill installed. Read specs/ui-layout-variations-dashboard.md and research/uat-variant-evaluation-dashboard.md, then write specs/ui-final-dashboard.md with UAT evidence summary, consolidation matrix, conflict resolutions, implementation plan, and Next command.",
    fixtureFiles: {
      "specs/ui-requirements-dashboard.md": "The dashboard must show custom, generic, and blocked benchmark coverage rows with blocked reasons.",
      "specs/ui-layout-variations-dashboard.md": "Variation A uses a dense table. Variation B uses a card grid. Variation C uses list plus detail.",
      "research/uat-variant-evaluation-dashboard.md": "Dense table worked for scanning blocked reasons. Card grid felt easier to browse but slower for comparing custom and generic status.",
    },
    expectedIncludes: ["UAT evidence summary", "consolidation matrix", "conflict resolutions", "implementation plan"],
    expectedPattern: /dense table|card grid|blocked reasons/i,
    recommendedRoute: "$design-system",
  },
  {
    skill: "ui-interview",
    outputPath: "specs/ui-spec.md",
    prompt: "You have the ui-interview skill installed. Convert product-need.md into specs/ui-spec.md with layout, hierarchy, controls, states, responsive behavior, and Next command.",
    fixtureFiles: {
      "product-need.md": "A dashboard table for benchmark coverage status and blocked reasons.",
    },
    expectedIncludes: ["layout", "hierarchy", "controls", "states", "responsive behavior"],
    expectedPattern: /dashboard table|blocked reasons/i,
    recommendedRoute: "$run",
  },
  {
    skill: "ux-variation",
    outputPath: "ux-variations.md",
    prompt: "You have the ux-variation skill installed. Read specs/ui-requirements-dashboard.md and write ux-variations.md with layout variations, alternatives, variant evaluation handoff, and Next command.",
    fixtureFiles: {
      "specs/ui-requirements-dashboard.md": "Maintainers compare custom, generic, and blocked benchmark coverage before prioritizing setup work.",
    },
    expectedIncludes: ["layout variations", "alternatives", "variant evaluation"],
    expectedPattern: /custom|generic|blocked/i,
    recommendedRoute: "$run",
  },
];

export const GLOBAL_WORKFLOW_SETUPS = Object.fromEntries(
  globalWorkflowDefinitions.map((definition) => [definition.skill, createGlobalWorkflowSetup(definition)]),
) as Record<string, SkillBenchSetup>;
