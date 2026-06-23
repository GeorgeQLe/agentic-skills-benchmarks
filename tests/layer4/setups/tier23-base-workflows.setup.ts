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

interface BaseWorkflowDefinition {
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
  forbiddenStdoutPatterns?: RegExp[];
  includeStdoutInAssertions?: boolean;
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

function expectedRoute(definition: BaseWorkflowDefinition, agent?: BenchAgent): string | undefined {
  if (agent && definition.recommendedRoutes?.[agent]) {
    return definition.recommendedRoutes[agent];
  }
  return definition.recommendedRoute;
}

function qualityRoutes(definition: BaseWorkflowDefinition): string | string[] | undefined {
  const routes = Object.values(definition.recommendedRoutes ?? {});
  if (routes.length > 0) {
    return routes;
  }
  return definition.recommendedRoute;
}

function createBaseWorkflowSetup(definition: BaseWorkflowDefinition): SkillBenchSetup {
  return {
    skill: definition.skill,
    prompt: definition.prompt,
    perRunBudgetUsd: definition.perRunBudgetUsd ?? BENCH_BUDGETS_USD.standard,
    timeoutMs: BENCH_TIMEOUTS_MS.standard,
    qualityOutputPath: definition.outputPath,
    qualityEvaluator: createBaseWorkflowQualityEvaluator(definition),

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

      const artifactContent = readGeneratedFile(result, definition.outputPath);
      if (!artifactContent) return assertions;
      const content = definition.includeStdoutInAssertions
        ? `${artifactContent}\n\n${result.stdout}`
        : artifactContent;

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

      for (const forbiddenPattern of definition.forbiddenStdoutPatterns ?? []) {
        assertions.push({
          description: `Stdout avoids forbidden pattern ${forbiddenPattern}`,
          pass: !forbiddenPattern.test(result.stdout),
        });
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

function createBaseWorkflowQualityEvaluator(definition: BaseWorkflowDefinition) {
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
const DESK_FLIP_ARTIFACT_REFERENCE_PATTERN =
  /(^|\n)#{1,6}\s*(?:desk-flip-report\.md|Desk-Flip Report)\b|desk-flip-report\.md/i;
const UPDATE_PACKAGES_ACTIONABILITY_PATTERN =
  /(?:^|\n)#{1,6}\s*Verification(?:\s+Commands)?\b|Verification commands:|Focused smoke checks?:|Stop condition:|Major-upgrade risk handling:/i;
const UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN = new RegExp([
  "(?=[\\s\\S]*(?:Batch\\s*0\\b[\\s\\S]*Batch\\s*1\\b[\\s\\S]*Batch\\s*2\\b|Batch\\s*1\\b[\\s\\S]*Batch\\s*2\\b[\\s\\S]*Batch\\s*3\\b|Batch\\s*A\\b[\\s\\S]*Batch\\s*B\\b[\\s\\S]*Batch\\s*C\\b))",
  "(?=[\\s\\S]*(?:mutation command|implementation command|exact command|pnpm\\s+(?:install|add|up)|minimumReleaseAge))",
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
  /^(?![\s\S]*(?:\bnpm(?:'s)?\b\s+(?:reads|uses|owns|coverage)[^\n.;]{0,160}minimumReleaseAge:?\s*11520|\bpnpm(?:'s)?\b\s+(?:reads|uses|owns|coverage)[^\n.;]{0,160}(?:npm-only|publish-time proof only|manual registry)))(?=[\s\S]*\bnpm(?:'s)?\b)(?=[\s\S]*(?:publish-time proof|registry age verification|npm view|npm-only))(?=[\s\S]*\bpnpm(?:'s)?\b)(?=[\s\S]*minimumReleaseAge:?\s*11520)[\s\S]*$/i;

const baseWorkflowDefinitions: BaseWorkflowDefinition[] = [
  {
    skill: "affected",
    outputPath: "affected-report.md",
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
    prompt: "You have the affected skill installed. Read the fixture git diff and package map, then write affected-report.md with changed files, affected packages/apps, validation commands, and Next command. End with `Recommended next command: $exec`. Do not run package managers.",
    fixtureFiles: {
      "diff.txt": "M packages/web/src/button.ts\nM packages/shared/src/tokens.ts\n",
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      "packages/web/package.json": "{\"name\":\"web\",\"dependencies\":{\"shared\":\"workspace:*\"}}\n",
      "packages/shared/package.json": "{\"name\":\"shared\"}\n",
    },
    expectedIncludes: ["changed files", "affected", "validation commands"],
    expectedPattern: /web|shared/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "analyze-sessions",
    outputPath: "session-analysis.md",
    prompt: "You have the analyze-sessions skill installed. Analyze all local session history files under sessions/ and write session-analysis.md with recurring patterns, automation opportunities, risks, and a final Recommended next command. The fixture intentionally contains repeated validation and lessons misses across multiple sessions, so recommend a remediation-ready targeted-skill-builder follow-up for this runner. Include the likely owner surface and validation expectation in the report, distinguish explicit evidence from inference, and do not put both route spellings in the final handoff. The final command line must contain exactly one command and no runner label suffix. Use exactly `/targeted-skill-builder run post-doc-edit validation and lessons capture gate` when running as Claude. Use exactly `$targeted-skill-builder run post-doc-edit validation and lessons capture gate` when running as Codex.",
    fixtureFiles: {
      "sessions/2026-05-01-log.md": "$exec skipped validation after task-doc edits. User corrected missing lessons update.",
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
    skill: "animation-design-planner",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/component-lifecycle.md, then write animation-plan.md for the card-pack modal/drawer/list transition. Do not tweak timing constants or local Motion props. The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must name one lifecycle owner or state-machine coordinator, explicit state phases, stable keys or identity rules, AnimatePresence placement, Motion sequencing mode, LayoutGroup/layout-animation considerations, reduced-motion behavior, transform/opacity-first performance constraints, and visual proof using slow-motion review plus Playwright screenshot or video capture. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "The prototype card pack opens from a sealed card into a drawer and detail list.",
        "Closing currently flashes the bottom sheet, clears activePack before exit, and sometimes drops the shared card layer before the morph is complete.",
        "Several attempts tweaked duration constants and easing but the drawer/list regression kept returning.",
        "Plan the animation before implementation.",
      ].join("\n"),
      "fixtures/component-lifecycle.md": [
        "# Component lifecycle notes",
        "",
        "- PrototypePage currently owns activePack and openedPacks.",
        "- BottomSheet owns sheet mount/exit.",
        "- PackOpener owns the sealed card layout and elevation.",
        "- DetailList renders rows keyed by item id.",
        "- The desired close sequence is drawer-open -> closing-collapse -> sheet-exiting -> layout-morph-out -> drop-elevation -> sealed.",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output names an explicit lifecycle owner or state-machine coordinator.",
        pattern: /(one|single|explicit)[\s\S]{0,160}(lifecycle owner|owner|state[- ]machine|coordinator)|(?:lifecycle owner|state[- ]machine coordinator)[\s\S]{0,160}(PrototypePage|parent|controller|coordinator)/i,
      },
      {
        description: "Output preserves the required close state phases.",
        pattern: /drawer-open[\s\S]{0,260}closing-collapse[\s\S]{0,260}sheet-exiting[\s\S]{0,260}layout-morph-out[\s\S]{0,260}drop-elevation[\s\S]{0,260}sealed/i,
      },
      {
        description: "Output covers stable identity and AnimatePresence placement.",
        pattern: /(?:stable key|stable identity|identity rule|activePack)[\s\S]{0,260}AnimatePresence|AnimatePresence[\s\S]{0,260}(?:stable key|stable identity|identity rule|activePack)/i,
      },
      {
        description: "Output covers transform/opacity-first performance guardrails.",
        pattern: /transform[\s\S]{0,160}opacity|opacity[\s\S]{0,160}transform/i,
      },
      {
        description: "Output covers slow-motion and Playwright visual proof.",
        pattern: /slow[- ]motion[\s\S]{0,260}Playwright[\s\S]{0,120}(screenshot|video)|Playwright[\s\S]{0,120}(screenshot|video)[\s\S]{0,260}slow[- ]motion/i,
      },
      {
        description: "Output rejects local timing tweaks before lifecycle planning.",
        pattern: /(?:do not|don't|avoid|before|not start)[\s\S]{0,180}(timing constants?|duration|easing|Motion props)|(?:timing constants?|duration|easing|Motion props)[\s\S]{0,180}(?:after|until)[\s\S]{0,120}(owner|state phases|proof|motion contract)/i,
      },
    ],
    expectedPattern: /activePack|closing-collapse|sheet-exiting|layout-morph-out|state[- ]machine/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  },
  {
    skill: "css-transitions",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/Toast.tsx, then write animation-plan.md for the notification toast enter/exit using CSS transitions only (no animation library). The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must cover transitionend filtering by propertyName, will-change lifecycle (add before transition, remove after transitionend), forced reflow via double-rAF or offsetHeight read, exit animate-then-remove pattern, setTimeout fallback for transitionend, reduced-motion behavior, and transform/opacity-first performance constraints. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        name: "toast-fixture",
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
        },
      }, null, 2),
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "Notification toasts should slide in from the top-right and fade out on dismiss.",
        "Currently the toast just appears and disappears instantly.",
        "Use CSS transitions only — no animation library allowed.",
        "The exit transition must complete before the DOM node is removed.",
        "Multiple toasts can be visible; each must animate independently.",
      ].join("\n"),
      "fixtures/Toast.tsx": [
        "import { useEffect, useRef, useState } from 'react';",
        "",
        "export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {",
        "  const ref = useRef<HTMLDivElement>(null);",
        "  const [visible, setVisible] = useState(false);",
        "",
        "  useEffect(() => { setVisible(true); }, []);",
        "",
        "  return (",
        "    <div ref={ref} className={`toast ${visible ? 'toast-enter' : ''}`}>",
        "      {message}",
        "      <button onClick={onDismiss}>×</button>",
        "    </div>",
        "  );",
        "}",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "will-change",
      "transitionend",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output covers transitionend filtering by propertyName.",
        pattern: /transitionend[\s\S]{0,260}propertyName|propertyName[\s\S]{0,260}transitionend/i,
      },
      {
        description: "Output covers will-change lifecycle management.",
        pattern: /will-change[\s\S]{0,260}(remove|reset|after|transitionend)|(before|add|set)[\s\S]{0,260}will-change/i,
      },
      {
        description: "Output covers forced reflow via double-rAF or offsetHeight.",
        pattern: /(?:forced reflow|double[- ]rAF|requestAnimationFrame[\s\S]{0,80}requestAnimationFrame|offsetHeight|getBoundingClientRect)/i,
      },
      {
        description: "Output covers exit animate-then-remove pattern.",
        pattern: /(?:animate[- ]then[- ]remove|exit[\s\S]{0,160}(?:complete|finish|end)[\s\S]{0,160}(?:remove|unmount))|(?:remove|unmount)[\s\S]{0,160}(?:after|once)[\s\S]{0,160}(?:transition|animation)/i,
      },
      {
        description: "Output covers setTimeout fallback for transitionend.",
        pattern: /setTimeout[\s\S]{0,260}(?:fallback|transitionend|safety)|(?:fallback|safety)[\s\S]{0,260}setTimeout/i,
      },
    ],
    expectedPattern: /toast|slide[\s\S]{0,60}fade|CSS transition/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "gsap",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/HeroSection.tsx, then write animation-plan.md for a scroll-driven hero with pinned headline and staggered feature cards using GSAP. The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must cover timeline composition with labels and position parameters, overwrite modes, ScrollTrigger pin placement outside flex/grid containers, matchMedia for responsive breakpoints, gsap.context with ctx.revert() cleanup, reduced-motion behavior, and transform/opacity-first performance constraints. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        name: "hero-fixture",
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          gsap: "^3.12.0",
        },
      }, null, 2),
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "The marketing hero section has a headline that pins on scroll while feature cards stagger in below.",
        "On mobile, pinning should be disabled and cards should simply fade in on scroll.",
        "The current implementation has layout jumps when ScrollTrigger pins inside a flex container.",
        "Cleanup on route change is missing — navigating away and back replays stale scroll positions.",
      ].join("\n"),
      "fixtures/HeroSection.tsx": [
        "import { useEffect, useRef } from 'react';",
        "import gsap from 'gsap';",
        "import { ScrollTrigger } from 'gsap/ScrollTrigger';",
        "",
        "gsap.registerPlugin(ScrollTrigger);",
        "",
        "export function HeroSection() {",
        "  const sectionRef = useRef<HTMLDivElement>(null);",
        "  const headlineRef = useRef<HTMLHeadingElement>(null);",
        "",
        "  useEffect(() => {",
        "    // TODO: pin headline, stagger cards, cleanup",
        "  }, []);",
        "",
        "  return (",
        "    <section ref={sectionRef} className='hero flex flex-col'>",
        "      <h1 ref={headlineRef}>Ship faster</h1>",
        "      <div className='cards grid grid-cols-3 gap-4'>",
        "        <div className='card'>Speed</div>",
        "        <div className='card'>Quality</div>",
        "        <div className='card'>Scale</div>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "ScrollTrigger",
      "overwrite",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output covers timeline composition with labels or position parameters.",
        pattern: /timeline[\s\S]{0,260}(?:label|position parameter|addLabel|\+=|<|>)|(?:label|position parameter)[\s\S]{0,260}timeline/i,
      },
      {
        description: "Output covers ScrollTrigger pin placement outside flex/grid.",
        pattern: /(?:pin|ScrollTrigger)[\s\S]{0,260}(?:flex|grid|wrapper|container)[\s\S]{0,260}(?:outside|separate|avoid|wrap)|(?:outside|separate|wrapper)[\s\S]{0,260}(?:pin|ScrollTrigger)/i,
      },
      {
        description: "Output covers matchMedia for responsive breakpoints.",
        pattern: /matchMedia[\s\S]{0,260}(?:breakpoint|mobile|desktop|responsive)|(?:breakpoint|mobile|responsive)[\s\S]{0,260}matchMedia/i,
      },
      {
        description: "Output covers gsap.context with ctx.revert cleanup.",
        pattern: /gsap\.context[\s\S]{0,260}(?:revert|cleanup)|(?:ctx\.revert|context[\s\S]{0,60}revert|cleanup)[\s\S]{0,260}gsap\.context/i,
      },
      {
        description: "Output covers overwrite mode configuration.",
        pattern: /overwrite[\s\S]{0,160}(?:auto|true|false|mode)|(?:kill|interrupt)[\s\S]{0,160}overwrite/i,
      },
    ],
    expectedPattern: /ScrollTrigger|gsap\.context|pin[\s\S]{0,60}headline/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "motion-framer",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/component-lifecycle.md, then write animation-plan.md for the card-pack modal/drawer/list transition using Motion/Framer Motion. The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must cover AnimatePresence placement and stable keys, Motion sequencing mode (popLayout, sync), LayoutGroup and layoutId for shared layout animations, interruption patterns (layout morphs during exit), reduced-motion behavior, and transform/opacity-first performance constraints. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        name: "card-pack-fixture",
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "framer-motion": "^11.0.0",
        },
      }, null, 2),
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "The prototype card pack opens from a sealed card into a drawer and detail list.",
        "Closing currently flashes the bottom sheet, clears activePack before exit, and sometimes drops the shared card layer before the morph is complete.",
        "Several attempts tweaked duration constants and easing but the drawer/list regression kept returning.",
        "Plan the animation before implementation.",
      ].join("\n"),
      "fixtures/component-lifecycle.md": [
        "# Component lifecycle notes",
        "",
        "- PrototypePage currently owns activePack and openedPacks.",
        "- BottomSheet owns sheet mount/exit.",
        "- PackOpener owns the sealed card layout and elevation.",
        "- DetailList renders rows keyed by item id.",
        "- The desired close sequence is drawer-open -> closing-collapse -> sheet-exiting -> layout-morph-out -> drop-elevation -> sealed.",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "AnimatePresence",
      "LayoutGroup",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output covers AnimatePresence placement and stable keys.",
        pattern: /AnimatePresence[\s\S]{0,260}(?:stable key|key|placement|wrap)|(?:stable key|placement)[\s\S]{0,260}AnimatePresence/i,
      },
      {
        description: "Output covers Motion sequencing mode.",
        pattern: /(?:popLayout|sync|wait)[\s\S]{0,160}(?:mode|sequenc)|(?:mode|sequenc)[\s\S]{0,160}(?:popLayout|sync|wait)/i,
      },
      {
        description: "Output covers LayoutGroup and layoutId for shared layout animations.",
        pattern: /(?:LayoutGroup|layoutId)[\s\S]{0,260}(?:shared|layout animation|morph)|(?:shared|layout animation|morph)[\s\S]{0,260}(?:LayoutGroup|layoutId)/i,
      },
      {
        description: "Output covers interruption patterns during exit.",
        pattern: /(?:interrupt|cancel)[\s\S]{0,260}(?:exit|layout morph|animat)|(?:exit|layout morph)[\s\S]{0,260}(?:interrupt|cancel)/i,
      },
      {
        description: "Output preserves the required close state phases.",
        pattern: /drawer-open[\s\S]{0,260}closing-collapse[\s\S]{0,260}sheet-exiting[\s\S]{0,260}layout-morph-out[\s\S]{0,260}drop-elevation[\s\S]{0,260}sealed/i,
      },
    ],
    expectedPattern: /AnimatePresence|LayoutGroup|layoutId|activePack/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "threejs",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/ProductViewer.tsx, then write animation-plan.md for a 3D product viewer with idle rotation, click-to-angle, and particle orbit using Three.js / React Three Fiber. The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must cover useFrame with delta multiplication for framerate independence, maath/easing or lerp-based tween integration, .dispose() cleanup for geometries/materials/textures, frame budget awareness (16.6ms target, pre-allocate vectors/quaternions), Perf or Stats.js profiling, reduced-motion behavior, and transform/opacity-first constraints for any HTML overlay. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        name: "product-viewer-fixture",
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          three: "^0.162.0",
          "@react-three/fiber": "^8.15.0",
          "@react-three/drei": "^9.96.0",
        },
      }, null, 2),
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "A 3D product viewer showing a sneaker model with:",
        "- Idle auto-rotation that pauses on hover/touch.",
        "- Click hotspots that animate the camera to preset angles (sole, heel, tongue).",
        "- A particle orbit ring that pulses on hover.",
        "The current prototype leaks GPU memory on unmount and jitters on low-end phones.",
        "Plan the animation architecture before implementation.",
      ].join("\n"),
      "fixtures/ProductViewer.tsx": [
        "import { Canvas, useFrame } from '@react-three/fiber';",
        "import { OrbitControls, useGLTF } from '@react-three/drei';",
        "import { useRef } from 'react';",
        "",
        "function Sneaker() {",
        "  const { scene } = useGLTF('/sneaker.glb');",
        "  const ref = useRef();",
        "  useFrame(() => {",
        "    ref.current.rotation.y += 0.01; // no delta, jitters at low fps",
        "  });",
        "  return <primitive ref={ref} object={scene} />;",
        "}",
        "",
        "export function ProductViewer() {",
        "  return (",
        "    <Canvas>",
        "      <ambientLight />",
        "      <Sneaker />",
        "      <OrbitControls />",
        "    </Canvas>",
        "  );",
        "}",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "useFrame",
      "dispose",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output covers useFrame with delta multiplication for framerate independence.",
        pattern: /useFrame[\s\S]{0,260}(?:delta|dt|framerate|frame[- ]rate)|(?:delta|framerate|frame[- ]rate)[\s\S]{0,260}useFrame/i,
      },
      {
        description: "Output covers lerp or easing-based tween integration.",
        pattern: /(?:maath|lerp|easing|damp|smoothstep)[\s\S]{0,260}(?:tween|interpolat|smooth)|(?:tween|interpolat|smooth)[\s\S]{0,260}(?:maath|lerp|easing|damp)/i,
      },
      {
        description: "Output covers .dispose() cleanup for GPU resources.",
        pattern: /\.dispose\(\)[\s\S]{0,260}(?:geometry|material|texture|cleanup|unmount)|(?:geometry|material|texture|cleanup|unmount)[\s\S]{0,260}\.dispose\(\)/i,
      },
      {
        description: "Output covers frame budget and pre-allocation.",
        pattern: /(?:frame budget|16\.6\s*ms|pre[- ]allocat)[\s\S]{0,260}(?:vector|quaternion|performance)|(?:vector|quaternion|performance)[\s\S]{0,260}(?:frame budget|16\.6\s*ms|pre[- ]allocat)/i,
      },
      {
        description: "Output covers profiling with Perf or Stats.js.",
        pattern: /(?:Perf|Stats\.js|stats|useStats|r3f-perf)[\s\S]{0,160}(?:profil|monitor|measure|fps)|(?:profil|monitor|fps)[\s\S]{0,160}(?:Perf|Stats\.js|stats|r3f-perf)/i,
      },
    ],
    expectedPattern: /useFrame|dispose|three\.js|react three fiber|R3F/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "web-animations-api",
    outputPath: "animation-plan.md",
    prompt: "You have the animation-design-planner skill installed. Read fixtures/animation-request.md and fixtures/dropdown-menu.ts, then write animation-plan.md for a dropdown menu open/close using the Web Animations API (Element.animate()) in a Lit component. The plan must include Visible Motion Contract, Storyboard / Timeline, Lifecycle Ownership Map, Implementation Guardrails, Proof Gate, and Implementation Handoff. It must cover Animation lifecycle (cancel vs finish, finished promise rejection on cancel), fill mode vs commitStyles tradeoffs, composite modes (add, accumulate, replace), sequencing via finished promises, getAnimations() for verification and cleanup, reduced-motion behavior, and transform/opacity-first performance constraints. End with a runner-native final recommended route: /exec for Claude, $exec for Codex.",
    fixtureFiles: {
      "package.json": JSON.stringify({
        name: "dropdown-fixture",
        dependencies: {
          lit: "^3.1.0",
        },
      }, null, 2),
      "fixtures/animation-request.md": [
        "# Animation request",
        "",
        "A dropdown menu that expands from the trigger button and collapses on close.",
        "Use the Web Animations API (Element.animate()) — no CSS transitions or animation libraries.",
        "The menu must support rapid open/close toggling without animation glitches.",
        "Close animation must complete before the menu is removed from the DOM.",
        "The component is built with Lit and uses shadow DOM.",
      ].join("\n"),
      "fixtures/dropdown-menu.ts": [
        "import { LitElement, html, css } from 'lit';",
        "import { customElement, property } from 'lit/decorators.js';",
        "",
        "@customElement('dropdown-menu')",
        "export class DropdownMenu extends LitElement {",
        "  @property({ type: Boolean }) open = false;",
        "",
        "  static styles = css`",
        "    .menu { transform-origin: top; overflow: hidden; }",
        "  `;",
        "",
        "  render() {",
        "    return html`",
        "      <button @click=${() => this.open = !this.open}>Toggle</button>",
        "      ${this.open ? html`<div class='menu'><slot></slot></div>` : ''}",
        "    `;",
        "  }",
        "}",
      ].join("\n"),
    },
    expectedIncludes: [
      "Visible Motion Contract",
      "Storyboard",
      "Lifecycle Ownership Map",
      "Implementation Guardrails",
      "Proof Gate",
      "commitStyles",
      "finished",
      "reduced-motion",
    ],
    expectedEvidence: [
      {
        description: "Output covers Animation lifecycle with cancel vs finish semantics.",
        pattern: /(?:cancel|finish)[\s\S]{0,260}(?:Animation|animate\(\)|lifecycle|promise rejection)|(?:Animation|animate\(\)|lifecycle)[\s\S]{0,260}(?:cancel|finish)/i,
      },
      {
        description: "Output covers fill mode vs commitStyles tradeoffs.",
        pattern: /(?:fill|commitStyles)[\s\S]{0,260}(?:commitStyles|fill|tradeoff|composit|forward|none)|(?:tradeoff|forward|none)[\s\S]{0,260}(?:fill|commitStyles)/i,
      },
      {
        description: "Output covers composite modes.",
        pattern: /composite[\s\S]{0,160}(?:add|accumulate|replace)|(?:add|accumulate|replace)[\s\S]{0,160}composite/i,
      },
      {
        description: "Output covers sequencing via finished promises.",
        pattern: /finished[\s\S]{0,260}(?:promise|then|await|sequenc)|(?:sequenc|chain)[\s\S]{0,260}finished/i,
      },
      {
        description: "Output covers getAnimations() for verification or cleanup.",
        pattern: /getAnimations\(\)[\s\S]{0,260}(?:verif|cleanup|cancel|check)|(?:verif|cleanup|cancel)[\s\S]{0,260}getAnimations\(\)/i,
      },
    ],
    expectedPattern: /Element\.animate|Web Animations API|dropdown|Lit/i,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "fork-idea-branch",
    outputPath: "research/_working/fork-memo-2026-06-05.md",
    prompt: "You have the fork-idea-branch skill installed. Read research/.progress.yaml and research/poketo-core/idea-brief.md, then write research/_working/fork-memo-2026-06-05.md with source skill, source path, mode, source action, branches created, rationale, reuse decisions, artifact inventory, idea-scope-brief kickoff prompts, and restart instructions. The fork splits poketo-core into poketo-teams (B2B team coordination) and poketo-personal (individual productivity). Both branches should use fresh starts (no carry-forward). Do not archive the current path because --archive was not passed; preserve research/poketo-core/ as the source path. End with a restart checklist and Recommended next command. Use exactly `Recommended next command: /idea-scope-brief poketo-teams` when running as Claude. Use exactly `Recommended next command: $idea-scope-brief poketo-teams` when running as Codex.",
    fixtureFiles: {
      "research/.progress.yaml": [
        "active_paths:",
        "  - slug: poketo-core",
        "    status: active",
        "    scope_path: research/poketo-core/",
        "    pipeline_stage: competitive-analysis",
        "    source_skill: idea-scope-brief",
        "max_concurrent: 3",
      ].join("\n"),
      "research/poketo-core/idea-brief.md": [
        "# Poketo Core — Idea Brief",
        "",
        "## Problem",
        "Teams and individuals both struggle with lightweight task coordination, but their needs diverge: teams need shared visibility and handoff tracking, while individuals need fast personal capture and daily planning.",
        "",
        "## ICP Hypothesis",
        "Two distinct ICPs emerged during competitive analysis: (1) small B2B teams (5-15 people) needing async coordination, and (2) individual knowledge workers needing personal productivity.",
        "",
        "## Value Wedge",
        "Lightweight coordination without heavyweight project management overhead.",
        "",
        "## Open Questions",
        "- Should these be one product with two modes or two separate products?",
        "- The B2B ICP needs integrations (Slack, calendar) while the personal ICP values simplicity.",
      ].join("\n"),
    },
    expectedIncludes: ["source", "branches", "rationale", "reuse", "restart"],
    expectedEvidence: [
      {
        description: "Output identifies poketo-teams as a fork branch.",
        pattern: /poketo-teams/i,
      },
      {
        description: "Output identifies poketo-personal as a fork branch.",
        pattern: /poketo-personal/i,
      },
      {
        description: "Output specifies fresh start (no carry-forward) for branches.",
        pattern: /fresh start|no carry[- ]forward|clean start/i,
      },
      {
        description: "Output states the source path is preserved because archive mode was not requested.",
        pattern: /(?:preserv|kept|leave|leav|not archive|no archive)[\s\S]{0,220}research\/poketo-core|research\/poketo-core[\s\S]{0,220}(?:preserv|kept|leave|leav|not archive|no archive)/i,
      },
      {
        description: "Output includes restart instructions with idea-scope-brief per branch.",
        pattern: /idea-scope-brief\s+poketo-teams[\s\S]{0,300}idea-scope-brief\s+poketo-personal|idea-scope-brief\s+poketo-personal[\s\S]{0,300}idea-scope-brief\s+poketo-teams/i,
      },
    ],
    expectedPattern: /B2B|team coordination|individual productivity|personal/i,
    recommendedRoutes: {
      claude: "/idea-scope-brief poketo-teams",
      codex: "$idea-scope-brief poketo-teams",
    },
    requireFinalRecommendedRoute: true,
    requireExactFinalRecommendedRoute: true,
  },
  {
    skill: "bootstrap-repo",
    outputPath: "README.md",
    prompt: "You have the bootstrap-repo skill installed. Convert brief.md into README.md and AGENTS.md with project purpose, workflows, verification, and Next command. This is a product/app bootstrap, so route to research-first alignment, not implementation or direct UI work. If reset mode is discussed, say old docs/research/specs should be archived and only the high-level concept should remain active. End with `Recommended next command: $icp`. Keep files concise.",
    fixtureFiles: {
      "brief.md": "# Brief\n\nPocket Ops is a lightweight operator console for field teams. Purpose: help dispatch leads triage jobs, view technician status, and coordinate handoffs. Setup and test commands are not known yet.\n",
    },
    expectedIncludes: ["project purpose", "verification", "Next command", "icp", "high-level concept"],
    expectedPattern: /Pocket Ops|operator console|field teams/i,
    recommendedRoute: "$icp",
  },
  {
    skill: "brainstorm",
    outputPath: "tasks/ideas.md",
    prompt: "You have the brainstorm skill installed. Read project-state.md and write tasks/ideas.md with evidence, three candidate next phases, tradeoffs, and Next command. End with `Recommended next command: $feature-interview`.",
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
    prompt: "You have the branch-lifecycle skill installed. Read branches.tsv and write branch-lifecycle-report.md with merge, salvage, keep, delete decisions and Next command. End with `Recommended next command: $ship`.",
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
    prompt: "You have the codebase-status skill installed. Read repo-summary.md and tasks/todo.md, then write codebase-status.md with what this repo is, current status, outstanding work, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "repo-summary.md": "agentic-skills stores base and pack skills with validation tests.",
      "tasks/todo.md": "# Active Phase\n\n- [ ] Step 2: Add pack coverage.\n",
    },
    expectedIncludes: ["what this repo is", "current status", "outstanding work"],
    expectedPattern: /pack coverage|skills/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "compile-central-alignment",
    outputPath: "alignment/index.html",
    prompt: "You have the compile-central-alignment skill installed. Scan the alignment/ directory for HTML files, extract titles and metadata, then generate alignment/index.html as a self-contained table of contents with card grid, search filter, and page count. End with `Recommended next command: $skills`.",
    fixtureFiles: {
      "alignment/design-system-tokens.html": [
        '<!doctype html><html lang="en"><head><title>Design System Tokens</title></head>',
        "<body><main><h1>Design System Tokens</h1>",
        '<p class="meta">Generated 2026-05-20</p>',
        "<p>Token extraction report.</p></main></body></html>",
      ].join(""),
      "alignment/dead-code-utils.html": [
        '<!doctype html><html lang="en"><head><title>Dead Code - Utils</title></head>',
        "<body><main><h1>Dead Code - Utils</h1>",
        '<p class="meta">Generated 2026-05-18</p>',
        "<p>Unused export scan results.</p></main></body></html>",
      ].join(""),
    },
    expectedIncludes: ["Design System Tokens", "Dead Code"],
    expectedPattern: /alignment\/index\.html/i,
    recommendedRoute: "$skills",
  },
  {
    skill: "idea-scope-brief",
    outputPath: "research/idea-brief-poketo-core.md",
    prompt: "You have the idea-scope-brief skill installed in an already bootstrapped repo. Read idea.md and pivot-notes.md, then write research/idea-brief-poketo-core.md and research/idea-brief-poketo-core-interview.md. Use slugged idea brief filenames because this repo has multiple related Poketo concepts. Preserve poketo.work as a related future concept instead of conflating it with Poketo Core. Include problem, audience, value, constraints, open questions, concept slug, output paths, Deck Fit Handoff, and Next command. Treat Poketo Core as a deliberate business/SaaS product concept, so the primary next command should be the canonical Business AFPS deck install. End with `Recommended next command: npx skillpacks install-deck business-afps`.",
    fixtureFiles: {
      "idea.md": "$idea-scope-brief poketo.work, a kanban project management tool.",
      "pivot-notes.md": "During interview, pivot to Poketo Core as the central coordination layer. Poketo Work remains a related future app concept and should not overwrite or share one generic overall concept brief.",
    },
    expectedIncludes: ["problem", "audience", "value", "open questions", "poketo-core", "poketo.work", "Deck Fit Handoff", "business-afps"],
    expectedEvidence: [
      {
        description: "Output names the slugged Poketo Core brief path.",
        pattern: /research\/idea-brief-poketo-core\.md/i,
      },
      {
        description: "Output names the slugged Poketo Core interview path.",
        pattern: /research\/idea-brief-poketo-core-interview\.md/i,
      },
      {
        description: "Output preserves Poketo Work as a separate related or future concept.",
        pattern: /poketo\.work[\s\S]{0,160}(related|future|separate)|(?:related|future|separate)[\s\S]{0,160}poketo\.work/i,
      },
      {
        description: "Output recommends the canonical Business AFPS install-deck command as primary routing.",
        pattern: /Recommended next command:\s*`?npx skillpacks install-deck business-afps`?/i,
      },
    ],
    expectedPattern: /Poketo Core|central coordination layer/i,
    recommendedRoute: "npx skillpacks install-deck business-afps",
    requireFinalRecommendedRoute: true,
  },
  {
    skill: "create-agentic-skill",
    outputPath: "skills/coverage-auditor/SKILL.md",
    prompt: "You have the create-agentic-skill skill installed. Create skills/coverage-auditor/SKILL.md from request.md with frontmatter, workflow, validation notes, benchmark coverage note, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "request.md": "Create a repo-managed skill that audits benchmark coverage rows.",
    },
    expectedIncludes: ["name:", "workflow", "benchmark coverage"],
    expectedPattern: /coverage-auditor|validation/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "create-alignment-page",
    outputPath: "alignment/repo-glossary-taxonomy.html",
    prompt: "You have the create-alignment-page skill installed. Read research/repo-glossary.md and the bundled .codex/skills/repo-glossary/ALIGNMENT-PAGE.md convention, then write alignment/repo-glossary-taxonomy.html. Use portable skillpacks commands for TTS, audit, and opening. End with the review handoff and do not recommend downstream implementation yet.",
    fixtureFiles: {
      "research/repo-glossary.md": "# Repo Glossary\n\n## Terms\n\n- Skill: A reusable agent workflow.\n- Pack: A distribution bundle of skills.\n\n## Decisions\n\nUse skillpacks as the portable CLI for alignment maintenance.\n",
      ".codex/skills/repo-glossary/ALIGNMENT-PAGE.md": "# Alignment Page - repo-glossary\n\nCreate `alignment/repo-glossary-{topic}.html`, include review gates, render source content directly, run `npx skillpacks alignment pages audit`, and open with `npx skillpacks alignment pages open alignment/repo-glossary-{topic}.html --browser auto`.\n",
    },
    expectedIncludes: ["repo-glossary-taxonomy.html", "npx skillpacks alignment pages audit", "npx skillpacks alignment pages open", "review"],
    expectedPattern: /skillpacks alignment pages (audit|open|inject-tts)/i,
    recommendedRoute: "review alignment page",
  },
  {
    skill: "create-local-skill",
    outputPath: "local-skill-plan.md",
    prompt: "You have the create-local-skill skill installed. Write local-skill-plan.md for request.md with local skill path, scaffold contents, validation, promotion option, and Next command. End with `Recommended next command: $ship`. Do not write outside the project.",
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
    prompt: "You have the dead-code skill installed. Analyze exports.txt and imports.txt, then write dead-code-report.md with unused exports, orphaned files, stale dependencies, validation, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "exports.txt": "src/unused.ts: unusedHelper\nsrc/live.ts: liveHelper\n",
      "imports.txt": "src/index.ts imports liveHelper\n",
    },
    expectedIncludes: ["unused exports", "orphaned files", "stale dependencies"],
    expectedPattern: /unusedHelper|unused\.ts/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "debug",
    outputPath: "debug-report.md",
    prompt: "You have the debug skill installed. Read logs/error.txt and write debug-report.md with symptoms, root cause, fix, verification, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "logs/error.txt": "TypeError: Cannot read properties of undefined (reading 'coverage_status') in bench-setups.ts",
    },
    expectedIncludes: ["symptoms", "root cause", "verification"],
    expectedPattern: /coverage_status|bench-setups/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "decommission",
    outputPath: "decommission-plan.md",
    prompt: "You have the decommission skill installed. Read service-inventory.md and write decommission-plan.md with owners, removal order, validation, rollback, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "service-inventory.md": "legacy-benchmark-reporter writes obsolete JSON files consumed by no packages.",
    },
    expectedIncludes: ["owners", "removal order", "validation", "rollback"],
    expectedPattern: /legacy-benchmark-reporter|obsolete/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "desk-flip",
    outputPath: "desk-flip-report.md",
    prompt: "You have the desk-flip skill installed. Autopsy the stuck project in the current directory. Read README.md and git-log.txt for context. Write desk-flip-report.md with Project Summary, What Went Wrong, Salvageable Specs & Designs, Salvageable Assets, Lessons for the Fresh Start, and Recommended Bootstrap Input. The user wants to keep this repo, so route to reset/archive bootstrap. Say old docs/research/specs should be archived too and only the high-level concept should remain active before research-first alignment: ICP, competitive analysis, journey map, UX variations, UI interview, then prototype work. End with Next work and a Recommended next command for the active runner: /bootstrap-repo --reset-existing for Claude, $bootstrap-repo --reset-existing for Codex.",
    fixtureFiles: {
      "README.md": "# Stuck App\nA todo app that never shipped. Started 6 months ago.\n",
      "git-log.txt": "feat: add auth before any UI\nfeat: add CI pipeline\nfix: CI flake\nchore: upgrade deps\nfix: CI flake again\nfeat: add database migrations\n",
      "specs/mvp.md": "# MVP Spec\nBasic CRUD todos with user accounts.\n",
    },
    expectedIncludes: ["What Went Wrong", "Salvageable", "Lessons", "bootstrap-repo", "reset", "archive", "icp", "competitive", "journey", "high-level concept"],
    expectedPattern: /infrastructure before|never shipped|stuck/i,
    recommendedRoutes: {
      claude: "/bootstrap-repo --reset-existing",
      codex: "$bootstrap-repo --reset-existing",
    },
    artifactReferencePattern: DESK_FLIP_ARTIFACT_REFERENCE_PATTERN,
  },
  {
    skill: "dogfood",
    outputPath: "dogfood-scenarios.md",
    prompt: "You have the dogfood skill installed. Write dogfood-scenarios.md from product-evidence.md with owner scenarios, cadence, adoption instructions, manual checks, and Next command. End with `Recommended next command: $uat`.",
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
    prompt: "You have the expert-review skill installed. Review change-summary.md and write expert-review.md with findings by severity, open questions, test gaps, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "change-summary.md": "Added coverage status CLI output but did not test blocked rows.",
    },
    expectedIncludes: ["findings", "open questions", "test gaps"],
    expectedPattern: /blocked rows|coverage status/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "guide",
    outputPath: "manual-guide.md",
    prompt: "You have the guide skill installed. Turn blocker.md into manual-guide.md with click-by-click steps, prerequisites, verification evidence, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "blocker.md": "Configure a provider endpoint for the static newsletter form.",
    },
    expectedIncludes: ["prerequisites", "verification evidence", "Next command"],
    expectedPattern: /provider endpoint|newsletter/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "handoff",
    outputPath: "HANDOFF.md",
    prompt: "You have the handoff skill installed. Read tasks/todo.md and tasks/history.md, then write HANDOFF.md with current goal, completed work, validation, risks, next work, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "tasks/todo.md": "# Active Phase\n\n- [x] Step 1\n- [ ] Step 2\n",
      "tasks/history.md": "# History\n\n- Step 1 completed with tests.\n",
    },
    expectedIncludes: ["current goal", "completed work", "validation", "next work"],
    expectedPattern: /Step 2|risks/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "hygiene",
    outputPath: "hygiene-report.md",
    prompt: "You have the hygiene skill installed. Inspect tree.txt and write hygiene-report.md with convention violations, missing files, template drift, fixes, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "tree.txt": "base/codex/foo/SKILL.md\npacks/example/PACK.md\npacks/example/codex/bar/SKILL.md\n",
    },
    expectedIncludes: ["convention violations", "missing files", "template drift"],
    expectedPattern: /SKILL\.md|PACK\.md/i,
    recommendedRoute: "$exec",
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
    prompt: "You have the migrate skill installed. Read migration-request.md and write migration-plan.md with phases, file changes, compatibility risks, validation, rollback, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "migration-request.md": "Move benchmark coverage helpers into grouped setup modules without changing CLI behavior.",
    },
    expectedIncludes: ["phases", "compatibility risks", "validation", "rollback"],
    expectedPattern: /coverage helpers|CLI behavior/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "mono-plan",
    outputPath: "mono-plan.md",
    prompt: "You have the mono-plan skill installed. Read workspace.txt and write mono-plan.md with package boundaries, shared chokepoints, safe lanes, verification, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "workspace.txt": "packages/web depends on packages/shared; packages/api also depends on packages/shared.",
    },
    expectedIncludes: ["package boundaries", "shared chokepoints", "safe lanes"],
    expectedPattern: /packages\/shared|web|api/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "pack",
    outputPath: "pack-plan.md",
    prompt: "You have the pack skill installed. Read pack-request.md and write pack-plan.md with project designation, enabled packs, install checks, validation, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "pack-request.md": "Enable the benchmark pack for this project without installing domain skills machine-wide.",
    },
    expectedIncludes: ["project designation", "enabled packs", "validation"],
    expectedPattern: /benchmark pack|domain skills/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "provision-agentic-config",
    outputPath: "AGENTS.md",
    prompt: "You have the provision-agentic-config skill installed. Read workflow.md and write AGENTS.md with orchestration rules, verification, shipping, monorepo safety, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      "workflow.md": "Use plan-first execution, no GitHub Actions, and benchmark coverage validation before shipping.",
    },
    expectedIncludes: ["verification", "shipping"],
    expectedEvidence: [
      {
        description: "Output includes an orchestration policy section",
        pattern: /#{1,3}\s*(?:Workflow\s+Orchestration|Orchestration\s+Rules|Plan[- ]First\s+Execution)/i,
      },
      {
        description: "Output includes a monorepo safety policy section",
        pattern: /#{1,3}\s*(?:\d+\.\s*)?(?:Monorepo\s+Parallel[- ]Work\s+Safety|Monorepo\s+Safety)/i,
      },
      {
        description: "Output preserves primary-branch shipping policy",
        pattern: /(?:Direct-To-Primary|primary branch|Shipping Rules)/i,
      },
      {
        description: "Output preserves GitHub Actions constraint",
        pattern: /GitHub Actions/i,
      },
    ],
    expectedPattern: /GitHub Actions/i,
    recommendedRoute: "$exec",
    includeStdoutInAssertions: true,
    allowedFixtureTerms: ["package-lock.json"],
    artifactReferencePattern: /(?:^|\s)(?:\.\/)?AGENTS\.md(?:\s|[.,):]|$)/i,
    forbiddenStdoutPatterns: [/\/(?:private\/var|var\/folders|tmp)\//i],
  },
  {
    skill: "prototype",
    outputPath: "prototypes/dashboard/index.html",
    prompt: "You have the prototype skill installed. Read specs/ux-variations-dashboard.md, specs/ui-dashboard.md, and .agents/project.json, then build prototypes/dashboard/index.html as a clickable hub page linking each variation with fake data and Next command. End with `Recommended next command: $uat --variant-evaluation`.",
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
    skill: "quiz-me",
    outputPath: "quiz-me-question-plan.md",
    prompt: "You have the quiz-me skill installed. Read the alignment page at docs/workflow-refactor-proposal.html silently and generate quiz-me-question-plan.md containing: (1) a Document Analysis section listing all major sections found, key decisions, and cross-section relationships identified; (2) a Question Plan section with 8-12 numbered questions covering every major section, each labeled by type (Relationship, Implication, Detail trap, Intent, or Synthesis) with the target section(s) noted; (3) a Sample Verdict section showing a hypothetical pass/fail verdict with per-section comprehension summary. Do not ask follow-up questions. Do not use AskUserQuestion. End with Next command. End with `Recommended next command: $quiz-me`. Questions must target cross-section relationships, specific constraints (the 48-hour migration window, the three-phase rollback), and intent (why event-driven over polling). Do not generate surface-recall questions answerable from headings alone.",
    fixtureFiles: {
      "docs/workflow-refactor-proposal.html": [
        "<html><body>",
        "<h1>Workflow Refactor Proposal</h1>",
        "<h2>1. Overview</h2>",
        "<p>Replace the polling-based task dispatcher with an event-driven architecture. The current system checks for new tasks every 30 seconds, causing up to 30s latency and wasting 40% of API quota on empty polls. The event-driven approach uses webhook callbacks from the task queue, reducing median latency to under 200ms.</p>",
        "<h2>2. Migration Strategy</h2>",
        "<p>Migration occurs in three phases over a 48-hour maintenance window. Phase 1 (0-12h): deploy the event bridge alongside the existing poller in shadow mode — events are received but not acted on, allowing validation of event delivery without risk. Phase 2 (12-36h): enable dual-write mode where both the poller and event bridge process tasks, with the poller as fallback. Phase 3 (36-48h): disable the poller and promote the event bridge to primary.</p>",
        "<h2>3. Rollback Plan</h2>",
        "<p>Each phase has an independent rollback trigger. Phase 1 rollback: if event delivery rate drops below 99.5%, disable the bridge and revert to polling-only. Phase 2 rollback: if duplicate task execution exceeds 0.1% during dual-write, disable the bridge and let the poller recover. Phase 3 rollback: if p95 latency exceeds 500ms after poller removal, re-enable the poller within 5 minutes via the emergency feature flag <code>FORCE_POLLER_FALLBACK</code>.</p>",
        "<h2>4. Trade-offs</h2>",
        "<p>Event-driven eliminates polling waste but introduces a dependency on the webhook infrastructure (currently 99.97% uptime). If the webhook provider has an outage, the fallback poller must be maintained as cold standby for at least 6 months post-migration. The team considered a hybrid approach (reduced-frequency polling + events) but rejected it because maintaining two code paths doubles the testing surface and the 30s polling floor still fails the 200ms latency target.</p>",
        "<h2>5. Observability</h2>",
        "<p>New metrics: event_delivery_lag_ms (p50, p95, p99), duplicate_task_rate, and fallback_activation_count. Alert thresholds: event_delivery_lag_p95 > 400ms triggers page, duplicate_task_rate > 0.05% triggers warning, fallback_activation_count > 0 triggers incident. The existing poll_empty_ratio metric will be retained during the 6-month cold standby period to validate that re-enabling the poller remains viable.</p>",
        "<h2>6. Security Considerations</h2>",
        "<p>Webhook endpoints require HMAC-SHA256 signature verification using a rotating secret with a 90-day rotation period. The signing secret is stored in the vault under <code>webhook/task-dispatcher/hmac-key</code>. During Phase 2 dual-write, both the poller's API key and the webhook signing secret must be active simultaneously, requiring a temporary exception to the single-credential-per-service policy documented in SEC-2024-0147.</p>",
        "</body></html>",
      ].join("\n"),
    },
    expectedIncludes: ["cross-section", "relationship", "implication", "verdict"],
    expectedEvidence: [
      {
        description: "Questions reference the 48-hour migration window",
        pattern: /48[- ]hour/i,
      },
      {
        description: "Questions reference specific rollback thresholds",
        pattern: /99\.5%|0\.1%|500ms|FORCE_POLLER_FALLBACK/,
      },
      {
        description: "Questions target cross-section relationships between migration and rollback",
        pattern: /phase\s*[123][\s\S]{0,300}rollback|rollback[\s\S]{0,300}phase\s*[123]/i,
      },
      {
        description: "Questions address the event-driven vs polling trade-off intent",
        pattern: /event[- ]driven[\s\S]{0,200}poll|poll[\s\S]{0,200}event[- ]driven/i,
      },
    ],
    expectedPattern: /relationship|implication|detail trap|intent|synthesis/i,
    recommendedRoute: "$quiz-me",
  },
  {
    skill: "reconcile-dev-docs",
    outputPath: "tasks/reconciliation-report.md",
    prompt: "You have the reconcile-dev-docs skill installed. Compare docs-state.md with code-state.md and write tasks/reconciliation-report.md with stale docs, missing tasks, fixes, validation, and Next command. End with `Recommended next command: $ship`.",
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
    prompt: "You have the regression-check skill installed. Read validation-plan.md and write regression-check.md with health checks, command results, failures, accepted risks, and Next command. End with `Recommended next command: $ship`.",
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
    prompt: "You have the research-roadmap skill installed. Read research-index.md and write tasks/research-roadmap.md with documentation health, priority queue, stale areas, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "research-index.md": "Specs exist for benchmark coverage, but pack coverage notes are missing.",
    },
    expectedIncludes: ["documentation health", "priority queue", "stale areas"],
    expectedPattern: /pack coverage|benchmark/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "report-website",
    outputPath: "report-website-plan.md",
    prompt: "You have the report-website skill installed. Read reports/benchmark-summary.md and write report-website-plan.md with source mapping, route plan, content sections, visual hierarchy, validation, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "reports/benchmark-summary.md": "# Benchmark Summary\n\nCoverage improved for setup registry validation. Remaining gaps should be visible by skill, agent, and status.",
    },
    expectedIncludes: ["source mapping", "route plan", "content sections", "validation"],
    expectedPattern: /benchmark|coverage|status/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "scaffold",
    outputPath: "scaffold-plan.md",
    prompt: "You have the scaffold skill installed. Read scaffold-request.md and write scaffold-plan.md with package path, files, conventions, validation, next-step placement after roadmap/plan-phase, and Next command. End with `Recommended next command: $exec`. Do not install dependencies.",
    fixtureFiles: {
      "scaffold-request.md": "Add a tests fixture package for benchmark report parsing.",
    },
    expectedIncludes: ["package path", "files", "conventions", "validation", "roadmap"],
    expectedPattern: /benchmark report parsing|fixture package/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "skills",
    outputPath: "skills-index.md",
    prompt: "You have the skills skill installed. Read skill-list.txt and write skills-index.md grouping skills by workflow stage, activity type, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "skill-list.txt": "run\nship\nplan-phase\nexpert-review\nbenchmark-test-skill\n",
    },
    expectedIncludes: ["workflow stage", "activity type", "Next command"],
    expectedPattern: /benchmark-test-skill|expert-review/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "slim-audit",
    outputPath: "slim-audit.md",
    prompt: "You have the slim-audit skill installed. Read loc-report.txt and write slim-audit.md with simplification opportunities, risk, preserved behavior, validation, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "loc-report.txt": "bench-setups.ts 220 LOC with repeated setup assertion code.",
    },
    expectedIncludes: ["simplification opportunities", "preserved behavior", "validation"],
    expectedPattern: /repeated setup assertion|bench-setups/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "spec-drift",
    outputPath: "spec-drift-report.md",
    prompt: "You have the spec-drift skill installed. Compare spec.md and implementation.md, then write spec-drift-report.md with implemented, missing, undocumented, tests, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "spec.md": "CLI must show custom, generic, and blocked coverage.",
      "implementation.md": "CLI shows custom and generic coverage only.",
    },
    expectedIncludes: ["implemented", "missing", "undocumented", "tests"],
    expectedPattern: /blocked coverage|custom|generic/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "trace",
    outputPath: "trace-report.md",
    prompt: "You have the trace skill installed. Trace request.md through route.md and storage.md, then write trace-report.md with entrypoint, data flow, side effects, failure modes, and Next command. End with `Recommended next command: $exec`.",
    fixtureFiles: {
      "request.md": "pnpm bench --skill run should print coverage status.",
      "route.md": "bench.ts parses --skill and calls resolveBenchTarget.",
      "storage.md": "bench-coverage.ts stores coverage rows.",
    },
    expectedIncludes: ["entrypoint", "data flow", "side effects", "failure modes"],
    expectedPattern: /resolveBenchTarget|coverage rows/i,
    recommendedRoute: "$exec",
  },
  {
    skill: "update-packages",
    outputPath: "package-update-plan.md",
    prompt: "You have the update-packages skill installed. Read package.json, npm-view-times.json, and package-lock-note.md, then write package-update-plan.md with package-manager migration strategy, package-manager age-gate config, eligible versions older than 8 days, skipped packages, major-upgrade risk handling, verification commands, and Next command. Prefer pnpm over npm when safe. The package-update-plan.md artifact must name `package-update-plan.md` and include these exact literal strings: `older than 8 days`, `publish-time proof`, `minimumReleaseAge: 11520`, and a runner-native recommended next-command line. Because this fixture upgrades React 18 to 19 and Vitest 1 to 3, include batch order, peer/config compatibility checks, focused smoke checks, and a stop condition that routes broad compatibility work to migrate. Do not use unqualified `pnpm@latest`; choose an existing project-pinned pnpm version or prove the chosen pnpm version is age-eligible with retained publish-time evidence such as `npm view pnpm@<version> time.version` before recommending it as `packageManager`. Keep age-gate ownership clear: npm-only projects use retained publish-time proof and pnpm uses persisted `minimumReleaseAge: 11520` where supported. Do not recommend unsupported `.npmrc` age-gate keys. Use exactly `Recommended next command: /exec` when running as Claude and exactly `Recommended next command: $exec` when running as Codex. Put package-manager shell commands in a verification or implementation section, not as the final Next command.",
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
    expectedIncludes: ["pnpm", "older than 8 days", "publish-time proof", "minimumReleaseAge"],
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
    expectedPattern: /(19\.2\.0|3\.25\.76|3\.2\.4).*(publish-time proof|minimumReleaseAge|11520)|(publish-time proof|minimumReleaseAge|11520).*(19\.2\.0|3\.25\.76|3\.2\.4)/is,
    artifactReferencePattern: UPDATE_PACKAGES_ARTIFACT_REFERENCE_PATTERN,
    actionabilityPatterns: [UPDATE_PACKAGES_ACTIONABILITY_PATTERN, UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN],
    actionabilityCritical: true,
    targetedMigrationRoutePattern: UPDATE_PACKAGES_TARGETED_MIGRATION_ROUTE_PATTERN,
    recommendedRoutes: {
      claude: "/exec",
      codex: "$exec",
    },
    requireFinalRecommendedRoute: true,
    allowedFixtureTerms: ["package-lock.json"],
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  },
  {
    skill: "uat",
    outputPath: "uat-journeys.md",
    prompt: "You have the uat skill installed. Read specs/ui-layout-variations-dashboard.md and write uat-journeys.md with variant evaluation, acceptance criteria, evidence capture, and Next command. End with `Recommended next command: $consolidate-prototypes`.",
    fixtureFiles: {
      "specs/ui-layout-variations-dashboard.md": "Variation A uses a dense table. Variation B uses a card grid. Both must help maintainers compare custom, generic, and blocked benchmark coverage.",
    },
    expectedIncludes: ["variant evaluation", "acceptance criteria", "evidence capture"],
    expectedPattern: /dense table|card grid|benchmark coverage/i,
    recommendedRoute: "$consolidate-prototypes",
  },
  {
    skill: "consolidate-prototypes",
    outputPath: "prototypes/dashboard/consolidated/index.html",
    prompt: "You have the consolidate-prototypes skill installed. Read specs/ui-layout-variations-dashboard.md, research/uat-variant-evaluation-dashboard.md, and the prototype variation directories, then write prototypes/dashboard/consolidated/index.html with UAT evidence summary, consolidation matrix, conflict resolutions, consolidated prototype, and Next command. End with `Recommended next command: $research-roadmap --post-prototype`.",
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
    prompt: "You have the ui-interview skill installed. Convert product-need.md into specs/ui-spec.md with layout, hierarchy, controls, states, responsive behavior, prototype-first boundary, and Next command. Treat this instruction as final compiled YAML approval of the research scope and spec content: skip interactive checkpoints, write the canonical spec, and treat the alignment page as confirmed. End with `Recommended next command: $exec`.",
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
    recommendedRoute: "$exec",
  },
  {
    skill: "ux-variations",
    outputPath: "specs/ux-variations-dashboard.md",
    prompt: "You have the ux-variations skill installed. Read specs/ui-requirements-dashboard.md and write specs/ux-variations-dashboard.md with layout variations, alternatives, variant evaluation handoff, and Next command. End with `Recommended next command: $ui-interview`. Each variation should route to /ui-interview then /prototype.",
    fixtureFiles: {
      "specs/ui-requirements-dashboard.md": "Maintainers compare custom, generic, and blocked benchmark coverage before prioritizing setup work.",
    },
    expectedIncludes: ["layout variations", "alternatives", "variant evaluation"],
    expectedPattern: /custom|generic|blocked/i,
    recommendedRoute: "$ui-interview",
  },
];

export const BASE_WORKFLOW_SETUPS = Object.fromEntries(
  baseWorkflowDefinitions.map((definition) => [definition.skill, createBaseWorkflowSetup(definition)]),
) as Record<string, SkillBenchSetup>;
