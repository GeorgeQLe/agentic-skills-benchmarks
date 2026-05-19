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
import {
  concreteFileReferenceCriterion,
  createSetupQualityEvaluator,
  exactFinalNextRouteCriterion,
  finalNextRouteCriterion,
  forbiddenFabricationCriterion,
  nextRouteCriterion,
  referenceTraitCriterion,
  requiredFactCoverageCriterion,
  requiredPatternCriterion,
} from "../setup-helpers/quality.js";
import { assertNextCommand, assertRecommendedExactNextRoute, assertRecommendedNextRoute, assertRecommendedRoute } from "../setup-helpers/routing.js";

interface GlobalWorkflowDefinition {
  skill: string;
  outputPath: string;
  prompt: string;
  fixtureFiles: Record<string, string | Buffer>;
  expectedIncludes: string[];
  expectedEvidence?: ExpectedEvidence[];
  expectedPattern?: RegExp;
  recommendedRoute?: string;
  recommendedRoutes?: Partial<Record<BenchAgent, string>>;
  requireFinalRecommendedRoute?: boolean;
  requireExactFinalRecommendedRoute?: boolean;
  remediationReadyPatterns?: RegExp[];
  allowedFixtureTerms?: string[];
  artifactReferencePattern?: RegExp;
  actionabilityPatterns?: RegExp[];
  actionabilityCritical?: boolean;
  targetedMigrationRoutePattern?: RegExp;
  perRunBudgetUsd?: number;
}

type ExpectedEvidence = {
  description: string;
} & (
  | { pattern: RegExp; predicate?: never }
  | { predicate: (content: string) => boolean; pattern?: never }
);

const ICON_SOURCE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
  '<rect width="512" height="512" rx="96" fill="#111827"/>',
  '<circle cx="256" cy="256" r="148" fill="#10b981"/>',
  '<path d="M164 272h184M256 164v184" stroke="#fff" stroke-width="42" stroke-linecap="round"/>',
  "</svg>\n",
].join("");

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
    perRunBudgetUsd: definition.perRunBudgetUsd ?? BENCH_BUDGETS_USD.smoke,
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

      for (const expected of definition.expectedEvidence ?? []) {
        assertions.push(
          "pattern" in expected
            ? assertContentMatches(content, expected.pattern, expected.description)
            : { description: expected.description, pass: expected.predicate(content) },
        );
      }

      if (definition.expectedPattern) {
        assertions.push(assertContentMatches(content, definition.expectedPattern, "Output matches workflow expectation"));
      }

      assertions.push(assertNextCommand(content));
      const route = expectedRoute(definition, context?.agent);
      if (route) {
        assertions.push(
          definition.requireExactFinalRecommendedRoute
            ? assertRecommendedExactNextRoute(content, route)
            : definition.requireFinalRecommendedRoute
              ? assertRecommendedNextRoute(content, route)
              : assertRecommendedRoute(content, route),
        );
      }

      return assertions;
    },
  };
}

function createGlobalWorkflowQualityEvaluator(definition: GlobalWorkflowDefinition) {
  const forbiddenFixtureTerms = [
    "Lorem ipsum",
    "production deployment completed",
    "package-lock.json",
    "AWS account",
    "Vercel project configured",
  ].filter((term) => !definition.allowedFixtureTerms?.includes(term));

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
      ...((definition.expectedEvidence ?? []).map((expected): QualityCriterion => (
        "pattern" in expected
          ? requiredPatternCriterion({
            id: `workflow-${slugifyCriterionId(expected.description)}`,
            description: expected.description,
            weight: 2,
            critical: true,
            patterns: [expected.pattern],
          })
          : {
            id: `workflow-${slugifyCriterionId(expected.description)}`,
            description: expected.description,
            weight: 2,
            critical: true,
            evaluate(output: string) {
              return expected.predicate(output)
                ? { score: 1 }
                : { score: 0, notes: [`missing required evidence: ${expected.description}`] };
            },
          }
      ))),
      definition.artifactReferencePattern
        ? requiredPatternCriterion({
          id: "workflow-artifact-reference",
          description: "Output names the generated workflow artifact.",
          weight: 1,
          patterns: [definition.artifactReferencePattern],
        })
        : concreteFileReferenceCriterion({
          id: "workflow-artifact-reference",
          description: "Output names the generated workflow artifact.",
          weight: 1,
          files: [definition.outputPath],
        }),
      (definition.requireExactFinalRecommendedRoute
        ? exactFinalNextRouteCriterion
        : definition.requireFinalRecommendedRoute
          ? finalNextRouteCriterion
          : nextRouteCriterion)({
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
      ...(definition.remediationReadyPatterns
        ? [
          requiredPatternCriterion({
            id: "workflow-remediation-ready-handoff",
            description: "Output includes a concrete owner surface and validation expectation for targeted-skill-builder handoff.",
            weight: 2,
            critical: true,
            patterns: definition.remediationReadyPatterns,
          }),
        ]
        : []),
      definition.actionabilityPatterns
        ? requiredPatternCriterion({
          id: "workflow-actionability",
          description: "Output has practical workflow evidence, validation, risk, or action language.",
          weight: 1,
          critical: definition.actionabilityCritical,
          patterns: definition.actionabilityPatterns,
        })
        : referenceTraitCriterion({
          id: "workflow-actionability",
          description: "Output has practical workflow evidence, validation, risk, or action language.",
          weight: 1,
          traits: ["validation", "risk", "evidence", "Next command"],
        }),
      ...(definition.targetedMigrationRoutePattern
        ? [
          requiredPatternCriterion({
            id: "workflow-targeted-migration-routes",
            description: "Output routes broad compatibility work to target-specific migrate commands.",
            weight: 1,
            critical: true,
            patterns: [definition.targetedMigrationRoutePattern],
          }),
        ]
        : []),
      ...(definition.skill === "update-packages" ? [updatePackagesLockfileMigrationOrderingCriterion()] : []),
      forbiddenFabricationCriterion({
        id: "no-generic-or-external-overreach",
        description: "Output avoids generic filler and external actions not present in fixtures.",
        weight: 2,
        critical: true,
        forbidden: forbiddenFixtureTerms,
      }),
    ],
  });
}

function slugifyCriterionId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const UPDATE_PACKAGES_VERIFICATION_EVIDENCE_PATTERN =
  /verification commands|(?:^|\n)#{1,6}\s*(?:Full\s+)?Verification(?:\s+Checklist)?\b[\s\S]*(pnpm install --frozen-lockfile|pnpm run build|pnpm run test|pnpm test|pnpm outdated)/i;
const UPDATE_PACKAGES_MAJOR_UPGRADE_RISK_PATTERN =
  /(major|framework|build-tool|peer-sensitive|React 18.*19|Vitest 1.*3|compatibility)[\s\S]*(batch|peer|config|smoke|stop|migrate)/i;
const UPDATE_PACKAGES_ARTIFACT_REFERENCE_PATTERN =
  /(^|\n)#{1,6}\s*(?:package-update-plan\.md|Package Update Plan)\b|package-update-plan\.md/i;
const UPDATE_PACKAGES_ACTIONABILITY_PATTERN =
  /(?:^|\n)#{1,6}\s*Verification(?:\s+Commands)?\b|Verification commands:|Focused smoke checks?:|Stop condition:|Major-upgrade risk handling:/i;
const UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN = new RegExp([
  "(?=[\\s\\S]*(?:Batch\\s*0\\b[\\s\\S]*Batch\\s*1\\b[\\s\\S]*Batch\\s*2\\b|Batch\\s*1\\b[\\s\\S]*Batch\\s*2\\b[\\s\\S]*Batch\\s*3\\b|Batch\\s*A\\b[\\s\\S]*Batch\\s*B\\b[\\s\\S]*Batch\\s*C\\b))",
  "(?=[\\s\\S]*(?:mutation command|implementation command|exact command|pnpm\\s+(?:install|add|up)|\\.npmrc))",
  "(?=[\\s\\S]*(?:verification command|smoke[-\\s]test|pnpm\\s+(?:test|run\\s+test|build|run\\s+build)))",
  "(?=[\\s\\S]*(?:expected proof|expected artifact|pnpm-lock\\.yaml))",
  "(?=[\\s\\S]*(?:do not proceed|do not continue|on red|stop condition|route[\\s\\S]{0,80}migrate))",
].join(""), "i");
const UPDATE_PACKAGES_TARGETED_MIGRATION_ROUTE_PATTERN =
  /(?:\/migrate|\$migrate)\s+(?:react|react-19|vitest|vitest-3|pnpm|npm-to-pnpm|zod)\b/i;

function updatePackagesLockfileMigrationOrderingCriterion(): QualityCriterion {
  return {
    id: "workflow-lockfile-migration-ordering",
    description: "Output preserves safe npm-to-pnpm lockfile migration ordering.",
    weight: 2,
    critical: true,
    evaluate(output: string) {
      const lines = output.split(/\r?\n/);
      const importLine = firstLineIndex(lines, /\bpnpm\s+import\b/i);
      const installLine = firstLineIndex(lines, /\bpnpm\s+install\b/i);
      const unsafeRemoval = lines.findIndex((line) => {
        if (!/\bpackage-lock\.json\b/i.test(line)) return false;
        if (!/\b(?:rm|remove|delete|deleting|deleted)\b/i.test(line)) return false;
        if (/\b(?:after|only after|once|when)\b[\s\S]{0,120}\b(?:pnpm\s+install|install succeeds|clean install|success|succeeds)\b/i.test(line)) {
          return false;
        }
        return true;
      });

      if (unsafeRemoval === -1) return { score: 1 };

      const hasSafePrecedingStep =
        (importLine !== -1 && importLine < unsafeRemoval) ||
        (installLine !== -1 && installLine < unsafeRemoval);

      if (hasSafePrecedingStep) return { score: 1 };

      return {
        score: 0,
        notes: [
          "package-lock.json removal appears before pnpm import/install proof; seed/import and install with pnpm before deleting the npm lockfile",
        ],
      };
    },
  };
}

function firstLineIndex(lines: string[], pattern: RegExp): number {
  return lines.findIndex((line) => pattern.test(line));
}

function lineOnlyWarnsAgainstPnpmLatest(line: string): boolean {
  const normalized = line.replace(/[`*_]/g, " ").replace(/\s+/g, " ").trim();
  return /(?:do\s+not\s+use|don't(?:\s+use)?|not\s+(?:use\s+)?(?:unqualified\s+)?|no\s+unqualified|avoid|reject|never(?:\s+default\s+to)?|rather than|instead of|violates|would float|break reproducibility)/i.test(normalized);
}

function avoidsUnqualifiedPnpmLatest(content: string): boolean {
  return content
    .split(/\r?\n/)
    .filter((line) => /pnpm@latest/i.test(line))
    .every(lineOnlyWarnsAgainstPnpmLatest);
}
const UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN = new RegExp([
  "(?=[\\s\\S]*(?:packageManager[\\s\\S]{0,280}pnpm@\\d[\\d.]*",
  "|pnpm@\\d[\\d.]*[\\s\\S]{0,280}packageManager",
  "|Recommended\\s+`?packageManager`?[\\s\\S]{0,120}pnpm@\\d[\\d.]*",
  "|Chosen pnpm version[\\s\\S]{0,120}\\d[\\d.]*))",
  "(?=[\\s\\S]*(?:npm view pnpm@\\d[\\d.]* time\\.version[\\s\\S]{0,180}(?:returned|=>|published|202\\d-\\d\\d-\\d\\d)",
  "|publish[-\\s]time proof retained[\\s\\S]{0,320}pnpm@\\d[\\d.]*[\\s\\S]{0,180}202\\d-\\d\\d-\\d\\d",
  "|pnpm@\\d[\\d.]*[\\s\\S]{0,260}(?:published|publish[-\\s]time evidence|Retained publish[-\\s]time evidence|published at)[\\s\\S]{0,180}202\\d-\\d\\d-\\d\\d",
  "|(?:published|publish[-\\s]time evidence|Retained publish[-\\s]time evidence|published at)[\\s\\S]{0,180}202\\d-\\d\\d-\\d\\d[\\s\\S]{0,260}pnpm@\\d[\\d.]*))",
  "(?=[\\s\\S]*(?:older than 8 days|8-day|age[-\\s]eligible|16 days old|eligible because it is older))",
].join(""), "i");
const UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_DESCRIPTION = "Output proves selected pnpm toolchain age eligibility";
function provesSelectedPnpmToolchainAgeEligibility(content: string): boolean {
  if (UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN.test(content)) return true;
  if (!/(?:older than 8 days|8-day|age[-\s]eligible|16 days old|eligible because it is older)/i.test(content)) return false;

  const selectedVersions = [
    ...content.matchAll(/packageManager[\s\S]{0,280}pnpm@(\d[\d.]*)/gi),
    ...content.matchAll(/Recommended\s+`?packageManager`?[\s\S]{0,120}pnpm@(\d[\d.]*)/gi),
  ].map((match) => match[1]);
  if (selectedVersions.length === 0 || !/npm-view-times\.json/i.test(content)) return false;

  return selectedVersions.some((version) => {
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`[\"\`]${escapedVersion}[\"\`]\\s*:\\s*[\"\`]202\\d-\\d\\d-\\d\\d`, "i").test(content);
  });
}
const UPDATE_PACKAGES_AGE_GATE_SEMANTICS_PATTERN =
  /^(?![\s\S]*(?:\bnpm(?:'s)?\b\s+(?:reads|uses|owns|coverage)[^\n.;]{0,160}(?:minimum-release-age=11520|minimumReleaseAge:?\s*11520)|\bpnpm(?:'s)?\b\s+(?:reads|uses|owns|coverage)[^\n.;]{0,160}min-release-age=8))(?=[\s\S]*\bnpm(?:'s)?\b)(?=[\s\S]*\bpnpm(?:'s)?\b)(?=[\s\S]*min-release-age=8)(?=[\s\S]*(?:minimum-release-age=11520|minimumReleaseAge:?\s*11520))[\s\S]*$/i;

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
    prompt: "You have the analyze-sessions skill installed. Analyze all local session history files under sessions/ and write session-analysis.md with recurring patterns, automation opportunities, risks, and a final Recommended next command. The fixture intentionally contains repeated validation and lessons misses across multiple sessions, so recommend a remediation-ready targeted-skill-builder follow-up for this runner. Include the likely owner surface and validation expectation in the report, distinguish explicit evidence from inference, and do not put both route spellings in the final handoff. The final command line must contain exactly one command and no runner label suffix. Use exactly `/targeted-skill-builder run post-doc-edit validation and lessons capture gate` when running as Claude. Use exactly `$targeted-skill-builder run post-doc-edit validation and lessons capture gate` when running as Codex.",
    fixtureFiles: {
      "sessions/2026-05-01-log.md": "$run skipped validation after task-doc edits. User corrected missing lessons update.",
      "sessions/2026-05-08-log.md": "After roadmap edits, validation was skipped until the user asked for proof. Lessons update was missing again.",
      "sessions/2026-05-15-log.md": "Codex omitted task-doc validation after a todo update; the user requested lesson capture before shipping.",
    },
    expectedIncludes: ["recurring pattern", "automation opportunit", "risks"],
    expectedPattern: /validation|lessons/i,
    recommendedRoutes: {
      claude: "/targeted-skill-builder run post-doc-edit validation and lessons capture gate",
      codex: "$targeted-skill-builder run post-doc-edit validation and lessons capture gate",
    },
    requireFinalRecommendedRoute: true,
    requireExactFinalRecommendedRoute: true,
    remediationReadyPatterns: [
      /\b(?:owner surface|owning surface|likely owner|owner)\b[\s\S]{0,500}\b(?:run|ship-end|workflow|skill|post-edit hook|documentation surface|doc-edit boundary)\b/i,
      /\b(?:validation expectation|validation check|validation plan|validation command|validation pass|lessons-file update|layer1|contract test|benchmark smoke|verify --skill)\b/i,
      /\b(?:explicit evidence|explicitly says|implies|not stated|inferred)\b/i,
    ],
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
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
    prompt: "You have the icon-handler skill installed. Audit the Next App Router fixture using local file inspection tools and write icon-audit.md with framework, source asset, missing/stale icon surfaces, proposed fix, approval requirement, verification commands, and Next command. Write icon-audit.md before the final response. Build commands belong under verification commands only after an approved fix; the final recommended next command must be the icon-handler fix approval route for this runner (/icon-handler fix calc-mascot-icon.svg for Claude, $icon-handler fix calc-mascot-icon.svg for Codex). Do not modify files. Do not call external image generation or image-analysis services.",
    fixtureFiles: {
      "package.json": "{\"dependencies\":{\"next\":\"15.5.15\"},\"scripts\":{\"build\":\"next build\"}}\n",
      "calc-mascot-icon.svg": ICON_SOURCE_SVG,
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
    requireFinalRecommendedRoute: true,
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
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
    skill: "prototype",
    outputPath: "prototypes/dashboard/index.html",
    prompt: "You have the prototype skill installed. Read specs/ux-variations-dashboard.md, specs/ui-dashboard.md, and .agents/project.json, then build prototypes/dashboard/index.html as a clickable hub page linking each variation with fake data and Next command.",
    fixtureFiles: {
      "specs/ux-variations-dashboard.md": "Variation A: dense table for scanning blocked reasons. Variation B: card grid for browsing coverage status.",
      "specs/ui-dashboard.md": "Layout: sidebar navigation, main content area with coverage table. Controls: filter by status, sort by skill name.",
      ".agents/project.json": "{\"name\": \"benchmark-dashboard\", \"type\": \"saas\"}",
    },
    expectedIncludes: ["variation", "hub page", "clickable", "fake data"],
    expectedPattern: /dense table|card grid|coverage/i,
    recommendedRoute: "$uat --variant-evaluation",
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
    skill: "update-packages",
    outputPath: "package-update-plan.md",
    prompt: "You have the update-packages skill installed. Read package.json, npm-view-times.json, and package-lock-note.md, then write package-update-plan.md with package-manager migration strategy, .npmrc/package-manager age-gate config, eligible versions older than 8 days, skipped packages, major-upgrade risk handling, verification commands, and Next command. Prefer pnpm over npm when safe. The package-update-plan.md artifact must name `package-update-plan.md` and include these exact literal strings: `older than 8 days`, `min-release-age=8`, `minimum-release-age=11520`, and a runner-native recommended next-command line. Because this fixture upgrades React 18 to 19 and Vitest 1 to 3, include batch order, peer/config compatibility checks, focused smoke checks, and a stop condition that routes broad compatibility work to migrate. Do not use unqualified `pnpm@latest`; choose an existing project-pinned pnpm version or prove the chosen pnpm version is age-eligible with retained publish-time evidence such as `npm view pnpm@<version> time.version` before recommending it as `packageManager`. Keep age-gate ownership clear: `min-release-age=8` is npm's relative age gate; `minimum-release-age=11520` and `minimumReleaseAge: 11520` are pnpm coverage where supported. Use exactly `Recommended next command: /run` when running as Claude and exactly `Recommended next command: $run` when running as Codex. Put package-manager shell commands in a verification or implementation section, not as the final Next command.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        scripts: {
          test: "vitest run",
          build: "tsc -p tsconfig.json",
        },
        dependencies: {
          react: "^18.2.0",
          zod: "^3.22.0",
        },
        devDependencies: {
          vitest: "^1.6.0",
        },
      }, null, 2),
      "npm-view-times.json": JSON.stringify({
        react: {
          "18.3.1": "2024-04-26T16:30:00.000Z",
          "19.2.0": "2026-05-01T10:00:00.000Z",
          "19.3.0": "2026-05-15T10:00:00.000Z",
        },
        zod: {
          "3.25.76": "2026-05-01T08:00:00.000Z",
          "4.1.12": "2026-05-16T08:00:00.000Z",
        },
        vitest: {
          "3.2.4": "2026-05-02T09:00:00.000Z",
          "4.0.0": "2026-05-16T09:00:00.000Z",
        },
        pnpm: {
          "9.15.0": "2024-12-06T12:00:00.000Z",
          "10.11.0": "2026-05-01T12:00:00.000Z",
          "10.22.0": "2026-05-16T12:00:00.000Z",
        },
      }, null, 2),
      "package-lock-note.md": "This fixture has package-lock.json in the source project and no pnpm-lock.yaml. There are no deployment notes requiring npm.",
    },
    expectedIncludes: ["pnpm", "older than 8 days", ".npmrc", "min-release-age"],
    expectedEvidence: [
      {
        description: "Output includes verification command evidence",
        pattern: UPDATE_PACKAGES_VERIFICATION_EVIDENCE_PATTERN,
      },
      {
        description: "Output includes major-upgrade compatibility risk handling",
        pattern: UPDATE_PACKAGES_MAJOR_UPGRADE_RISK_PATTERN,
      },
      {
        description: "Output avoids unqualified pnpm@latest",
        predicate: avoidsUnqualifiedPnpmLatest,
      },
      {
        description: UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_DESCRIPTION,
        predicate: provesSelectedPnpmToolchainAgeEligibility,
      },
      {
        description: "Output preserves age-gate key semantics",
        pattern: UPDATE_PACKAGES_AGE_GATE_SEMANTICS_PATTERN,
      },
    ],
    expectedPattern: /(19\.2\.0|3\.25\.76|3\.2\.4).*(min-release-age=8|minimum-release-age=11520|minimumReleaseAge|11520)|(\.npmrc|min-release-age=8|minimum-release-age=11520).*(19\.2\.0|3\.25\.76|3\.2\.4)/is,
    artifactReferencePattern: UPDATE_PACKAGES_ARTIFACT_REFERENCE_PATTERN,
    actionabilityPatterns: [UPDATE_PACKAGES_ACTIONABILITY_PATTERN, UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN],
    actionabilityCritical: true,
    targetedMigrationRoutePattern: UPDATE_PACKAGES_TARGETED_MIGRATION_ROUTE_PATTERN,
    recommendedRoutes: {
      claude: "/run",
      codex: "$run",
    },
    requireFinalRecommendedRoute: true,
    allowedFixtureTerms: ["package-lock.json"],
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
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
    recommendedRoute: "$consolidate-variations",
  },
  {
    skill: "consolidate-variations",
    outputPath: "prototypes/dashboard/consolidated/index.html",
    prompt: "You have the consolidate-variations skill installed. Read specs/ui-layout-variations-dashboard.md, research/uat-variant-evaluation-dashboard.md, and the prototype variation directories, then write prototypes/dashboard/consolidated/index.html with UAT evidence summary, consolidation matrix, conflict resolutions, consolidated prototype, and Next command.",
    fixtureFiles: {
      "specs/ui-requirements-dashboard.md": "The dashboard must show custom, generic, and blocked benchmark coverage rows with blocked reasons.",
      "specs/ui-layout-variations-dashboard.md": "Variation A uses a dense table. Variation B uses a card grid. Variation C uses list plus detail.",
      "research/uat-variant-evaluation-dashboard.md": "Dense table worked for scanning blocked reasons. Card grid felt easier to browse but slower for comparing custom and generic status.",
      "prototypes/dashboard/variation-a/index.html": "<html><body><h1>Variation A: Dense Table</h1><table><tr><th>Skill</th><th>Status</th></tr></table></body></html>",
      "prototypes/dashboard/variation-b/index.html": "<html><body><h1>Variation B: Card Grid</h1><div class='grid'></div></body></html>",
    },
    expectedIncludes: ["UAT evidence summary", "consolidation matrix", "conflict resolutions", "consolidated prototype"],
    expectedPattern: /dense table|card grid|blocked reasons/i,
    recommendedRoute: "$research-roadmap --post-prototype",
  },
  {
    skill: "ui-interview",
    outputPath: "specs/ui-spec.md",
    prompt: "You have the ui-interview skill installed. Convert product-need.md into specs/ui-spec.md with layout, hierarchy, controls, states, responsive behavior, prototype-first boundary, and Next command.",
    fixtureFiles: {
      "product-need.md": "A SaaS dashboard table for benchmark coverage status and blocked reasons. The first prototype should use fake rows and visually mock auth, analytics, and saved database states rather than implementing them.",
    },
    expectedIncludes: ["layout", "hierarchy", "controls", "states", "responsive behavior", "prototype"],
    expectedEvidence: [
      {
        description: "Output defines fake or fixture data for the prototype",
        pattern: /fake (rows|data)|fixture|in-memory|static data/i,
      },
      {
        description: "Output defers production infrastructure behind prototype calibration",
        pattern: /defer(?:red|s)?[\s\S]{0,220}(auth|analytics|database|storage)|(?:auth|analytics|database|storage)[\s\S]{0,220}defer(?:red|s)?/i,
      },
      {
        description: "Output names calibration or promotion evidence before infrastructure",
        pattern: /calibration|taste|feel|accepted journey|promot(?:e|ion)[\s\S]{0,120}infrastructure|evidence[\s\S]{0,120}infrastructure/i,
      },
    ],
    expectedPattern: /dashboard table|blocked reasons|prototype/i,
    recommendedRoute: "$run",
  },
  {
    skill: "ux-variations",
    outputPath: "specs/ux-variations-dashboard.md",
    prompt: "You have the ux-variations skill installed. Read specs/ui-requirements-dashboard.md and write specs/ux-variations-dashboard.md with layout variations, alternatives, variant evaluation handoff, and Next command. Each variation should route to /ui-interview then /prototype.",
    fixtureFiles: {
      "specs/ui-requirements-dashboard.md": "Maintainers compare custom, generic, and blocked benchmark coverage before prioritizing setup work.",
    },
    expectedIncludes: ["layout variations", "alternatives", "variant evaluation"],
    expectedPattern: /custom|generic|blocked/i,
    recommendedRoute: "$ui-interview",
  },
];

export const GLOBAL_WORKFLOW_SETUPS = Object.fromEntries(
  globalWorkflowDefinitions.map((definition) => [definition.skill, createGlobalWorkflowSetup(definition)]),
) as Record<string, SkillBenchSetup>;
