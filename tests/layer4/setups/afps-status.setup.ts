import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../harness/types.js";
import {
  assertContentIncludes,
  assertFileCreated,
  readGeneratedFile,
} from "../setup-helpers/artifacts.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";
import { assertNextCommand, assertRecommendedRoute } from "../setup-helpers/routing.js";
import {
  createSetupQualityEvaluator,
  forbiddenFabricationCriterion,
  nextRouteCriterion,
  requiredFactCoverageCriterion,
  specificityCriterion,
} from "../setup-helpers/quality.js";

const OUTPUT_PATH = "afps-status-report.md";

// The fixture is seeded to an unambiguous "execution-ready" AFPS stage: concept,
// discovery, spec, and roadmap all exist, and a single clear unchecked
// implementation task remains with no blocking manual task and a clean tree.
// The agent must DERIVE that stage and the `$exec` route — neither is named in
// the prompt — so it cannot pass by transcription.
const FIXTURE_FILES: Record<string, string> = {
  ".agents/project.json": JSON.stringify({ name: "coverage-badge", product_path: "coverage-badge" }, null, 2),
  "research/idea-brief.md": [
    "# Coverage Badge — Idea Brief",
    "",
    "A small badge component that renders per-skill benchmark coverage status.",
  ].join("\n"),
  "research/icp.md": [
    "# Ideal Customer Profile",
    "",
    "Maintainers of agent-skill monorepos who need at-a-glance coverage.",
  ].join("\n"),
  "specs/feature.md": [
    "# Coverage Badge Spec",
    "",
    "## Acceptance Criteria",
    "- Badge shows custom / generic / blocked counts.",
    "- Renders from a static coverage snapshot.",
  ].join("\n"),
  "tasks/roadmap.md": [
    "# Roadmap",
    "",
    "## Phase 1: Coverage Badge",
    "- Acceptance criteria captured in specs/feature.md.",
  ].join("\n"),
  "tasks/todo.md": [
    "# Active Phase",
    "",
    "## Implementation",
    "",
    "- [ ] Step 1.1: Add the CoverageBadge component that reads the snapshot.",
    "  - Files: create `src/CoverageBadge.tsx`",
  ].join("\n"),
};

export const afpsStatusSetup: SkillBenchSetup = {
  skill: "afps-status",
  prompt: [
    "You have the afps-status skill installed.",
    `Assess where this project sits in the AFPS product workflow using only the existing local artifacts, then write ${OUTPUT_PATH} with:`,
    "- the AFPS stage classification you conclude",
    "- the concrete artifacts you used as evidence (name the files)",
    "- what is missing or what should happen next",
    "- a final `Recommended next command:` line for the single most appropriate route.",
    "Do not mutate any files, run installs, or call external services. Do not ask follow-up questions.",
  ].join(" "),
  perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  timeoutMs: BENCH_TIMEOUTS_MS.standard,
  qualityOutputPath: OUTPUT_PATH,
  qualityEvaluator: createSetupQualityEvaluator({
    minimumScore: 0.78,
    criteria: [
      requiredFactCoverageCriterion({
        id: "afps-stage-and-evidence",
        description: "Derives the execution-ready stage and cites the concrete pending task.",
        weight: 3,
        critical: true,
        facts: [
          { anyOf: ["execution-ready", "execution ready", "ready to execute", "clear executable task", "clear unchecked implementation task"] },
          "Step 1.1",
        ],
      }),
      specificityCriterion({
        id: "afps-scope-control",
        description: "Stays scoped to the reconciled fixture artifacts.",
        weight: 2,
        requiredAny: ["roadmap", "spec", "todo", "implementation"],
        forbiddenPhrases: ["deployed to production", "GitHub Actions", "database migration"],
      }),
      nextRouteCriterion({
        id: "afps-next-route",
        description: "Recommends the execution route the evidence implies.",
        weight: 2,
        critical: true,
        route: ["/exec", "$exec"],
      }),
      forbiddenFabricationCriterion({
        id: "afps-no-fabrication",
        description: "Avoids fabricated external systems and installs.",
        weight: 2,
        critical: true,
        forbidden: ["GitHub Actions", "Postgres", "deployed to production", "Vercel project configured"],
      }),
    ],
  }),

  setupProject(workDir: string): void {
    for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
      const fullPath = join(workDir, relativePath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }
  },

  assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[] {
    const assertions: Assertion[] = [
      { description: "Agent command exited successfully", pass: result.exitCode === 0 },
      assertFileCreated(result, OUTPUT_PATH),
    ];

    const content = readGeneratedFile(result, OUTPUT_PATH);
    if (!content) return assertions;

    // Fixture-derived: the report must cite the one concrete pending task.
    assertions.push(assertContentIncludes(content, "Step 1.1", "Report cites the concrete pending task"));
    assertions.push(assertNextCommand(content));

    const route = context?.agent === "claude" ? "/exec" : "$exec";
    assertions.push(assertRecommendedRoute(content, route));

    return assertions;
  },
};

export default afpsStatusSetup;
