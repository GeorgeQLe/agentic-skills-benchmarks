import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BenchAgent, SkillBenchSetup } from "../../../harness/bench-types.js";
import type { Assertion, RunResult } from "../../../harness/types.js";
import {
  assertContentIncludes,
  assertContentMatches,
  assertFileCreated,
  readGeneratedFile,
} from "../../setup-helpers/artifacts.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../../setup-helpers/budgets.js";
import {
  createSetupQualityEvaluator,
  forbiddenFabricationCriterion,
  nextRouteCriterion,
  referenceTraitCriterion,
  requiredFactCoverageCriterion,
  specificityCriterion,
} from "../../setup-helpers/quality.js";
import { assertNextCommand, assertRecommendedNextRoute } from "../../setup-helpers/routing.js";
import type { QualityCriterion } from "../../../harness/bench-types.js";

interface PackWorkflowDefinition {
  skill: string;
  pack: string;
  focus: string;
  inputs: string[];
  expectedPattern: RegExp;
  promptRequirements?: string[];
  requiredOutputPatterns?: Array<{ description: string; pattern: RegExp }>;
  forbiddenOutputPatterns?: Array<{ description: string; pattern: RegExp }>;
  retainedArtifacts?: Array<{ path: string; content: string[] }>;
  nextRoute?: string;
  nextRoutes?: Partial<Record<BenchAgent, string>>;
  forbidden?: string[];
}

const packFamilyContexts: Record<string, { id: string; facts: string[]; traits: string[] }> = {
  "alignment-loop": {
    id: "alignment-loop-context",
    facts: ["evidence", "assumption"],
    traits: ["adversarial", "scope", "decision"],
  },
  "agentic-skills-bench": {
    id: "agentic-skills-bench-context",
    facts: ["benchmark", "review"],
    traits: ["artifact", "rubric", "score"],
  },
  "alignment-page-admin": {
    id: "alignment-page-admin-context",
    facts: ["alignment", "html"],
    traits: ["archive", "gate", "upgrade"],
  },
  "interrogation-page-admin": {
    id: "interrogation-page-admin-context",
    facts: ["interrogation", "html"],
    traits: ["archive", "marker", "upgrade"],
  },
  "business-discovery": {
    id: "business-discovery-context",
    facts: ["customer", "positioning"],
    traits: ["market", "customer", "evidence"],
  },
  "customer-lifecycle": {
    id: "customer-lifecycle-context",
    facts: ["journey", "activation"],
    traits: ["onboarding", "conversion", "retention"],
  },
  "business-growth": {
    id: "business-growth-context",
    facts: ["metric", "growth"],
    traits: ["experiment", "channel", "conversion"],
  },
  "business-ops": {
    id: "business-ops-context",
    facts: ["risk", "validation"],
    traits: ["owner", "metric", "cadence"],
  },
  "code-quality": {
    id: "code-quality-context",
    facts: ["quality", "validation"],
    traits: ["regression", "test", "risk"],
  },
  "creator-foundation": {
    id: "creator-media-context",
    facts: ["evidence", "audience"],
    traits: ["creator", "platform", "provenance"],
  },
  "guided-walkthrough": {
    id: "guided-walkthrough-context",
    facts: ["journey", "evidence"],
    traits: ["tester", "checkpoint", "instructions"],
  },
  "product-design": {
    id: "product-design-context",
    facts: ["flow", "screen", "state"],
    traits: ["wireframe", "route", "prototype"],
  },
  devtool: {
    id: "devtool-context",
    facts: ["developer", "validation"],
    traits: ["install", "workflow", "adoption"],
  },
  game: {
    id: "game-context",
    facts: ["game", "player"],
    traits: ["playtest", "loop", "prototype"],
  },
  monorepo: {
    id: "monorepo-context",
    facts: ["monorepo", "validation"],
    traits: ["package", "workspace", "lane"],
  },
  "project-fleet": {
    id: "project-fleet-context",
    facts: ["project", "fleet"],
    traits: ["inventory", "repository", "staleness"],
  },
  remotion: {
    id: "remotion-context",
    facts: ["video", "script"],
    traits: ["scene", "format", "render"],
  },
  "session-analytics": {
    id: "session-analytics-context",
    facts: ["session", "history"],
    traits: ["prompt", "confidence", "backfill"],
  },
  "youtube-ops": {
    id: "youtube-ops-context",
    facts: ["youtube", "audit"],
    traits: ["channel", "video", "retention"],
  },
};

function expectedRoute(definition: PackWorkflowDefinition, agent?: BenchAgent): string | undefined {
  if (agent && definition.nextRoutes?.[agent]) {
    return definition.nextRoutes[agent];
  }
  return definition.nextRoute;
}

function qualityRoutes(definition: PackWorkflowDefinition): string | string[] | undefined {
  const routes = Object.values(definition.nextRoutes ?? {});
  if (routes.length > 0) {
    return routes;
  }
  return definition.nextRoute;
}

function createPackWorkflowSetup(definition: PackWorkflowDefinition): SkillBenchSetup {
  const outputPath = "pack-benchmark-output.md";
  const knownRoutes = Object.entries(definition.nextRoutes ?? {})
    .map(([agent, route]) => `${agent}: ${route}`)
    .join(", ");

  return {
    skill: definition.skill,
    prompt: [
      `You have the ${definition.skill} skill installed from the ${definition.pack} pack.`,
      `Use pack-input.md to write ${outputPath} with:`,
      "- the pack and skill name",
      `- ${definition.focus}`,
      ...(definition.promptRequirements ?? []),
      "- concrete local fixture evidence from pack-input.md or fixtures/local-evidence.md",
      "- risks or assumptions",
      "- a literal final handoff label accepted by the harness, such as `Recommended next skill: <command>` or `Recommended next command: <command>`",
      ...(knownRoutes ? [`- known runner-specific route for this benchmark: ${knownRoutes}`] : []),
      "Use local context only. Do not call external services, mutate git remotes, install packages, or ask follow-up questions.",
    ].join("\n"),
    perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
    timeoutMs: BENCH_TIMEOUTS_MS.standard,
    qualityEvaluator: createPackQualityEvaluator(definition),
    qualityOutputPath: outputPath,

    setupProject(workDir: string): void {
      mkdirSync(join(workDir, "fixtures"), { recursive: true });
      writeFileSync(
        join(workDir, "pack-input.md"),
        [
          `# ${definition.pack} benchmark fixture`,
          "",
          `Skill: ${definition.skill}`,
          `Focus: ${definition.focus}`,
          "",
          "## Inputs",
          ...definition.inputs.map((input) => `- ${input}`),
          "",
        ].join("\n"),
      );
      writeFileSync(
        join(workDir, "fixtures", "local-evidence.md"),
        [
          "# Local evidence",
          "",
          "This fixture is intentionally local and deterministic so pack benchmark setup coverage avoids external services.",
          "",
        ].join("\n"),
      );
      for (const artifact of definition.retainedArtifacts ?? []) {
        const artifactPath = join(workDir, artifact.path);
        mkdirSync(dirname(artifactPath), { recursive: true });
        writeFileSync(artifactPath, `${artifact.content.join("\n")}\n`);
      }
    },

    assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[] {
      const assertions: Assertion[] = [
        {
          description: "Agent command exited successfully",
          pass: result.exitCode === 0,
        },
        assertFileCreated(result, outputPath),
      ];

      const content = readGeneratedFile(result, outputPath);
      if (!content) return assertions;

      assertions.push(assertContentIncludes(content, definition.skill, "Output names the skill"));
      assertions.push(assertContentIncludes(content, definition.pack, "Output names the pack"));
      assertions.push(assertContentMatches(content, definition.expectedPattern, "Output matches pack workflow expectation"));
      for (const requiredPattern of definition.requiredOutputPatterns ?? []) {
        assertions.push(assertContentMatches(content, requiredPattern.pattern, requiredPattern.description));
      }
      for (const forbiddenPattern of definition.forbiddenOutputPatterns ?? []) {
        assertions.push({
          description: forbiddenPattern.description,
          pass: !forbiddenPattern.pattern.test(content),
          detail: forbiddenPattern.pattern.test(content)
            ? `Output matched forbidden pattern ${forbiddenPattern.pattern}`
            : undefined,
        });
      }
      assertions.push(assertNextCommand(content));
      const route = expectedRoute(definition, context?.agent);
      if (route) {
        assertions.push(assertRecommendedNextRoute(content, route));
      }

      return assertions;
    },
  };
}

function createPackQualityEvaluator(definition: PackWorkflowDefinition) {
  const familyContext = packFamilyContexts[definition.pack] ?? {
    id: "pack-family-context",
    facts: [definition.pack],
    traits: [definition.focus],
  };

  return createSetupQualityEvaluator({
    minimumScore: 0.75,
    criteria: [
      // Naming the pack + skill is dictated identity, not a derived conclusion —
      // keep it as a weak (non-critical) signal so it no longer gates purely on
      // prompt-echoed tokens.
      requiredFactCoverageCriterion({
        id: "pack-skill-context",
        description: "Names the exact pack and skill under benchmark.",
        weight: 2,
        facts: [definition.pack, definition.skill],
      }),
      // Gate on fixture *content* the agent must read (the seeded input lines),
      // not the prompt-named fixture filenames. The input lines are written only
      // into pack-input.md, never into the prompt, so this forces real reading.
      requiredFactCoverageCriterion({
        id: "pack-fixture-evidence",
        description: "Uses deterministic local fixture evidence instead of generic pack prose.",
        weight: 2,
        critical: true,
        facts: [...definition.inputs.slice(0, 2)],
      }),
      specificityCriterion({
        id: "pack-practical-risk-or-validation",
        description: "Includes a practical risk, assumption, or validation detail for the pack workflow.",
        weight: 1,
        // "evidence"/"risk" are dictated by the prompt's own requirement lines;
        // requiring a concrete validation/measurement marker instead keeps this
        // from being an always-true echo check.
        requiredAny: ["risks", "assumption", "assumptions", "validation", "validate", "metric"],
        forbiddenPhrases: ["best practices", "industry-leading", "comprehensive strategy"],
      }),
      nextRouteCriterion({
        id: "pack-next-route",
        description: "Provides a concrete next command handoff.",
        weight: 1,
        route: qualityRoutes(definition),
      }),
      requiredFactCoverageCriterion({
        id: familyContext.id,
        description: "Uses pack-family domain context tied to the benchmark fixture.",
        weight: 1,
        facts: familyContext.facts,
      }),
      referenceTraitCriterion({
        id: "pack-workflow-traits",
        description: "References practical traits expected for this pack family.",
        weight: 1,
        traits: [definition.focus, ...familyContext.traits],
      }),
      forbiddenFabricationCriterion({
        id: "no-generic-or-external-pack-overreach",
        description: "Avoids fabricated external systems and generic unsupported claims.",
        weight: 2,
        critical: true,
        forbidden: definition.forbidden ?? [
          "google analytics",
          "stripe dashboard",
          "salesforce",
          "hubspot",
          "github actions",
          "api dashboard",
          "industry-leading",
          "best-in-class",
          "proprietary data",
        ],
      }),
      ...extraPackQualityCriteria(definition),
    ],
  });
}

function extraPackQualityCriteria(definition: PackWorkflowDefinition) {
  if (definition.skill === "benchmark-agent-review") {
    return [
      benchmarkAgentReviewOwnerTargetCriterion({
        id: "benchmark-agent-review-remediation-owner-target",
        description: "Names a concrete owner target for remediation, not only broad advice.",
        weight: 2,
      }),
      benchmarkAgentReviewValidationSpecificityCriterion({
        id: "benchmark-agent-review-validation-specificity",
        description: "Includes a concrete validation check or assertion for the remediation.",
        weight: 2,
        critical: true,
      }),
      requiredFactCoverageCriterion({
        id: "benchmark-agent-review-subjective-score-separation",
        description: "Separates subjective scoring from deterministic quality context.",
        weight: 1,
        facts: [
          "subjective",
          "deterministic",
        ],
      }),
    ];
  }

  if (definition.skill === "youtube-derivative-cuts") {
    return [
      requiredFactCoverageCriterion({
        id: "youtube-derivative-cuts-candidate-handles",
        description: "Includes concrete cut handles with timestamps and duration.",
        weight: 2,
        critical: true,
        facts: [
          "00:42",
          "02:15",
          "estimated duration",
        ],
      }),
      // Not critical: "companion clip"/"Shorts" are dictated by the prompt's own
      // requirement line, so a transcriber satisfies it without doing the skill.
      // The fixture-derived gates (candidate-handles timestamps,
      // measurement-beyond-views) remain critical.
      requiredFactCoverageCriterion({
        id: "youtube-derivative-cuts-format-separation",
        description: "Separates companion clips from Shorts.",
        weight: 2,
        facts: [
          "companion clip",
          "Shorts",
        ],
      }),
      requiredFactCoverageCriterion({
        id: "youtube-derivative-cuts-measurement-beyond-views",
        description: "Measures success beyond Shorts view counts alone.",
        weight: 2,
        critical: true,
        facts: [
          "subscribers gained",
          "retention",
          "long-form spillover",
          "Shorts views alone are insufficient",
        ],
      }),
    ];
  }

  if (definition.skill !== "content-programming") {
  return [];
}

function benchmarkAgentReviewOwnerTargetCriterion(options: {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
}): QualityCriterion {
  const concreteOwnerPatterns = [
    /packs\/agentic-skills-bench\/codex\/benchmark-agent-review\/SKILL\.md/i,
    /packs\/agentic-skills-bench\/claude\/benchmark-agent-review\/SKILL\.md/i,
    /tests\/layer4\/setups\/packs\/pack-workflows\.setup\.ts/i,
    /tests\/layer1\/bench-setups\.test\.ts/i,
  ];
  const scopedOwnerPattern =
    /(owner\s+(?:target|files?|surface)|exact\s+owner\s+files?|owner)(?:\s*\/\s*(?:target|files?|surface|owner))*\s*(?::|\.|\|)[^\n]*(benchmark-agent-review|pack-workflows\.setup\.ts|bench-setups\.test\.ts)[^\n]*(lookup|confirm|exact file|owner surface)/i;

  return {
    ...options,
    evaluate(output: string) {
      const hasOwnerLabel = hasBenchmarkAgentReviewOwnerLabel(output);
      const hasConcreteOwner = concreteOwnerPatterns.some((pattern) => pattern.test(output));
      const hasScopedOwnerWithLookup = scopedOwnerPattern.test(output);
      return {
        score: hasOwnerLabel && (hasConcreteOwner || hasScopedOwnerWithLookup) ? 1 : 0,
        notes: [
          ...(hasOwnerLabel ? [] : ["missing owner target label"]),
          ...(hasConcreteOwner || hasScopedOwnerWithLookup ? [] : ["missing exact owner file or scoped owner with lookup note"]),
        ],
      };
    },
  };
}

function benchmarkAgentReviewValidationSpecificityCriterion(options: {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
}): QualityCriterion {
  const validationPattern =
    /(validation check|validation command|layer1|contract-lint|assertion|fixture|\$benchmark-test-skill benchmark-agent-review|\/benchmark-test-skill benchmark-agent-review)/i;
  const broadOnlyPattern = /\b(update the skill|rerun the fixture|tighten the rubric|make it better)\b/i;

  return {
    ...options,
    evaluate(output: string) {
      const hasValidation = validationPattern.test(output);
      const hasOwner = hasBenchmarkAgentReviewOwnerLabel(output);
      const hasBroadPhrase = broadOnlyPattern.test(output);
      const passes = hasValidation && hasOwner;
      return {
        score: passes ? 1 : 0,
        notes: [
          ...(hasValidation ? [] : ["missing concrete validation check or assertion"]),
          ...(hasOwner ? [] : ["missing remediation owner target"]),
          ...(hasBroadPhrase && !passes ? ["broad remediation phrase without concrete validation"] : []),
        ],
      };
    },
  };
}

function hasBenchmarkAgentReviewOwnerLabel(output: string): boolean {
  return [
    /\|\s*(?:exact\s+)?owner\s+(?:target|files?|surface)\s*\|/i,
    /\|\s*(?:exact\s+)?owner\s+(?:(?:target|files?|surface)\s*\/\s*)+(?:target|files?|surface|owner)\s*\|/i,
    /\b(?:exact\s+)?owner\s+(?:target|files?|surface)(?:\s*\/\s*(?:target|files?|surface|owner))*\s*:/i,
    /\bexact\s+owner\s+files?\s*\./i,
    /\bowner\s*:/i,
  ].some((pattern) => pattern.test(output));
}

  return [
    requiredFactCoverageCriterion({
      id: "content-programming-full-contract",
      description: "Covers the full programming-strategy contract, not just a calendar.",
      weight: 2,
      facts: [
        "pillar",
        "format",
        "portfolio",
        "measurement",
        "cleanup",
        "series candidate",
      ],
    }),
    requiredFactCoverageCriterion({
      id: "content-programming-fixture-strategy-facts",
      description: "Uses fixture facts for programming strategy dimensions.",
      weight: 1,
      facts: [
        "build-in-public notes",
        "implementation tradeoffs",
        "shipped artifact proof",
        "stale setup walkthroughs",
      ],
    }),
  ];
}

// Framework-subskill fixtures (journey-map, customer-discovery, competitive-analysis).
// Framework subskills never run as a cold direct call: they only execute through their
// parent orchestrator's Research Session Loop. Each fixture below therefore frames the
// agent as the parent orchestrator at State C executing one framework inline from seeded
// local evidence, and routes its final handoff back to the parent (mirroring the existing
// competitive-analysis re-entry fixture). One shared seed helper per family keeps the
// prerequisite artifacts identical across that family's frameworks.

const GLOSSARY_HEADER = [
  "# Project Glossary",
  "",
  "| Term | Definition | Source | Category | Status |",
  "| --- | --- | --- | --- | --- |",
];

function subskillPromptRequirements(parent: string, framework: string, prereqPath: string): string[] {
  return [
    `- treat this as the ${parent} orchestrator at State C executing the ${framework} framework inline (not a cold start, not a direct subskill call)`,
    `- use the retained run manifest plus ${prereqPath} as the approved framework context`,
    `- produce the ${framework} canonical artifact content from the seeded local evidence only`,
    "- do not perform a parent status audit, do not route to exec, do not emit direct frameworks/ path commands, do not call external search",
    `- end with the exact runner-specific ${parent} route listed below as the final handoff`,
  ];
}

function subskillForbiddenOutputPatterns(parent: string): Array<{ description: string; pattern: RegExp }> {
  return [
    {
      description: "Output does not route framework execution to exec",
      pattern: /Recommended next (?:skill|command):\s*(?:\$exec|\/exec)\b/i,
    },
    {
      description: "Output does not suggest direct path-shaped framework commands",
      pattern: new RegExp(String.raw`[$/]${parent}\/frameworks\/`),
    },
  ];
}

function subskillForbidden(parent: string): string[] {
  return [
    "$exec",
    "/exec",
    `${parent}/frameworks`,
    "google analytics",
    "stripe dashboard",
    "salesforce",
    "hubspot",
    "api dashboard",
    "industry-leading",
    "best-in-class",
    "proprietary data",
  ];
}

function journeyMapSeed(framework: string): Array<{ path: string; content: string[] }> {
  return [
    {
      path: "research/icp.md",
      content: [
        "# Ideal Customer Profile",
        "",
        "## Segment",
        "Two-to-five person AI-agent engineering teams shipping internal developer tools.",
        "",
        "## Firmographics",
        "Seed-stage startups, 5-30 employees, remote-first, using a shared monorepo.",
        "",
        "## Named Pains",
        "- Manual benchmark setup eats a full afternoon before any signal arrives.",
        "- Skill coverage gaps are invisible until a release breaks downstream.",
        "- Hand-offs between research and implementation lose context.",
        "",
        "## Trigger Events",
        "- A failed release traced back to an unbenchmarked skill.",
        "- Onboarding a new agent engineer who cannot find coverage status.",
        "- Quarterly planning that needs a coverage baseline.",
        "",
        "## Jobs To Be Done",
        "Reach a trustworthy coverage baseline without burning a day on fixtures.",
        "",
        "## Current Alternatives",
        "Hand-written spreadsheets, ad-hoc grep scripts, and tribal knowledge.",
        "",
        "## Buying Process",
        "Champion engineer trials locally, then shows the lead a coverage report.",
        "",
        "## Willingness To Pay",
        "Budget owner is the eng lead; pays per-seat once the baseline saves a day per cycle.",
        "",
        "## Disqualifiers",
        "Teams with no monorepo and no shared skill registry.",
      ],
    },
    {
      path: "research/_working/journey-map-run.yaml",
      content: [
        "orchestrator: journey-map",
        "state: C",
        "icp: research/icp.md",
        "selected_frameworks:",
        `  - slug: ${framework}`,
        `    intermediate: research/journey-map-${framework}.md`,
      ],
    },
    { path: "research/glossary.md", content: GLOSSARY_HEADER },
  ];
}

function customerDiscoverySeed(framework: string): Array<{ path: string; content: string[] }> {
  return [
    {
      path: "research/_working/preliminary-customer-discovery-research.md",
      content: [
        "# Preliminary Customer Discovery Research",
        "",
        "## ICP Candidate A — Solo agent-tooling maintainer",
        "- Role: Staff engineer who owns an internal skills monorepo alone.",
        "- Pain evidence: \"I lose an afternoon every release re-checking coverage by hand.\"",
        "- Accessibility: Active in two public agent-engineering Discords; reachable for interviews.",
        "- Willingness to pay: Has a discretionary tooling budget under $50/mo, no approval needed.",
        "",
        "## ICP Candidate B — Platform team lead",
        "- Role: Leads a 4-person platform team standardizing agent workflows.",
        "- Pain evidence: \"Coverage gaps surface only after a downstream break.\"",
        "- Accessibility: Reachable through a warm intro from an existing design partner.",
        "- Willingness to pay: Controls a team tooling budget; needs a coverage baseline to justify spend.",
        "",
        "## ICP Candidate C — Research-to-impl hand-off owner",
        "- Role: Tech lead bridging research artifacts into implementation.",
        "- Pain evidence: \"Context evaporates between the research doc and the PR.\"",
        "- Accessibility: Hard to reach; mostly async, responds to a shared doc comment.",
        "- Willingness to pay: Would expense a tool that demonstrably cuts hand-off rework.",
      ],
    },
    {
      path: "research/_working/customer-discovery-run.yaml",
      content: [
        "orchestrator: customer-discovery",
        "state: C",
        "preliminary: research/_working/preliminary-customer-discovery-research.md",
        "selected_frameworks:",
        `  - slug: ${framework}`,
        `    intermediate: research/customer-discovery-${framework}.md`,
      ],
    },
    { path: "research/glossary.md", content: GLOSSARY_HEADER },
  ];
}

function competitiveAnalysisSeed(framework: string): Array<{ path: string; content: string[] }> {
  return [
    {
      path: "research/_working/preliminary-competitive-analysis-research.md",
      content: [
        "# Preliminary Competitive Analysis Research",
        "",
        "## Product Summary",
        "A local-first benchmark workflow tool that flips skill coverage from blocked to custom",
        "for small AI-agent engineering teams, with deterministic offline fixtures.",
        "",
        "## Seeded Competitors",
        "### BenchHub (incumbent SaaS)",
        "- Pricing: $99/seat/mo, public pricing page.",
        "- Features: hosted dashboards, cloud runs, team analytics.",
        "- Evidence: requires cloud accounts; no offline fixtures; setup takes an afternoon.",
        "",
        "### gridcheck (open-source CLI)",
        "- Pricing: free, MIT-licensed.",
        "- Features: local CLI, manual config, no coverage matrix.",
        "- Evidence: strong local story, but no rubric grading and sparse docs.",
        "",
        "### CoverageIQ (enterprise platform)",
        "- Pricing: sales-gated, not public.",
        "- Features: governance, SSO, audit trails, heavy onboarding.",
        "- Evidence: enterprise-only; overkill for small teams; long procurement.",
      ],
    },
    {
      path: "research/_working/competitive-analysis-run.yaml",
      content: [
        "orchestrator: competitive-analysis",
        "state: C",
        "preliminary: research/_working/preliminary-competitive-analysis-research.md",
        "selected_frameworks:",
        `  - slug: ${framework}`,
        `    intermediate: research/competitive-analysis-${framework}.md`,
      ],
    },
    { path: "research/glossary.md", content: GLOSSARY_HEADER },
  ];
}

interface FrameworkSubskillSpec {
  skill: string;
  pack: string;
  parent: string;
  prereqPath: string;
  manifestEvidence: RegExp;
  seed: (framework: string) => Array<{ path: string; content: string[] }>;
  focus: string;
  frameworkLabel: string;
  inputs: string[];
  expectedPattern: RegExp;
  requiredOutputPatterns: Array<{ description: string; pattern: RegExp }>;
}

function makeFrameworkSubskillDefinition(spec: FrameworkSubskillSpec): PackWorkflowDefinition {
  return {
    skill: spec.skill,
    pack: spec.pack,
    focus: spec.focus,
    inputs: spec.inputs,
    expectedPattern: spec.expectedPattern,
    promptRequirements: subskillPromptRequirements(spec.parent, spec.frameworkLabel, spec.prereqPath),
    retainedArtifacts: spec.seed(spec.skill),
    requiredOutputPatterns: [
      {
        description: "Output executes the framework inline at State C through the parent orchestrator",
        pattern: /State C[\s\S]*(parent|orchestrator|inline)|(?:parent|orchestrator|inline)[\s\S]*State C/i,
      },
      {
        description: "Output cites the retained run manifest or seeded prerequisite evidence",
        pattern: spec.manifestEvidence,
      },
      ...spec.requiredOutputPatterns,
    ],
    forbiddenOutputPatterns: subskillForbiddenOutputPatterns(spec.parent),
    nextRoutes: { claude: `/${spec.parent}`, codex: `$${spec.parent}` },
    forbidden: subskillForbidden(spec.parent),
  };
}

const JOURNEY_MAP_MANIFEST_EVIDENCE = /journey-map-run\.yaml|research\/icp\.md/i;
const CUSTOMER_DISCOVERY_MANIFEST_EVIDENCE = /customer-discovery-run\.yaml|preliminary-customer-discovery-research\.md/i;
const COMPETITIVE_ANALYSIS_MANIFEST_EVIDENCE = /competitive-analysis-run\.yaml|preliminary-competitive-analysis-research\.md/i;

const journeyMapSubskillDefinitions: PackWorkflowDefinition[] = [
  {
    skill: "service-blueprint",
    frameworkLabel: "service blueprint",
    focus: "service blueprint with frontstage/backstage stages and operational gaps",
    inputs: [
      "State C: journey-map executing the service-blueprint framework inline",
      "Seed: research/icp.md named pains and trigger events",
      "Selected framework: service-blueprint via research/_working/journey-map-run.yaml",
    ],
    expectedPattern: /service|blueprint|stage|backstage|visibility/i,
    requiredOutputPatterns: [
      { description: "Output covers service stages and frontstage/backstage layers", pattern: /service stage|front-?stage|backstage/i },
      { description: "Output covers the line of visibility or internal interaction", pattern: /line of (visibility|internal interaction|interaction)/i },
      { description: "Output covers operational gaps", pattern: /operational gap|fail point|wait point|bottleneck/i },
    ],
  },
  {
    skill: "experience-map",
    frameworkLabel: "experience map",
    focus: "experience map with phases and thoughts/feelings/pain points",
    inputs: [
      "State C: journey-map executing the experience-map framework inline",
      "Seed: research/icp.md named pains and trigger events",
      "Selected framework: experience-map via research/_working/journey-map-run.yaml",
    ],
    expectedPattern: /experience|phase|feeling|pain|emotion/i,
    requiredOutputPatterns: [
      { description: "Output covers experience phases", pattern: /experience phase|phase/i },
      { description: "Output covers doing, thinking, and feeling", pattern: /thinking|feeling|doing/i },
      { description: "Output covers pain and delight moments", pattern: /pain (moment|point)|delight moment|emotional arc/i },
    ],
  },
  {
    skill: "user-story-map",
    frameworkLabel: "user story map",
    focus: "user story map with backbone activities and tasks",
    inputs: [
      "State C: journey-map executing the user-story-map framework inline",
      "Seed: research/icp.md jobs-to-be-done and named pains",
      "Selected framework: user-story-map via research/_working/journey-map-run.yaml",
    ],
    expectedPattern: /story|backbone|activity|task|release/i,
    requiredOutputPatterns: [
      { description: "Output covers the activity backbone", pattern: /activity backbone|backbone/i },
      { description: "Output covers activities, tasks, and stories", pattern: /task|user story|as a .*i want/i },
      { description: "Output covers release slicing", pattern: /release (slic|1|2)|walking skeleton/i },
    ],
  },
  {
    skill: "jtbd-timeline",
    frameworkLabel: "JTBD timeline",
    focus: "time-ordered JTBD switching timeline with the four forces",
    inputs: [
      "State C: journey-map executing the jtbd-timeline framework inline",
      "Seed: research/icp.md trigger events and current alternatives",
      "Selected framework: jtbd-timeline via research/_working/journey-map-run.yaml",
    ],
    expectedPattern: /timeline|switching|job|force|deciding/i,
    requiredOutputPatterns: [
      { description: "Output covers the time-ordered switching timeline", pattern: /switching timeline|first thought|passive looking|active looking|deciding/i },
      { description: "Output covers the four forces", pattern: /push|pull|anxiety|habit/i },
      { description: "Output covers hiring criteria and jobs", pattern: /hiring criteria|functional job|social job|emotional job/i },
    ],
  },
  {
    skill: "customer-journey-canvas",
    frameworkLabel: "customer journey canvas",
    focus: "customer journey canvas with stages, touchpoints, emotion, and opportunities",
    inputs: [
      "State C: journey-map executing the customer-journey-canvas framework inline",
      "Seed: research/icp.md named pains and trigger events",
      "Selected framework: customer-journey-canvas via research/_working/journey-map-run.yaml",
    ],
    expectedPattern: /canvas|stage|touchpoint|emotion|opportunit/i,
    requiredOutputPatterns: [
      { description: "Output covers journey canvas stages and touchpoints", pattern: /journey canvas|stage|touchpoint/i },
      { description: "Output covers customer actions and emotion", pattern: /customer action|emotion/i },
      { description: "Output covers pain points and opportunities", pattern: /pain point|opportunit/i },
    ],
  },
].map((spec) =>
  makeFrameworkSubskillDefinition({
    ...spec,
    pack: "customer-lifecycle",
    parent: "journey-map",
    prereqPath: "research/icp.md",
    manifestEvidence: JOURNEY_MAP_MANIFEST_EVIDENCE,
    seed: journeyMapSeed,
  }),
);

const customerDiscoverySubskillDefinitions: PackWorkflowDefinition[] = [
  {
    skill: "jtbd-needs",
    frameworkLabel: "JTBD needs",
    focus: "JTBD needs with functional/social/emotional jobs and Ulwick outcome statements",
    inputs: [
      "State C: customer-discovery executing the jtbd-needs framework inline",
      "Seed: preliminary ICP candidates A-C with pain evidence",
      "Selected framework: jtbd-needs via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /job|outcome|opportunity|importance|satisfaction/i,
    requiredOutputPatterns: [
      { description: "Output covers functional, social, and emotional jobs", pattern: /functional job|social|emotional job/i },
      { description: "Output covers Ulwick desired-outcome statements", pattern: /desired outcome|outcome statement/i },
      { description: "Output covers opportunity scores with importance and satisfaction", pattern: /opportunity score|importance|satisfaction|underserved|overserved/i },
    ],
  },
  {
    skill: "w3-hypothesis",
    frameworkLabel: "W3 hypothesis",
    focus: "who/what/why hypotheses with disproval evidence",
    inputs: [
      "State C: customer-discovery executing the w3-hypothesis framework inline",
      "Seed: preliminary ICP candidates A-C with pain evidence",
      "Selected framework: w3-hypothesis via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /who|what|why|hypothesis|disproval/i,
    requiredOutputPatterns: [
      { description: "Output covers who/what/why hypotheses", pattern: /who[\s\S]*what[\s\S]*why|who hypothesis/i },
      { description: "Output covers disproval and falsification evidence", pattern: /disproval|falsif|evidence (for|against)/i },
    ],
  },
  {
    skill: "four-forces",
    frameworkLabel: "four forces",
    focus: "four forces of progress (push/pull/anxiety/habit) with net switching momentum",
    inputs: [
      "State C: customer-discovery executing the four-forces framework inline",
      "Seed: preliminary ICP candidates A-C with pain evidence",
      "Selected framework: four-forces via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /push|pull|anxiety|habit|switching/i,
    requiredOutputPatterns: [
      { description: "Output covers push, pull, anxiety, and habit forces", pattern: /push|pull|anxiety|habit/i },
      { description: "Output covers net switching momentum or force balance", pattern: /force balance|switching momentum|switching catalyst/i },
    ],
  },
  {
    skill: "five-rings",
    frameworkLabel: "five rings of buying insight",
    focus: "five rings of buying insight with buyer persona correlation",
    inputs: [
      "State C: customer-discovery executing the five-rings framework inline",
      "Seed: preliminary ICP candidates A-C with buying-process evidence",
      "Selected framework: five-rings via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /priority|success factor|barrier|decision criteria|buyer/i,
    requiredOutputPatterns: [
      { description: "Output covers the five rings of buying insight", pattern: /priority initiative|success factor|perceived barrier|decision criteria|buyer'?s journey/i },
      { description: "Output covers buyer persona correlation", pattern: /buyer persona|champion|influencer|decision-?maker|end-?user|blocker/i },
    ],
  },
  {
    skill: "seven-dimensions",
    frameworkLabel: "seven dimensions of customer fit",
    focus: "seven dimensions of customer fit with composite score and archetype",
    inputs: [
      "State C: customer-discovery executing the seven-dimensions framework inline",
      "Seed: preliminary ICP candidates A-C with accessibility and WTP evidence",
      "Selected framework: seven-dimensions via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /readiness|willingness|ability|acquisition|advocacy/i,
    requiredOutputPatterns: [
      { description: "Output covers the seven fitness dimensions", pattern: /readiness|willingness|ability|acquisition efficiency|ascension potential|advocacy potential/i },
      { description: "Output covers the composite fitness score and archetype", pattern: /composite|archetype|dimension cluster/i },
    ],
  },
  {
    skill: "pmf-engine",
    frameworkLabel: "PMF engine",
    focus: "PMF engine with the Sean Ellis signal and high-expectation-customer value wedge",
    inputs: [
      "State C: customer-discovery executing the pmf-engine framework inline",
      "Seed: preliminary ICP candidates A-C with WTP and pain evidence",
      "Selected framework: pmf-engine via research/_working/customer-discovery-run.yaml",
    ],
    expectedPattern: /pmf|disappointed|signal|wedge|expectation/i,
    requiredOutputPatterns: [
      { description: "Output covers the Sean Ellis very-disappointed signal", pattern: /very disappointed|sean ellis|40%|pmf signal/i },
      { description: "Output covers high-expectation customers and the value wedge", pattern: /high-?expectation customer|hxc|value wedge|loved benefit/i },
    ],
  },
].map((spec) =>
  makeFrameworkSubskillDefinition({
    ...spec,
    pack: "business-discovery",
    parent: "customer-discovery",
    prereqPath: "research/_working/preliminary-customer-discovery-research.md",
    manifestEvidence: CUSTOMER_DISCOVERY_MANIFEST_EVIDENCE,
    seed: customerDiscoverySeed,
  }),
);

const competitiveAnalysisSubskillDefinitions: PackWorkflowDefinition[] = [
  {
    skill: "swot",
    frameworkLabel: "SWOT",
    focus: "SWOT quadrants with strategic tensions",
    inputs: [
      "State C: competitive-analysis executing the swot framework inline",
      "Seed: seeded competitors BenchHub, gridcheck, CoverageIQ with evidence",
      "Selected framework: swot via research/_working/competitive-analysis-run.yaml",
    ],
    expectedPattern: /strength|weakness|opportunity|threat|tension/i,
    requiredOutputPatterns: [
      { description: "Output covers the SWOT quadrants", pattern: /strength[\s\S]*weakness|opportunit[\s\S]*threat|swot matrix/i },
      { description: "Output covers strategic tensions", pattern: /strategic tension|synthesis implication/i },
    ],
  },
  {
    skill: "porter-five-forces",
    frameworkLabel: "Porter's Five Forces",
    focus: "Porter's Five Forces with rivalry, entrants, substitutes, buyer and supplier power",
    inputs: [
      "State C: competitive-analysis executing the porter-five-forces framework inline",
      "Seed: seeded competitors BenchHub, gridcheck, CoverageIQ with evidence",
      "Selected framework: porter-five-forces via research/_working/competitive-analysis-run.yaml",
    ],
    expectedPattern: /rivalry|entrant|substitute|buyer power|supplier power/i,
    requiredOutputPatterns: [
      { description: "Output covers competitive rivalry", pattern: /rivalry/i },
      { description: "Output covers new entrants and substitutes", pattern: /new entrant|entrant|substitut/i },
      { description: "Output covers buyer and supplier power", pattern: /buyer power|supplier power/i },
    ],
  },
  {
    skill: "strategic-group-map",
    frameworkLabel: "strategic group map",
    focus: "strategic groups with axis dimensions and mobility barriers",
    inputs: [
      "State C: competitive-analysis executing the strategic-group-map framework inline",
      "Seed: seeded competitors BenchHub, gridcheck, CoverageIQ with evidence",
      "Selected framework: strategic-group-map via research/_working/competitive-analysis-run.yaml",
    ],
    expectedPattern: /strategic group|axis|mobility|whitespace/i,
    requiredOutputPatterns: [
      { description: "Output covers strategic groups and axis dimensions", pattern: /strategic group|axis (selection|1|2)/i },
      { description: "Output covers mobility barriers or whitespace", pattern: /mobility barrier|whitespace|crowded zone/i },
    ],
  },
  {
    skill: "feature-pricing-matrix",
    frameworkLabel: "feature and pricing matrix",
    focus: "feature x competitor matrix with pricing tiers",
    inputs: [
      "State C: competitive-analysis executing the feature-pricing-matrix framework inline",
      "Seed: seeded competitors BenchHub, gridcheck, CoverageIQ with pricing evidence",
      "Selected framework: feature-pricing-matrix via research/_working/competitive-analysis-run.yaml",
    ],
    expectedPattern: /feature|matrix|pricing|tier|competitor/i,
    requiredOutputPatterns: [
      { description: "Output covers a feature by competitor matrix", pattern: /competitor matrix|core feature|integration/i },
      { description: "Output covers pricing models or tiers", pattern: /pricing (model|tier)|public price/i },
    ],
  },
].map((spec) =>
  makeFrameworkSubskillDefinition({
    ...spec,
    pack: "business-discovery",
    parent: "competitive-analysis",
    prereqPath: "research/_working/preliminary-competitive-analysis-research.md",
    manifestEvidence: COMPETITIVE_ANALYSIS_MANIFEST_EVIDENCE,
    seed: competitiveAnalysisSeed,
  }),
);

const packWorkflowDefinitions: PackWorkflowDefinition[] = [
  ...journeyMapSubskillDefinitions,
  ...customerDiscoverySubskillDefinitions,
  ...competitiveAnalysisSubskillDefinitions,
  {
    skill: "assumption-tracker",
    pack: "business-ops",
    focus: "assumption inventory with owner and validation cadence",
    inputs: ["Pricing assumption is unvalidated and gates the revenue model", "Onboarding conversion assumption is unknown but has a manual workaround"],
    expectedPattern: /assumption|validation|owner/i,
    // Derived, not echoed: the pricing assumption gates revenue with no workaround,
    // so it must be validated first. The fixture states the two assumptions; only a
    // real ranking picks which to test first.
    requiredOutputPatterns: [
      {
        description: "Output validates the revenue-gating pricing assumption first (prioritization the fixture never states)",
        pattern: /(validate|test|prioriti\w+|tackle|address)[\s\S]{0,50}pricing[\s\S]{0,40}(first|before|p0|top|highest)|pricing[\s\S]{0,30}(first|highest priority|p0|top priority|validate first)/i,
      },
    ],
  },
  {
    skill: "upgrade-alignment-pages",
    pack: "alignment-page-admin",
    focus: "dry-run drift audit for generated alignment HTML and explicit apply safeguards",
    inputs: [
      "alignment/legacy-review.html lacks feedback-only YAML and copy fallback behavior",
      "alignment/index.html must be excluded from upgrades",
      "Apply mode must archive originals before replacement",
    ],
    expectedPattern: /alignment|html|archive|upgrade|dry-run/i,
    requiredOutputPatterns: [
      { description: "Output keeps audit mode non-mutating", pattern: /dry-run|audit|no mutation|without mutating/i },
      { description: "Output names archive-before-replace behavior", pattern: /archive|docs\/history\/archive/i },
    ],
    nextRoutes: { claude: "/compile-central-alignment", codex: "$compile-central-alignment" },
  },
  {
    skill: "upgrade-interrogation-pages",
    pack: "interrogation-page-admin",
    focus: "dry-run drift audit for generated interrogation HTML round pages and explicit apply safeguards",
    inputs: [
      "interrogation/idea-scope-brief-r1-checkout.html lacks hidden data-agent-recommended-answer and data-agent-confidence markers",
      "Round filenames and data-answer-sidecar paths must be preserved on rewrite",
      "Apply mode must archive originals before replacement",
    ],
    expectedPattern: /interrogation|html|archive|upgrade|dry-run/i,
    requiredOutputPatterns: [
      { description: "Output keeps audit mode non-mutating", pattern: /dry-run|audit|no mutation|without mutating/i },
      { description: "Output names archive-before-replace behavior", pattern: /archive|docs\/history\/archive/i },
    ],
    nextRoutes: { claude: "node scripts/audit-interrogation-pages.mjs", codex: "node scripts/audit-interrogation-pages.mjs" },
  },
  {
    skill: "benchmark-agent-review",
    pack: "agentic-skills-bench",
    focus: "subjective quality review",
    inputs: [
      "ship-manifest.md",
      "residual-risk awareness",
      "Hard assertions: 100%",
      "Deterministic quality score: 78.6%",
      "Reviewed output: ship-manifest.md is compliant but lacks residual-risk awareness",
      "Reviewer concern: do not judge benchmark laxness as the primary issue",
    ],
    expectedPattern: /output|quality|review|score/i,
    promptRequirements: [
      "- include a remediation-ready handoff for the residual-risk-awareness output-quality gap",
      "- inspect retained artifact text in ship-manifest.md directly before grading the output",
      "- name the owner target, proposed behavior change, and validation check for every material remediation finding",
      "- name exact owner files when known, including packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md, packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md, or tests/layer4/setups/packs/pack-workflows.setup.ts when the remediation owns the harness",
      "- use the exact runner-specific targeted-skill-builder route listed below as the final handoff",
    ],
    retainedArtifacts: [
      {
        path: "ship-manifest.md",
        content: [
          "# Ship Manifest",
          "",
          "## Shipped",
          "- Route prompt alignment for benchmark-agent-review was merged.",
          "- Deterministic route assertions now pass for Claude and Codex.",
          "",
          "## Verification",
          "- Layer1 route checks passed.",
          "- One Codex smoke benchmark passed after the route fix.",
          "",
          "## Residual Risks",
          "- Not captured.",
          "",
          "## Post-Ship Monitoring",
          "- Not specified.",
          "",
          "## Known Unknowns",
          "- Whether future subjective reviews can inspect the actual artifact text is not documented.",
        ],
      },
    ],
    requiredOutputPatterns: [
      {
        description: "Output cites retained ship-manifest.md evidence",
        pattern: /ship-manifest\.md[\s\S]*(Residual Risks|Post-Ship Monitoring|Known Unknowns|Not captured|Not specified)/i,
      },
      {
        description: "Output includes remediation owner target and validation check",
        pattern: /(owner target|owner file|owner surface|owner|target)[\s\S]*(validation check|validation command|contract-lint|layer1|fixture|assertion)/i,
      },
    ],
    nextRoutes: {
      claude: "/targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap",
      codex: "$targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap",
    },
    forbidden: ["google analytics", "stripe dashboard", "salesforce", "hubspot", "api dashboard", "industry-leading", "best-in-class", "proprietary data"],
  },
  {
    skill: "burn-rate",
    pack: "business-ops",
    focus: "runway and burn-rate analysis",
    inputs: ["Cash: 120000", "Monthly burn: 18000"],
    expectedPattern: /burn|runway|cash/i,
    // Derived, not echoed: 120000 / 18000 ≈ 6.7 months of runway. The prompt
    // never states the answer; a transcriber cannot satisfy this.
    requiredOutputPatterns: [
      { description: "Output states the derived runway (~6-7 months) from cash/burn", pattern: /\b(?:6|7|6\.\d+|6\s*(?:to|-|–|and)\s*7)\s*months?\b/i },
    ],
  },
  {
    skill: "clone-spec-store",
    pack: "project-fleet",
    focus: "spec-store clone plan without network execution",
    inputs: ["Spec store URL is unavailable in benchmark", "Need local checklist"],
    expectedPattern: /clone|spec|store/i,
    // Derived, not echoed: with the URL unavailable the clone is blocked, so the plan
    // is to defer the clone and stage an offline checklist to run when network
    // returns. The fixture states the constraint; only the plan concludes the deferral.
    requiredOutputPatterns: [
      {
        description: "Output concludes to defer the blocked clone / stage an offline checklist, not just restating the constraint",
        pattern: /defer\w*[\s\S]{0,30}(clone|fetch|network)|offline[- ]?(?:first|only|mode)|cannot clone|clone (?:is )?blocked|stage (?:a|the) (?:local )?checklist (?:for|to run|until|offline)/i,
      },
    ],
  },
  {
    skill: "category-design",
    pack: "business-discovery",
    focus: "category diagnosis and POV development",
    inputs: ["Existing categories underserve the target segment", "Competitors frame the problem too narrowly"],
    expectedPattern: /category|positioning|pov|market/i,
    // Derived, not echoed: given that existing categories underserve and competitors
    // frame too narrowly, the conclusion is to reframe/create a new category with a
    // contrastive POV. The prompt states the gaps, never the resolution.
    requiredOutputPatterns: [
      {
        description: "Output reframes or creates a category (contrastive POV), not just naming the gaps",
        pattern: /(reframe\w*|redefin\w+|new category|category creation|create (?:a|the) category|different point of view|point of view[\s\S]{0,40}(?:unlike|instead|different)|unlike[\s\S]{0,40}(?:categor|competitor|narrow))/i,
      },
    ],
  },
  {
    skill: "cohort-review",
    pack: "business-ops",
    focus: "cohort retention and activation review",
    inputs: ["Week 1 activation: 42%", "Week 4 retained: 18%"],
    expectedPattern: /cohort|retention|activation/i,
    // Derived, not echoed: the fixture seeds W1=42% and W4=18%; a real review
    // states the drop (≈24pp) or the ~43% W4/W1 retention ratio. A transcriber
    // that copies both rates never computes the delta.
    requiredOutputPatterns: [
      {
        description: "Output derives the W1→W4 retention drop (≈24pp / ~43% retained), not just the echoed rates",
        pattern: /\b2[345]\s*(?:pp|percentage[- ]?points?|points?)\b|4[0-4]\s*%?\s*(?:retained|retention)|(?:42|18)\s*%?\s*(?:to|→|->|down to|dropping to)\s*(?:18|42)\s*%?|retention (?:drop|decline|cliff|falls?|fell)/i,
      },
    ],
  },
  {
    skill: "competitive-analysis",
    pack: "business-discovery",
    focus: "re-entry routing from approved framework state to the next pending framework",
    inputs: [
      "Parent invocation: competitive-analysis is invoked again after selection approval",
      "Porter's Five Forces is complete and has a canonical intermediate",
      "SWOT is selected but unchecked and pending",
      "Legacy tasks/todo.md still contains an approved Competitive Analysis Framework Execution queue",
    ],
    expectedPattern: /swot|pending|framework|re-entry|State C/i,
    promptRequirements: [
      "- treat this as a repeated parent competitive-analysis invocation, not a cold start",
      "- use the retained run manifest and legacy tasks/todo.md queue as compatibility evidence",
      "- route into the parent-owned SWOT framework execution path as the first pending framework",
      "- say the framework should run inline through the competitive-analysis parent orchestrator",
      "- do not perform a parent status audit, do not route to exec, and do not suggest direct path-shaped framework commands",
      "- use the exact runner-specific competitive-analysis route listed below as the final handoff",
    ],
    retainedArtifacts: [
      {
        path: "research/_working/competitive-analysis-run.yaml",
        content: [
          "orchestrator: competitive-analysis",
          "selected_frameworks:",
          "  - slug: porter-five-forces",
          "    intermediate: research/competitive-analysis-porter-five-forces.md",
          "  - slug: swot",
          "    intermediate: research/competitive-analysis-swot.md",
        ],
      },
      {
        path: "research/competitive-analysis-porter-five-forces.md",
        content: [
          "# Porter's Five Forces",
          "",
          "Approved framework intermediate for the already-complete first framework.",
        ],
      },
      {
        path: "tasks/todo.md",
        content: [
          "## Competitive Analysis Framework Execution",
          "",
          "Approved framework queue from the previous orchestrator version.",
          "",
          "- [x] Run Porter's Five Forces through the competitive-analysis parent orchestrator.",
          "- [ ] Run SWOT through the competitive-analysis parent orchestrator.",
        ],
      },
    ],
    requiredOutputPatterns: [
      {
        description: "Output identifies SWOT as the first pending framework",
        pattern: /(first pending|next pending|pending framework)[\s\S]*SWOT|SWOT[\s\S]*(first pending|next pending|pending framework)/i,
      },
      {
        description: "Output routes through State C parent-owned inline framework execution",
        pattern: /State C[\s\S]*(parent|orchestrator|inline)|(?:parent|orchestrator|inline)[\s\S]*State C/i,
      },
      {
        description: "Output uses retained re-entry evidence",
        pattern: /competitive-analysis-run\.yaml|Competitive Analysis Framework Execution|tasks\/todo\.md/i,
      },
    ],
    forbiddenOutputPatterns: [
      {
        description: "Output does not hand off to a parent status audit",
        pattern: /Recommended next (?:skill|command):[^\n]*(?:status audit|audit status|parent audit)/i,
      },
      {
        description: "Output does not route framework execution to exec",
        pattern: /Recommended next (?:skill|command):\s*(?:\$exec|\/exec)\b/i,
      },
      {
        description: "Output does not suggest direct path-shaped framework commands",
        pattern: /[$/]competitive-analysis\/frameworks\//,
      },
    ],
    nextRoutes: {
      claude: "/competitive-analysis",
      codex: "$competitive-analysis",
    },
    forbidden: [
      "status audit",
      "$exec",
      "/exec",
      "competitive-analysis/frameworks",
      "google analytics",
      "stripe dashboard",
      "salesforce",
      "hubspot",
      "api dashboard",
      "industry-leading",
      "best-in-class",
      "proprietary data",
    ],
  },
  {
    skill: "eval-ideas",
    pack: "product-design",
    focus: "re-entry routing from a recorded idea selection to the next pending feature-interview",
    inputs: [
      "Parent invocation: eval-ideas is invoked again after the multi-select idea gate was approved",
      "Idea inline-pr-comments already has a written feature-interview log (done)",
      "Idea batch-export is selected but has no interview log yet and is pending",
      "The run manifest tasks/_working/eval-ideas-run.yaml records both selected ideas",
    ],
    expectedPattern: /batch-export|pending|feature-interview|re-entry|State C/i,
    promptRequirements: [
      "- treat this as a repeated parent eval-ideas invocation, not a cold start",
      "- use the retained run manifest tasks/_working/eval-ideas-run.yaml as the selection evidence",
      "- identify batch-export as the next pending idea (its interview log does not yet exist)",
      "- run the next /feature-interview inline through the eval-ideas parent (State C), not as a separate user invocation",
      "- do not write a spec directly, do not route to roadmap while ideas remain pending, and do not perform a parent status audit",
      "- use the exact runner-specific eval-ideas route listed below as the final handoff",
    ],
    retainedArtifacts: [
      {
        path: "tasks/_working/eval-ideas-run.yaml",
        content: [
          "orchestrator: eval-ideas",
          "source: alignment/brainstorm-export.html",
          "selected_ideas:",
          "  - id: idea-1",
          "    topic: inline-pr-comments",
          "    interview_log: specs/inline-pr-comments-feature-interview.md",
          "  - id: idea-2",
          "    topic: batch-export",
          "    interview_log: specs/batch-export-feature-interview.md",
        ],
      },
      {
        path: "specs/inline-pr-comments-feature-interview.md",
        content: [
          "# Feature Interview — inline-pr-comments",
          "",
          "Completed interview log for the first selected idea; marks it done for pending detection.",
        ],
      },
    ],
    requiredOutputPatterns: [
      {
        description: "Output identifies batch-export as the next pending idea",
        pattern: /(first pending|next pending|pending idea)[\s\S]*batch-export|batch-export[\s\S]*(first pending|next pending|pending idea)/i,
      },
      {
        description: "Output routes through State C parent-owned inline feature-interview",
        pattern: /State C[\s\S]*(parent|orchestrator|inline)|(?:parent|orchestrator|inline)[\s\S]*State C/i,
      },
      {
        description: "Output uses retained re-entry evidence",
        pattern: /eval-ideas-run\.yaml/i,
      },
    ],
    forbiddenOutputPatterns: [
      {
        description: "Output does not hand off to roadmap while ideas remain pending",
        pattern: /Recommended next (?:skill|command):[^\n]*roadmap/i,
      },
      {
        description: "Output does not route interview execution to exec",
        pattern: /Recommended next (?:skill|command):\s*(?:\$exec|\/exec)\b/i,
      },
      {
        description: "Output does not suggest a path-shaped child command",
        pattern: /[$/]eval-ideas\//,
      },
    ],
    nextRoutes: {
      claude: "/eval-ideas",
      codex: "$eval-ideas",
    },
    forbidden: [
      "status audit",
      "$exec",
      "/exec",
      "eval-ideas/",
      "google analytics",
      "stripe dashboard",
      "salesforce",
      "hubspot",
      "api dashboard",
      "industry-leading",
      "best-in-class",
      "proprietary data",
    ],
  },
  {
    skill: "content-programming",
    pack: "creator-foundation",
    focus: "creator content programming strategy",
    inputs: [
      "Audience wants practical build notes",
      "Cadence target: weekly",
      "Pillars: build-in-public notes, implementation tradeoffs, shipped artifact proof",
      "Formats: build note, decision log, demo walkthrough, monthly retro",
      "Portfolio balance: acquisition, trust, proof, education, retention",
      "Measurement: cadence completion, evidence coverage, artifact readiness, series handoff readiness",
      "Cleanup target: stale setup walkthroughs",
      "Next series candidate: local-first benchmark workflow",
    ],
    promptRequirements: [
      "- durable pillars with audience jobs",
      "- recurring formats mapped to roles",
      "- cadence and production constraints",
      "- portfolio balance across acquisition, trust, proof, education, and retention",
      "- measurement plan with warning signs",
      "- cleanup or refactor plan for stale content",
      "- next series candidates to specify",
    ],
    requiredOutputPatterns: [
      { description: "Output covers durable pillars", pattern: /pillar/i },
      { description: "Output covers recurring formats", pattern: /format/i },
      { description: "Output covers portfolio balance", pattern: /portfolio|acquisition|trust|proof|education|retention/i },
      { description: "Output covers measurement plan", pattern: /measurement|metric|warning sign/i },
      { description: "Output covers cleanup or refactor plan", pattern: /cleanup|refactor|stale/i },
      { description: "Output covers next series candidates", pattern: /series candidate|next series/i },
    ],
    expectedPattern: /programming|pillar|format|measurement|series/i,
    nextRoutes: { claude: "/series-spec", codex: "$series-spec" },
  },
  {
    skill: "creator-evidence-schema",
    pack: "creator-foundation",
    focus: "evidence schema fields and provenance",
    inputs: ["YouTube export", "LinkedIn manual snapshot"],
    expectedPattern: /evidence|schema|provenance/i,
    // Derived, not echoed: because one source is an automated export and the other a
    // manual snapshot, the schema needs a capture-method field and must flag the
    // manual data as lower-confidence. The fixture names the two sources; only the
    // schema derives the provenance-quality distinction.
    requiredOutputPatterns: [
      {
        description: "Output adds a capture-method/confidence field flagging the manual source as lower-confidence, not just naming sources",
        pattern: /capture[- ]?method|source[- ]?type field|provenance[\s\S]{0,20}field|confidence[\s\S]{0,30}(rating|level|score|field)|manual[\s\S]{0,35}(lower[- ]?confidence|less reliable|flag|verify|unverified)/i,
      },
    ],
  },
  {
    skill: "creator-metrics-review",
    pack: "creator-foundation",
    focus: "creator metrics interpretation",
    inputs: ["CTR: 4.5%", "Average view duration: 38%"],
    expectedPattern: /metrics|ctr|duration/i,
    // Derived, not echoed: interpreting 4.5% CTR / 38% AVD against norms yields a
    // qualitative verdict (e.g. CTR solid, AVD weak/retention drop-off). The
    // prompt states the raw rates; a transcriber never judges them.
    requiredOutputPatterns: [
      {
        description: "Output gives a qualitative verdict tied to the metrics, not just the raw numbers",
        pattern: /(?:4\.5\s*%|CTR|click-?through)[\s\S]{0,45}(?:healthy|solid|decent|above|below|strong|weak|good|low|high|underperform\w*|benchmark)|(?:38\s*%|AVD|average view duration|watch time|retention)[\s\S]{0,45}(?:low|weak|below|short|needs? (?:work|improvement)|underperform\w*|drop-?off|concern\w*|thin)/i,
      },
    ],
  },
  {
    skill: "creator-platform-capability-matrix",
    pack: "creator-foundation",
    focus: "platform capability matrix",
    inputs: ["YouTube analytics available", "LinkedIn export manual"],
    expectedPattern: /platform|capability|matrix/i,
    // Derived, not echoed: YouTube has automated analytics while LinkedIn is
    // manual-only, so LinkedIn measurement is the capability gap / blind spot. The
    // fixture states each platform's capability; only the matrix names the gap.
    requiredOutputPatterns: [
      {
        description: "Output names the LinkedIn measurement gap / blind spot, not just each platform's capability",
        pattern: /(?:capability )?gap[\s\S]{0,35}(linkedin|manual|measurement|analytics)|linkedin[\s\S]{0,35}(gap|blind spot|manual[- ]only|no analytics|cannot measure|can'?t measure|unmeasured)|blind spot/i,
      },
    ],
  },
  {
    skill: "creator-positioning",
    pack: "creator-foundation",
    focus: "creator positioning statement",
    inputs: ["Audience: agentic engineers", "Differentiator: workflow library"],
    expectedPattern: /positioning|audience|differentiator/i,
    // Derived, not echoed: the statement must produce a contrastive "unlike generic
    // tutorials/content" clause the fixture never phrases. A transcriber lists the
    // audience and differentiator without framing the contrast.
    requiredOutputPatterns: [
      {
        description: "Output produces a contrastive 'unlike generic content' framing, not just naming audience/differentiator",
        pattern: /\bunlike\b[\s\S]{0,45}(generic|tutorial|content|influencer|advice|creator)|(?:instead of|rather than|not (?:just )?(?:another|generic|yet another))[\s\S]{0,45}(tutorial|content|advice|influencer|creator)/i,
      },
    ],
  },
  {
    skill: "creator-presence-dossier",
    pack: "creator-foundation",
    focus: "presence dossier from local evidence",
    inputs: ["Website bio", "Repository proof"],
    expectedPattern: /presence|dossier|evidence/i,
    // Derived, not echoed: the repository is the strongest credibility anchor while
    // audience metrics are a missing signal. The fixture names the evidence; only the
    // dossier judges which anchors credibility and what's absent.
    requiredOutputPatterns: [
      {
        description: "Output judges the repository as the strongest credibility anchor and flags missing audience metrics",
        pattern: /credibility anchor|strongest\s+(?:signal|proof|evidence|credential)|(?:missing|absent|no|lacks?)\b[\s\S]{0,30}(audience metric|follower|reach|distribution|engagement)|repository[\s\S]{0,25}(anchor|strongest|credential)/i,
      },
    ],
  },
  {
    skill: "customer-feedback",
    pack: "business-discovery",
    focus: "customer feedback synthesis",
    inputs: ["12 users ask for faster setup", "3 users mention vague docs", "1 user wants dark mode"],
    expectedPattern: /feedback|customer|theme/i,
    // Derived, not echoed: by frequency, faster setup (12 mentions) is the top theme
    // to prioritize. The fixture states the counts; only synthesis ranks the theme.
    requiredOutputPatterns: [
      {
        description: "Output ranks faster setup as the top theme by frequency, not just listing feedback",
        pattern: /(top|#1|most (?:requested|common|frequent)|highest[- ]?priority|dominant|leading)\s+(?:theme|request|priority|issue)|(?:faster )?setup[\s\S]{0,30}(top|#1|most requested|highest priority|prioriti\w+)|prioriti\w+[\s\S]{0,30}setup/i,
      },
    ],
  },
  {
    skill: "destination-doc",
    pack: "alignment-loop",
    focus: "destination document for desired state",
    inputs: ["Current: manual coverage checks, no dashboard", "Target: one-command coverage report shipped in two weeks"],
    expectedPattern: /destination|current|target/i,
    // Derived, not echoed: the gap/delta between current and target is automating the
    // manual checks into the one-command report. The fixture states both states; only
    // the doc names the gap to close.
    requiredOutputPatterns: [
      {
        description: "Output names the current→target gap/delta (automate into the report), not just restating both states",
        pattern: /gap[\s\S]{0,45}(build|automat\w+|dashboard|report|one[- ]command|close)|\bthe delta\b|bridge[\s\S]{0,30}(gap|current|target)|need to (?:build|automate|close)/i,
      },
    ],
  },
  {
    skill: "devtool-adoption",
    pack: "devtool",
    focus: "developer adoption motion",
    inputs: ["Install to first successful run takes 25 minutes", "18 of those minutes are spent on manual API-key setup"],
    expectedPattern: /adoption|developer|friction/i,
    // Derived, not echoed: API-key setup is 18 of the 25 minutes, so it is the
    // dominant friction step to automate/cut. The fixture states the timings; only the
    // adoption analysis names the step to remove.
    requiredOutputPatterns: [
      {
        description: "Output targets automating/cutting the API-key step as the dominant friction, not just the timings",
        pattern: /api[- ]?key[\s\S]{0,35}(cut|automat\w+|eliminat\w+|remove|reduce|prefill|skip)|(cut|automat\w+|eliminat\w+|reduce|remove|skip)[\s\S]{0,35}(api[- ]?key|key setup)|(?:biggest|dominant|main|primary)\s+friction[\s\S]{0,30}(key|setup|install)/i,
      },
    ],
  },
  {
    skill: "devtool-docs-audit",
    pack: "devtool",
    focus: "developer documentation audit",
    inputs: ["Quickstart has no 'verify it worked' step (blocks every new user)", "A few API examples are outdated (hit rarely)"],
    expectedPattern: /docs|quickstart|audit/i,
    // Derived, not echoed: the missing quickstart verification step blocks every new
    // user, so it is the highest-priority fix ahead of the rarely-hit examples. The
    // fixture lists both; only the audit ranks the priority.
    requiredOutputPatterns: [
      {
        description: "Output ranks the quickstart verification step as the highest-priority fix, not just listing issues",
        pattern: /quickstart[\s\S]{0,40}(first|highest[- ]?priority|top priority|before|#1)|(first|highest[- ]?priority|top priority|fix first|#1)[\s\S]{0,40}(quickstart|verif)|verif\w+ step[\s\S]{0,25}(first|priority)/i,
      },
    ],
  },
  {
    skill: "devtool-dx-journey",
    pack: "devtool",
    focus: "developer experience journey map",
    inputs: ["Discovery: clear", "Install: one command", "First integration: users spend ~30 min wiring auth before success"],
    expectedPattern: /journey|developer|install/i,
    // Derived, not echoed: the first-integration step (30 min wiring auth) is the DX
    // drop-off / bottleneck, while discovery and install are smooth. The fixture
    // states each stage; only the map names the worst stage.
    requiredOutputPatterns: [
      {
        description: "Output names first-integration as the DX drop-off / bottleneck, not just the stages",
        pattern: /(first integration|auth|integration)[\s\S]{0,35}(drop-?off|bottleneck|weakest|worst|friction point|where users (?:get stuck|churn))|(drop-?off|bottleneck|weakest link|worst)\s+(?:stage|step|point)/i,
      },
    ],
  },
  {
    skill: "devtool-integration-map",
    pack: "devtool",
    focus: "integration surface map",
    inputs: ["CLI: used by most for local work", "SDK: needed for production embedding", "Webhook: only a few advanced users"],
    expectedPattern: /integration|surface|map/i,
    // Derived, not echoed: the SDK is the highest-leverage surface (the production
    // path), while the webhook is niche. The fixture describes each surface; only the
    // map names which to invest in.
    requiredOutputPatterns: [
      {
        description: "Output names the SDK as the highest-leverage / primary surface, not just listing surfaces",
        pattern: /(sdk|cli|webhook)[\s\S]{0,35}(highest[- ]?leverage|primary surface|most important|invest|priority|core surface|matters most)|(?:primary|core|highest[- ]?leverage)\s+(?:integration )?surface/i,
      },
    ],
  },
  {
    skill: "devtool-monetization",
    pack: "devtool",
    focus: "developer tool monetization",
    inputs: ["Free tier: individual devs, unlimited local use", "Team plan: shared workspaces and SSO", "Most value shows up when a team standardizes on it"],
    expectedPattern: /monetization|pricing|plan/i,
    // Derived, not echoed: value concentrates at the team/collaboration boundary, so
    // charge there (paywall SSO/shared workspaces) and keep individual use free as the
    // funnel. The fixture describes the tiers; only the strategy names where to charge.
    requiredOutputPatterns: [
      {
        description: "Output charges at the team/collaboration boundary and keeps free as a funnel, not just naming tiers",
        pattern: /paywall|(charge|monetiz\w+|price|gate)[\s\S]{0,30}(?:at )?(?:the )?(?:team|collaboration|seat)\s+(?:boundary|tier|plan|layer|standardiz)|value\s+(?:metric|capture)[\s\S]{0,30}(team|collaboration|seat)|free[\s\S]{0,20}(funnel|wedge|loss[- ]leader|top of funnel)/i,
      },
    ],
  },
  {
    skill: "devtool-positioning",
    pack: "devtool",
    focus: "developer tool positioning",
    inputs: ["Faster agent workflows", "Open-source proof"],
    expectedPattern: /positioning|developer|proof/i,
    // Derived, not echoed: the statement must produce a contrastive "unlike closed
    // SaaS" clause the fixture never phrases. A transcriber lists the differentiators
    // without framing the contrast.
    requiredOutputPatterns: [
      {
        description: "Output produces a contrastive 'unlike closed/proprietary SaaS' framing, not just naming differentiators",
        pattern: /\bunlike\b[\s\S]{0,45}(closed|saas|proprietary|hosted|black[- ]box|opaque)|(?:instead of|rather than|not (?:just )?(?:another|a closed|proprietary))[\s\S]{0,45}(saas|closed|proprietary|hosted)/i,
      },
    ],
  },
  {
    skill: "devtool-user-map",
    pack: "devtool",
    focus: "developer user segmentation",
    inputs: ["Solo maintainer: adopts fast, low budget", "Platform team: slow to adopt, holds the budget"],
    expectedPattern: /user|segment|developer/i,
    // Derived, not echoed: land with the fast-adopting solo maintainer as champion,
    // then expand to the budget-holding platform team (champion→buyer). The fixture
    // describes each segment; only the map states the land-and-expand path.
    requiredOutputPatterns: [
      {
        description: "Output states a land-with-solo, expand-to-team (champion→buyer) path, not just the segments",
        pattern: /(land|start|enter|wedge)[\s\S]{0,30}(solo|maintainer)[\s\S]{0,45}(expand|then|to the (?:platform|team|buyer))|champion[\s\S]{0,30}(buyer|budget|platform team)|land[- ]and[- ]expand/i,
      },
    ],
  },
  {
    skill: "devtool-workflow",
    pack: "devtool",
    focus: "developer workflow design",
    inputs: ["Local validation: typecheck + unit tests run in 20s", "Ship gate: full e2e suite runs in 15 min"],
    expectedPattern: /workflow|developer|validation/i,
    // Derived, not echoed: keep the fast checks in the local inner loop and reserve the
    // slow e2e for the ship gate only (not locally). The fixture states each check's
    // cost; only the design concludes where each runs.
    requiredOutputPatterns: [
      {
        description: "Output keeps fast checks in the inner loop and gates slow e2e at ship only, not just naming the checks",
        pattern: /fast (?:inner )?loop|(?:defer|reserve|only)[\s\S]{0,25}(ship gate|e2e|at ship)|e2e[\s\S]{0,30}(only|at (?:the )?ship|ship gate|ci[- ]only|not local)|keep[\s\S]{0,30}(?:the )?(?:inner )?loop[\s\S]{0,20}(fast|local|cheap)/i,
      },
    ],
  },
  {
    skill: "enterprise-icp",
    pack: "business-discovery",
    focus: "enterprise ICP definition",
    inputs: ["Security review required", "Multiple buying roles"],
    expectedPattern: /enterprise|icp|buyer/i,
    // Derived, not echoed: a security gate plus multiple buying roles imply a
    // multi-threaded deal that needs a champion and has a longer sales cycle. The
    // fixture states the conditions; only the ICP concludes the buying motion.
    requiredOutputPatterns: [
      {
        description: "Output concludes a multi-threaded / champion-led motion (security gate, longer cycle), not just the conditions",
        pattern: /champion|economic buyer|multi[- ]?threaded|blocker|gatekeeper|security[\s\S]{0,20}(gate|blocker|approval)|longer sales cycle|procurement/i,
      },
    ],
  },
  {
    skill: "experiment",
    pack: "business-growth",
    focus: "growth experiment design",
    inputs: ["Baseline signup conversion: 4%", "Minimum detectable effect: +1pp (to 5%)", "Guardrail: refund rate must stay under 2%"],
    expectedPattern: /experiment|hypothesis|metric/i,
    // Derived, not echoed: from the baseline/MDE/guardrail, a real design states the
    // ship-or-kill decision rule (ship if conversion reaches 5% at significance and
    // refunds stay under the guardrail, else kill). The fixture states the inputs,
    // never the decision rule.
    requiredOutputPatterns: [
      {
        description: "Output states a ship/kill decision rule or significance threshold, not just the inputs",
        pattern: /(ship|roll ?out|launch|keep)\s+if|(kill|stop|revert|abandon)\s+if|decision (?:rule|threshold|criteria)|statistical(?:ly)? significan\w*|stat[- ]?sig|reach\w*[\s\S]{0,30}(sample size|significance)/i,
      },
    ],
  },
  {
    skill: "extract-shared-types",
    pack: "code-quality",
    focus: "shared type extraction plan",
    inputs: ["Duplicate User type lives in web and api", "Duplicate Account type lives in api and worker", "The three packages have no common import target today"],
    expectedPattern: /shared|type|duplicate/i,
    // Derived, not echoed: the fix is a new shared types package/module that all three
    // packages import, collapsing the duplicates into one source of truth. The fixture
    // names the duplicates; only the plan names the shared module.
    requiredOutputPatterns: [
      {
        description: "Output proposes a shared types package/module (single source) to collapse the duplicates",
        pattern: /(shared|common)\s+(?:types?\s+)?(?:package|module|library|barrel)|single source of truth|extract\w*[\s\S]{0,30}(into|to)[\s\S]{0,30}(shared|common|package|module)|(packages?\/[\w-]*types|@[\w-]+\/types)/i,
      },
    ],
  },
  {
    skill: "game-audience",
    pack: "game",
    focus: "game audience definition",
    inputs: ["Cozy strategy players who dislike time pressure", "Play in 10-15 minute sessions on lunch breaks"],
    expectedPattern: /audience|player|game/i,
    // Derived, not echoed: cozy players who dislike time pressure imply a design with
    // no timers/fail-states, save-anywhere, low-stakes pacing. The fixture describes
    // the audience; only the definition derives the design implications.
    requiredOutputPatterns: [
      {
        description: "Output derives design implications (no timers, save-anywhere, low-stakes), not just the audience",
        pattern: /(no|avoid|remove|without)\s+(?:timers?|time pressure|fail[- ]?states?|clocks?|penalt\w+)|save[- ]?anywhere|forgiving\s+(?:design|loop|pace)|low[- ]?stakes/i,
      },
    ],
  },
  {
    skill: "game-comparables",
    pack: "game",
    focus: "game comparable analysis",
    inputs: ["Comparable: Stardew-like farm sim, strong on relationships, weak on economy depth", "Comparable: a trading tycoon, deep economy, no cozy vibe"],
    expectedPattern: /comparable|game|market/i,
    // Derived, not echoed: neither comparable owns cozy + deep economy, so that
    // combination is the positioning whitespace. The fixture describes each
    // comparable; only the analysis names the gap.
    requiredOutputPatterns: [
      {
        description: "Output names the cozy + deep-economy whitespace neither comparable owns, not just describing them",
        pattern: /(gap|whitespace|niche|no one|neither|unclaimed)[\s\S]{0,45}(cozy|economy|both|combin)|combin\w+[\s\S]{0,30}(cozy|economy)|own\w*\s+both/i,
      },
    ],
  },
  {
    skill: "game-core-loop",
    pack: "game",
    focus: "core loop articulation",
    inputs: ["Collect", "Upgrade", "Challenge"],
    expectedPattern: /core loop|collect|upgrade/i,
    // Derived, not echoed: a real core-loop articulation names what ends/breaks
    // the loop (failure/exit condition), which the seeded verbs never state.
    requiredOutputPatterns: [
      { description: "Output names the loop's failure or exit condition, not just the seeded verbs", pattern: /\b(fail(?:ure|s|ing)?|lose|losing|lost|game over|run ends?|defeat|death|exit condition|loop (?:closes|resets|breaks))\b/i },
    ],
  },
  {
    skill: "game-fantasy",
    pack: "game",
    focus: "player fantasy",
    inputs: ["Be the clever shopkeeper", "Optimize daily choices"],
    expectedPattern: /fantasy|player|game/i,
    // Derived, not echoed: the core fantasy delivers a mastery/cleverness emotion, and
    // the shop-optimization mechanic is what delivers it. The fixture states the
    // premise; only the analysis names the emotion the mechanic delivers.
    requiredOutputPatterns: [
      {
        description: "Output names the emotion (mastery/cleverness) the mechanic delivers, not just the premise",
        pattern: /the\s+(?:core\s+)?fantasy\s+is|(?:player feels?|emotion(?:al)?(?: (?:core|payoff))?)[\s\S]{0,30}(master\w*|clever|smart|outwit|pride|in control|powerful)|delivers?\s+(?:the\s+)?(?:feeling of\s+)?(?:mastery|cleverness|power|pride)/i,
      },
    ],
  },
  {
    skill: "game-genre-map",
    pack: "game",
    focus: "genre map",
    inputs: ["Sim: deep systems, high attention", "Strategy: decisions, medium attention", "Idle: runs itself, low attention"],
    expectedPattern: /genre|map|game/i,
    // Derived, not echoed: positioning as a sim-strategy hybrid with an idle option
    // sits between deep and low-attention play. The fixture describes each genre; only
    // the map states the blend/position.
    requiredOutputPatterns: [
      {
        description: "Output positions a hybrid/blend between the genres, not just describing each",
        pattern: /hybrid|blend\w*[\s\S]{0,30}(sim|strategy|idle)|cross(?:es|ing)?[\s\S]{0,20}(sim|idle|strategy)|sits between|(?:sim|strategy|idle)[- ](?:strategy|idle|sim)\b/i,
      },
    ],
  },
  {
    skill: "game-launch",
    pack: "game",
    focus: "launch plan",
    inputs: ["Steam page can go up 8 weeks before launch to gather wishlists", "Next Steam demo festival is in 3 weeks"],
    expectedPattern: /launch|steam|demo/i,
    // Derived, not echoed: the plan sequences the Steam page up now to bank wishlists,
    // the demo at the festival in 3 weeks, then launch. The fixture states the timing
    // facts; only the plan states the sequence.
    requiredOutputPatterns: [
      {
        description: "Output sequences page-now → demo-at-festival → launch, not just the timing facts",
        pattern: /\bsequence\b|(?:page|steam page)\s+(?:up|live|now)[\s\S]{0,15}(now|early|first|immediately|to bank|to gather)|(?:demo|festival)[\s\S]{0,30}(?:then|before)\s+(?:launch|release)|launch\s+(?:after|last)|bank[\s\S]{0,15}wishlist/i,
      },
    ],
  },
  {
    skill: "game-playtest-metrics",
    pack: "game",
    focus: "playtest metric plan",
    inputs: ["Target session length: 12 minutes", "Tutorial completion rate observed: 45%"],
    expectedPattern: /playtest|metric|session/i,
    // Derived, not echoed: 45% tutorial completion is below a healthy ~70% success
    // bar, so it fails the threshold and flags onboarding. The fixture states the
    // observed rate; only the plan judges it against a threshold.
    requiredOutputPatterns: [
      {
        description: "Output judges 45% completion as below the success threshold, not just stating the rate",
        pattern: /(?:45\s*%|completion)[\s\S]{0,35}(below|under|fails?|short of|misses|beneath)[\s\S]{0,25}(threshold|bar|target|70|healthy)|(?:success )?(?:threshold|bar|target)[\s\S]{0,15}(?:is|=|:|of|at)?\s*(?:70|75|80)\s*%|fails? (?:the )?(?:success )?(?:threshold|bar)|below (?:the )?(?:success )?(?:bar|threshold)/i,
      },
    ],
  },
  {
    skill: "game-prototype-test",
    pack: "game",
    focus: "prototype test plan",
    inputs: ["Hypothesis: the trading mechanic is fun on its own", "Prototype: paper version, 5 testers"],
    expectedPattern: /prototype|test|mechanic/i,
    // Derived, not echoed: a real test plan states the falsification condition — the
    // observable result that would kill the hypothesis. The fixture states the
    // hypothesis; only the plan defines what would disprove it.
    requiredOutputPatterns: [
      {
        description: "Output states a falsification / kill condition for the hypothesis, not just naming it",
        pattern: /falsif\w+|(?:kill|reject|abandon|drop)\w*[\s\S]{0,30}(hypothesis|mechanic|idea)|(?:fails?|dead|disproven?)\s+if\b|what would (?:disprove|falsify|prove[\s\S]{0,15}wrong)|stop[- ]?condition|invalidat\w+ if/i,
      },
    ],
  },
  {
    skill: "game-roadmap",
    pack: "game",
    focus: "game roadmap",
    inputs: ["Vertical slice proves the core loop", "Content pass adds levels", "Marketing beat: festival in month 4"],
    expectedPattern: /roadmap|milestone|game/i,
    // Derived, not echoed: the critical path is vertical slice before content pass,
    // with the demo aligned to the month-4 festival. The fixture lists the milestones;
    // only the roadmap orders them.
    requiredOutputPatterns: [
      {
        description: "Output orders the critical path (slice before content, align to festival), not just listing milestones",
        pattern: /critical path|vertical slice[\s\S]{0,30}(before|first|precede|then)[\s\S]{0,35}(content|level)|slice\s+(?:comes\s+)?(?:first|before)|(?:order|sequence)[\s\S]{0,30}(slice|content pass|milestone)|align[\s\S]{0,30}(festival|month\s*4|demo)/i,
      },
    ],
  },
  {
    skill: "game-store-page-test",
    pack: "game",
    focus: "store page test",
    inputs: ["Capsule art: shows the shop interior", "Short description leads with 'a cozy trading sim'", "Wishlist conversion on the page is the goal"],
    expectedPattern: /store|page|capsule/i,
    // Derived, not echoed: the test checks whether the capsule reads in ~3 seconds and
    // the first words signal genre — that clarity drives wishlist conversion. The
    // fixture describes the assets; only the test states the readability criterion.
    requiredOutputPatterns: [
      {
        description: "Output tests 3-second capsule readability / first-words genre clarity, not just describing assets",
        pattern: /(?:3|three)[- ]?second|first\s+(?:3|three)\s+(?:words|seconds)|(?:capsule|thumbnail|art)[\s\S]{0,30}(reads?|legib\w+|clear|communicat\w+|genre)|A\/B test|conversion[\s\S]{0,30}(clarity|hook|promise|first (?:3|three|impression))/i,
      },
    ],
  },
  {
    skill: "game-workflow",
    pack: "game",
    focus: "game production workflow",
    inputs: ["Design doc first", "Paper prototype next", "Playtest gates the vertical slice"],
    expectedPattern: /workflow|playtest|game/i,
    // Derived, not echoed: the process is not linear — playtest feedback loops back to
    // design, and cheap paper prototyping fails fast before building. The fixture
    // lists the phases; only the workflow states the iterative loop.
    requiredOutputPatterns: [
      {
        description: "Output states the iterative loop (playtest→design, fail cheap), not just listing phases",
        pattern: /not linear|(?:loop|iterat\w+|cycle)s?\s+back|playtest[\s\S]{0,30}(feed|loop|back|inform)[\s\S]{0,20}design|fail\s+(?:fast|cheap)|paper[\s\S]{0,25}(cheap|before build|before you build)/i,
      },
    ],
  },
  {
    skill: "taste-calibration",
    pack: "alignment-loop",
    focus: "adversarial questioning",
    inputs: ["Claim: users will pay immediately", "Evidence is thin"],
    expectedPattern: /question|assumption|evidence/i,
    // Derived, not echoed: the adversarial move is the single disproving/falsifying
    // question and a "not yet supported" verdict. The fixture states the claim; only
    // the questioning produces the disproving test.
    requiredOutputPatterns: [
      {
        description: "Output poses the disproving/falsifying question or an unsupported verdict, not just naming the claim",
        pattern: /disprov\w+|falsif\w+|what would (?:have to be|make|prove)[\s\S]{0,30}(true|wrong|false)|(?:not|isn'?t|un)[- ]?supported|(?:the )?(?:one )?question[\s\S]{0,30}(disprove|test|falsif|refute)/i,
      },
    ],
  },
  {
    skill: "growth-model",
    pack: "business-growth",
    focus: "growth model",
    inputs: ["Acquisition: 1,000 signups/mo from content", "Activation: 30% reach first value", "Referral: each activated user invites 0.4 others"],
    expectedPattern: /growth|model|acquisition/i,
    // Derived, not echoed: a referral coefficient of 0.4 (<1) means growth is not
    // viral / is acquisition-led, and activation at 30% is the biggest leak. The
    // fixture states the rates; only the model computes k<1 and names the constraint.
    requiredOutputPatterns: [
      {
        description: "Output derives k<1 (not viral) or names activation as the biggest leak, not just the rates",
        pattern: /sub-?viral|\bk\s*<\s*1|\bk\s*=\s*0?\.\d|not (?:yet )?viral|(?:viral coefficient|k[- ]?factor)[\s\S]{0,45}(<\s*1|below 1|under 1|less than 1|sub-?viral|self-sustain)|activation[\s\S]{0,45}(bottleneck|leak|weakest|biggest|drop|highest[- ]?leverage|primary lever)|(biggest|largest|primary|highest[- ]?leverage)\s+(?:lever|leak|constraint|drop|input)/i,
      },
    ],
  },
  {
    skill: "gtm",
    pack: "business-growth",
    focus: "go-to-market plan",
    inputs: ["ACV is low ($20/mo) and buyers are individual developers", "Community channel already has 2,000 engaged members"],
    expectedPattern: /go-to-market|gtm|channel/i,
    // Derived, not echoed: low ACV + developer buyers point to a self-serve /
    // product-led motion through the community, not an enterprise sales-led one. The
    // fixture states the economics; only the plan concludes the motion.
    requiredOutputPatterns: [
      {
        description: "Output concludes a self-serve/PLG motion (not enterprise sales-led) from the low-ACV dev buyers",
        pattern: /(self[- ]?serve|product[- ]?led|plg|bottoms?[- ]?up|community[- ]?led)[\s\S]{0,40}(motion|gtm|launch|not|instead|rather)|(?:not|avoid|instead of|rather than)[\s\S]{0,20}(enterprise|sales[- ]?led|top[- ]?down)|self[- ]?serve motion/i,
      },
    ],
  },
  {
    skill: "hook-model",
    pack: "business-growth",
    focus: "retention hook model",
    inputs: ["Trigger: daily standup reminder", "Action: log one blocker", "Reward: variable — sometimes an AI-suggested fix"],
    expectedPattern: /hook|trigger|reward/i,
    // Derived, not echoed: the seeded loop has trigger/action/variable-reward but no
    // investment phase, so the habit never compounds — the fix is a stored-value
    // investment step (and an internal trigger). The fixture never names the gap.
    requiredOutputPatterns: [
      {
        description: "Output names the missing investment phase / internal trigger that closes the habit loop",
        pattern: /investment\s+(?:phase|step|stage)|stored\s+(?:value|data|effort)|loads?\s+the\s+next\s+trigger|internal trigger|habit\s+(?:forms?|loop closes)/i,
      },
    ],
  },
  {
    skill: "customer-discovery",
    pack: "business-discovery",
    focus: "customer discovery with willingness-to-pay evidence",
    inputs: ["Small teams", "Repeated manual research", "Budget owner and paid alternatives"],
    expectedPattern: /customer discovery|ideal customer|willingness-to-pay|WTP|paid alternatives/i,
    // Derived, not echoed: the budget-owner + paid-alternatives evidence must be
    // turned into a willingness-to-pay judgment. The prompt lists the evidence; a
    // transcriber never concludes whether the segment will actually pay.
    requiredOutputPatterns: [
      {
        description: "Output derives a willingness-to-pay judgment from the budget-owner / paid-alternatives evidence",
        pattern: /(?:will|would|can|are able to|ready to|likely to)\s+(?:pay|spend|purchase|buy)\b|willing(?:ness)? to pay[\s\S]{0,40}(?:confirmed|strong|high|clear|eviden\w+|likely|yes)|already pay\w*[\s\S]{0,50}(?:for|alternative|competing|tool)/i,
      },
    ],
  },
  {
    skill: "investor-update",
    pack: "business-ops",
    focus: "investor update structure",
    inputs: ["MRR grew from $8k to $12k month over month", "Runway: 7 months", "Ask: 2 intros to design-partner CTOs"],
    expectedPattern: /investor|update|metrics/i,
    // Derived, not echoed: $8k → $12k MoM is 50% growth. The fixture states the two
    // figures; a transcriber never computes the headline growth rate.
    requiredOutputPatterns: [
      {
        description: "Output derives the ~50% MoM growth from $8k→$12k, not just the raw figures",
        pattern: /\b50\s*%|\b1\.5\s*x\b|50 percent|grew\s+50|up\s+50/i,
      },
    ],
  },
  {
    skill: "journey-map",
    pack: "customer-lifecycle",
    focus: "customer journey map",
    inputs: ["Awareness→Trial: 20% start a trial", "Trial→Activation: only 8% reach first value", "Activation→Paid: 45%"],
    expectedPattern: /journey|customer|activation/i,
    // Derived, not echoed: the 8% Trial→Activation step is the biggest drop and the
    // journey's bottleneck. The fixture states the stage rates; only the map names
    // the weakest stage.
    requiredOutputPatterns: [
      {
        description: "Output names Trial→Activation (8%) as the weakest stage / bottleneck, not just the rates",
        pattern: /(trial[\s\S]{0,20}activation|activation)[\s\S]{0,45}(weakest|bottleneck|biggest drop|lowest|worst|leak\w*|dominant|failure point|steepest|drop-?off)|(weakest|bottleneck|biggest drop-?off|worst|leakiest|dominant (?:failure|drop|weak\w*)|failure point|steepest drop)[\s\S]{0,45}(trial|activation)|(weakest|bottleneck|biggest drop-?off|worst|leakiest|failure point)\s+(?:stage|step|point)/i,
      },
    ],
  },
  {
    skill: "jtbd-positioning",
    pack: "business-discovery",
    focus: "job outcome positioning",
    inputs: ["Customers hire the product to reduce manual planning risk", "The current alternative is spreadsheets plus meetings"],
    expectedPattern: /job|outcome|positioning|customer/i,
    // Derived, not echoed: positioning the job against the named alternative
    // (spreadsheets + meetings) is the conclusion. The prompt names the alternative
    // as a fact; only the skill frames the switch away from it.
    requiredOutputPatterns: [
      {
        description: "Output positions the job against the named alternative (switch from spreadsheets + meetings)",
        pattern: /(unlike|instead of|rather than|better than|replaces?|switch(?:ing)? (?:from|away)|beats?|over)[\s\S]{0,45}(spreadsheet|meeting)/i,
      },
    ],
  },
  {
    skill: "onboarding-map",
    pack: "customer-lifecycle",
    focus: "activation onboarding",
    inputs: ["Signup completes: 90%", "Setup completes: 55%", "First success reached: 22%"],
    expectedPattern: /onboarding|activation|first success/i,
    // Derived, not echoed: the Setup→First success step (55%→22%) is the steepest
    // drop and the activation bottleneck. The fixture states the rates; only the map
    // names the leakiest step.
    requiredOutputPatterns: [
      {
        description: "Output names Setup→First success as the steepest drop / bottleneck, not just the rates",
        pattern: /(setup|first success|first value|activation)[\s\S]{0,45}(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|weakest|worst|steepest|leak\w*|drop-?off|dominant|lowest)|(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|steepest drop|weakest|leakiest|dominant (?:drop|failure)|failure point)[\s\S]{0,45}(setup|first success|first value|activation)|(biggest (?:relative )?drop|largest (?:relative )?drop|steepest drop|failure point)\b/i,
      },
    ],
  },
  {
    skill: "conversion-map",
    pack: "customer-lifecycle",
    focus: "trial conversion",
    inputs: ["Reach evaluation: 60%", "Voice an objection we answer: 25%", "Hit the payment trigger: 12%"],
    expectedPattern: /conversion|trial|objection/i,
    // Derived, not echoed: the evaluation→objection step (60%→25%) is where most
    // trials drop — the conversion bottleneck. The fixture states the rates; only the
    // map names the weakest step.
    requiredOutputPatterns: [
      {
        description: "Output names the objection/evaluation step as the biggest drop / bottleneck, not just the rates",
        pattern: /(objection|evaluation|payment|trial)[\s\S]{0,45}(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|weakest|worst|steepest|leak\w*|drop-?off|dominant|lowest|where most)|(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|steepest drop|weakest|leakiest|dominant (?:drop|failure)|failure point)[\s\S]{0,45}(objection|evaluation|payment)|(biggest (?:relative )?drop|largest (?:relative )?drop|steepest drop|failure point)\b/i,
      },
    ],
  },
  {
    skill: "transaction-map",
    pack: "customer-lifecycle",
    focus: "checkout transaction",
    inputs: ["Cart→Checkout start: 70%", "Checkout→Payment success: 40%", "Refund rate: 6%"],
    expectedPattern: /transaction|payment|refund/i,
    // Derived, not echoed: the Checkout→Payment step (70%→40%) is the failure point,
    // and a 6% refund rate is elevated. The fixture states the rates; only the map
    // names the failure step.
    requiredOutputPatterns: [
      {
        description: "Output names the checkout→payment step as the failure point / bottleneck, not just the rates",
        pattern: /(checkout|payment|cart|refund)[\s\S]{0,45}(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|failure point|weakest|worst|steepest|leak\w*|drop-?off|dominant|too high)|(biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|failure point|steepest drop|weakest|leakiest|dominant (?:drop|failure))[\s\S]{0,45}(checkout|payment|cart)|(biggest (?:relative )?drop|largest (?:relative )?drop|steepest drop|failure point)\b/i,
      },
    ],
  },
  {
    skill: "retention-map",
    pack: "customer-lifecycle",
    focus: "retention loop",
    inputs: ["Day-1 return: 50%", "Week-1 healthy usage: 28%", "Month-1 churn risk flagged: 35% of accounts"],
    expectedPattern: /retention|churn|healthy/i,
    // Derived, not echoed: the Day-1→Week-1 step (50%→28%) is the usage cliff where
    // churn concentrates — the retention bottleneck. The fixture states the rates;
    // only the map names the cliff.
    requiredOutputPatterns: [
      {
        description: "Output names the week-1 usage cliff / retention bottleneck, not just the rates",
        pattern: /(week[- ]?1|day[- ]?1|healthy usage|return|churn|usage)[\s\S]{0,45}(cliff|bottleneck|biggest (?:relative )?drop|largest (?:relative )?drop|weakest|worst|steepest|concentrat\w+|drop-?off|dominant|leak\w*)|(retention cliff|usage cliff|biggest (?:relative )?drop|largest (?:relative )?drop|bottleneck|weakest|steepest drop|dominant (?:drop|failure)|failure point)[\s\S]{0,45}(week|day|usage|return|churn|retention)|(retention cliff|usage cliff|biggest (?:relative )?drop|largest (?:relative )?drop|steepest drop|failure point)\b/i,
      },
    ],
  },
  {
    skill: "expansion-map",
    pack: "customer-lifecycle",
    focus: "account expansion",
    inputs: ["Accounts hitting an upgrade prompt: 40%", "Accounts adding seats: 12%", "Accounts referring: 3%"],
    expectedPattern: /expansion|upgrade|referral/i,
    // Derived, not echoed: seat expansion (40%→12%) is the biggest missed lever with
    // the most volume, ahead of referral. The fixture states the rates; only the map
    // names the largest expansion opportunity.
    requiredOutputPatterns: [
      {
        description: "Output names seat expansion as the biggest lever / bottleneck, not just the rates",
        pattern: /(seat|upgrade|referral|expansion)[\s\S]{0,45}(biggest|largest|primary|highest[- ]?leverage|top|main|bottleneck|weakest|missed|underused|drop-?off|untapped)|(biggest|largest|primary|highest[- ]?leverage|top|main)\s+(?:expansion )?(?:lever|opportunit\w+|driver|upside|motion)|(bottleneck|weakest link|largest opportunit\w+|biggest (?:expansion )?lever)/i,
      },
    ],
  },
  {
    skill: "lifecycle-metrics",
    pack: "customer-lifecycle",
    focus: "stage metrics",
    inputs: ["Activation rate: 30%", "Trial→paid conversion: 15%", "Month-2 retention: 70%"],
    expectedPattern: /metrics|instrumentation|stage/i,
    // Derived, not echoed: at 15%, conversion is the weakest stage / funnel
    // bottleneck relative to activation and retention. The fixture states the rates;
    // only the analysis names the weakest stage.
    requiredOutputPatterns: [
      {
        // Accepts either derived conclusion the prompt never states: naming the
        // weakest stage/bottleneck, OR computing the compounded end-to-end funnel
        // yield (0.30 × 0.15 × 0.70). Both require reading and multiplying the seeded
        // rates; neither is echoable from the fixture.
        description: "Output derives the weakest stage/bottleneck or the compounded end-to-end funnel yield, not just the rates",
        pattern: /(conversion|activation|retention)[\s\S]{0,45}(weakest|bottleneck|biggest (?:relative )?drop|largest (?:relative )?drop|lowest|worst|steepest|drop-?off|dominant|priority|leak\w*)|(weakest|bottleneck|biggest (?:relative )?drop|largest (?:relative )?drop|lowest|worst|steepest drop|failure point|dominant (?:drop|failure))[\s\S]{0,45}(conversion|activation|retention)|(biggest (?:relative )?drop|largest (?:relative )?drop|steepest drop|weakest (?:stage|metric|step|link)|failure point)\b|end-to-end|compound\w*|multiplicativ\w*|\b0\.30\s*[×x*]\s*0\.15|\b3\.15\s*%|\b10\.5\s*%|overall (?:funnel )?yield/i,
      },
    ],
  },
  {
    skill: "landing-copy",
    pack: "business-growth",
    focus: "landing page copy",
    inputs: ["Proof A: 5-minute setup (was a full afternoon)", "Proof B: works offline with no cloud account", "Audience distrusts vague marketing claims"],
    expectedPattern: /landing|copy|cta/i,
    // Derived, not echoed: with a distrustful audience, the copy should lead with the
    // single sharpest, most concrete proof (the quantified 5-minute setup). The
    // fixture lists competing proofs; only real copy picks which one leads.
    requiredOutputPatterns: [
      {
        description: "Output picks the sharpest proof to lead/headline with, not just listing the proofs",
        pattern: /(lead with|headline|hero (?:line|copy)|primary promise|sharpest promise|lead the page)[\s\S]{0,50}(5[- ]?minute|setup|offline|proof)/i,
      },
    ],
  },
  {
    skill: "lean-canvas",
    pack: "business-discovery",
    focus: "lean canvas",
    inputs: ["Problem: teams lose an afternoon per release to manual checks", "Solution: offline benchmark fixtures", "Unknown: whether teams will change their release workflow"],
    expectedPattern: /lean canvas|problem|solution/i,
    // Derived, not echoed: the riskiest assumption is behavior change (adoption), not
    // the technical solution. The fixture states the unknown; only the canvas names
    // which assumption is riskiest.
    requiredOutputPatterns: [
      {
        description: "Output names the riskiest assumption (behavior change / adoption), not just filling boxes",
        pattern: /(riskiest|biggest|most (?:uncertain|dangerous|critical)|key)\s+assumption|(assumption|risk)[\s\S]{0,30}(behavio(?:u)?r change|adoption|will(?:ingness)? to change|workflow change)|behavio(?:u)?r change[\s\S]{0,30}(risk|assumption|uncertain)/i,
      },
    ],
  },
  {
    skill: "metrics",
    pack: "business-growth",
    focus: "metric tree",
    inputs: ["North star: weekly active teams", "Input: activation rate (currently 30%, ~1,000 signups/wk)", "Input: reactivation of churned teams (~50 dormant)"],
    expectedPattern: /metric|north star|input/i,
    // Derived, not echoed: 30% of ~1,000 signups/wk dwarfs ~50 dormant teams, so
    // activation is the highest-leverage input on the north star. The fixture states
    // the magnitudes; only the tree concludes which input moves it most.
    requiredOutputPatterns: [
      {
        description: "Output identifies activation as the highest-leverage input on the north star",
        pattern: /(biggest|largest|highest[- ]?leverage|primary|dominant|greatest)\s+(?:lever|input|driver|impact)|activation[\s\S]{0,30}(moves|drives)[\s\S]{0,20}(most|north star)/i,
      },
    ],
  },
  {
    skill: "monetization",
    pack: "business-growth",
    focus: "monetization strategy",
    inputs: ["Usage varies 10x across accounts", "Small teams need a cheap entry; large teams have budget"],
    expectedPattern: /monetization|pricing|package/i,
    // Derived, not echoed: 10x usage variance argues for a usage-based value metric
    // with a cheap land tier and expansion, not flat pricing. The fixture states the
    // variance; only the strategy names the value metric / land-and-expand.
    requiredOutputPatterns: [
      {
        description: "Output concludes a usage-based value metric / land-and-expand from the 10x variance",
        pattern: /usage[- ]?based|value metric|per[- ]?seat|tiered?[\s\S]{0,20}(usage|value)|land[- ]and[- ]expand|expansion revenue|price on (?:usage|value)/i,
      },
    ],
  },
  {
    skill: "mono-detect",
    pack: "monorepo",
    focus: "monorepo detection",
    inputs: ["pnpm-workspace.yaml", "packages/app"],
    expectedPattern: /monorepo|workspace|package/i,
    // Derived, not echoed: the presence of pnpm-workspace.yaml plus a packages/ dir
    // means this IS a monorepo managed by pnpm workspaces. The fixture shows the
    // artifacts; only detection renders the affirmative verdict + tool.
    requiredOutputPatterns: [
      {
        description: "Output concludes this is a monorepo managed by pnpm workspaces, not just listing files",
        pattern: /(is|it'?s|this is)\s+a\s+monorepo|confirmed monorepo|pnpm workspaces?\b/i,
      },
    ],
  },
  {
    skill: "mono-guard",
    pack: "monorepo",
    focus: "parallel lane safety guard",
    inputs: ["Lane A owns packages/a", "Lane B owns packages/b"],
    expectedPattern: /guard|lane|safety/i,
    // Derived, not echoed: the lanes own disjoint packages, so they are safe to run in
    // parallel. The fixture states each lane's ownership; only the guard concludes the
    // disjoint / parallel-safe verdict.
    requiredOutputPatterns: [
      {
        description: "Output concludes the lanes are disjoint and safe to run in parallel, not just naming ownership",
        pattern: /disjoint|no overlap|non[- ]?overlapping|safe (?:to )?(?:run )?(?:in )?parallel|parallel[- ]?safe|can run in parallel|no (?:shared|conflicting) (?:package|file)|must not touch|subset of[\s\S]{0,30}(package|owned|director)|escapes?[\s\S]{0,20}(lane|boundary|package)|serializ\w+|merge conflict|lane boundary|independent\w*[\s\S]{0,20}(package|lane)/i,
      },
    ],
  },
  {
    skill: "moore-positioning",
    pack: "business-discovery",
    focus: "Geoffrey Moore positioning hypothesis",
    inputs: ["Target segment needs a practical positioning statement", "Evidence confidence differs by claim"],
    expectedPattern: /positioning|segment|unlike|evidence/i,
    // Derived, not echoed: the Moore template forces a contrastive "unlike
    // <alternative>" clause the fixture never supplies. A transcriber restates the
    // ask ("needs a positioning statement") without producing the differentiator.
    requiredOutputPatterns: [
      {
        description: "Output produces the Moore contrastive 'unlike <alternative>' differentiator",
        pattern: /\bunlike\b\s+\w|for\s+[\s\S]{0,60}who\s+[\s\S]{0,80}\bunlike\b/i,
      },
    ],
  },
  {
    skill: "mono-exec",
    pack: "monorepo",
    focus: "monorepo run planning",
    inputs: ["Change touches only packages/api", "Repo uses pnpm and Turborepo"],
    expectedPattern: /monorepo|run|validation/i,
    // Derived, not echoed: the minimal validation runs only the affected package via a
    // scoped filter (e.g. pnpm --filter api test), not the whole repo. The fixture
    // states the affected package; only the plan produces the scoped command.
    requiredOutputPatterns: [
      {
        description: "Output produces the scoped/filtered command for only the affected package, not a whole-repo run",
        pattern: /--filter|-F\s+\w|scoped?\s+(?:to|run|command|build|test)|(?:only|just)\s+(?:the\s+)?(?:affected|api)\s+package|turbo\w*\s+run[\s\S]{0,20}--filter/i,
      },
    ],
  },
  {
    skill: "mono-ship",
    pack: "monorepo",
    focus: "monorepo ship plan",
    inputs: ["Changes span packages/api and packages/web", "packages/web depends on packages/api"],
    expectedPattern: /ship|monorepo|commit/i,
    // Derived, not echoed: since web depends on api, ship api before web (dependency
    // order) or as one atomic commit at the boundary. The fixture states the
    // dependency; only the plan concludes the release order.
    requiredOutputPatterns: [
      {
        description: "Output concludes the dependency-ordered release (api before web / atomic commit), not just the changes",
        pattern: /dependency order|topological|(api|upstream)[\s\S]{0,20}before[\s\S]{0,20}(web|downstream|dependent)|atomic commit|single (?:atomic )?commit|release[\s\S]{0,20}order/i,
      },
    ],
  },
  {
    skill: "mvp-gap",
    pack: "business-ops",
    focus: "MVP gap analysis",
    inputs: ["Missing billing means we cannot charge customers at launch", "Missing onboarding polish can ship after launch"],
    expectedPattern: /mvp|gap|missing/i,
    // Derived, not echoed: billing blocks revenue at launch while onboarding polish
    // can wait, so billing is the launch-blocking gap to fix first. The fixture lists
    // both gaps; only a real analysis ranks which blocks launch.
    requiredOutputPatterns: [
      {
        description: "Output ranks billing as the launch-blocking gap to fix first (onboarding can wait)",
        pattern: /billing[\s\S]{0,60}(first|before (?:onboarding|launch)|p0|top priority|highest priority|block\w*)|block\w*\s+gap[\s\S]{0,25}billing|(single|only|the one|sole)[\s\S]{0,25}gap[\s\S]{0,20}(?:is )?billing|(fix|address|close|prioriti\w+)[\s\S]{0,25}billing[\s\S]{0,35}(first|before launch)/i,
      },
    ],
  },
  {
    skill: "obviously-awesome",
    pack: "business-discovery",
    focus: "April Dunford positioning framework",
    inputs: ["Customer feedback names switching triggers", "Competitive alternatives are known"],
    expectedPattern: /alternative|attribute|value|category|positioning/i,
    // Derived, not echoed: Dunford's chain turns known alternatives + switching
    // triggers into unique attributes → the value they enable → a best-fit market
    // category. The prompt names the inputs, never the derived value/category.
    requiredOutputPatterns: [
      {
        description: "Output derives unique attributes → value or a best-fit market category, not just the inputs",
        pattern: /(unique attribute|differentiat\w+)[\s\S]{0,60}(value|benefit|matter)|value theme|(best[- ]?fit|target) (?:market )?(?:category|segment)|market category[\s\S]{0,40}(?:frame|fit|win)/i,
      },
    ],
  },
  {
    skill: "ord-align",
    pack: "ord",
    focus: "ORD candidate alignment with report-first approval before markdown finalization",
    inputs: ["Tool concept", "API surface", "Target developer user"],
    expectedPattern: /ord|align|candidate/i,
    requiredOutputPatterns: [
      { description: "Output names the staged review HTML path", pattern: /alignment\/ord-align-[\w-]+\.html|alignment\/ord-align-<slug>\.html/i },
      { description: "Output uses report-first approval gate language", pattern: /report-first|review HTML|HTML approval gate|scope-first approval/i },
      { description: "Output requires final compiled YAML approval", pattern: /final compiled YAML|compiled response YAML/i },
      {
        description: "Output blocks direct markdown write before approval",
        pattern: /do not write [`']?alignment\/ord-<slug>\.md[`']? before approval|no direct [`']?alignment\/ord-<slug>\.md[`']? write before approval|write [`']?alignment\/ord-<slug>\.md[`']? only (after|for) approved GO/i,
      },
    ],
  },
  {
    skill: "ord-scan",
    pack: "ord",
    focus: "ORD opportunity scan",
    inputs: ["Friction: no local way to preview API responses (hit by many)", "Gap: SDK lacks TypeScript types (hit by a few)"],
    expectedPattern: /ord|scan|opportun/i,
    // Derived, not echoed: the local-preview friction has broader reach, so it ranks
    // as the top opportunity ahead of the types gap. The fixture states both; only the
    // scan ranks them.
    requiredOutputPatterns: [
      {
        description: "Output ranks the local-preview friction as the top opportunity, not just listing both",
        pattern: /(top|highest|#1|first|leading|best)\s+(?:ranked\s+)?opportunit|opportunit\w+[\s\S]{0,30}(rank|highest|top|first|prioriti\w+)|rank\w*[\s\S]{0,40}(preview|friction|opportunit)|prioriti\w+[\s\S]{0,40}(preview|local)/i,
      },
    ],
  },
  {
    skill: "ord-ship",
    pack: "ord",
    focus: "ORD shipping log and next experiment",
    inputs: ["Shipped the CLI preview command 10 days ago", "Adoption signal: 5 installs, 2 came back a second time"],
    expectedPattern: /ord|ship|experiment/i,
    // Derived, not echoed: weak-but-present repeat usage (2 of 5) means the next
    // experiment is to interview the returners / test activation, not to scale. The
    // fixture states the signal; only the log picks the next experiment.
    requiredOutputPatterns: [
      {
        description: "Output picks a concrete next experiment (interview returners / test activation), not just logging the signal",
        pattern: /next experiment[\s\S]{0,80}(interview|talk to|test|activation|first[- ]run|returner|repeat|retention|onboarding|success moment|why (?:they|users)|second use)|(interview|talk to)[\s\S]{0,30}(returner|repeat user|the 2)|iterate[\s\S]{0,30}(before|not|rather than)[\s\S]{0,20}scal|do (?:not|n'?t) scale (?:yet)?|weakest signal|(retention|activation|first[- ]run)[\s\S]{0,25}(weakest|experiment|improve|success moment)/i,
      },
    ],
  },
  {
    skill: "ord-traction",
    pack: "ord",
    focus: "post-launch ORD adoption gate",
    inputs: ["Package published 21 days ago", "Downloads: 38", "Two support questions, no repeat usage signal"],
    expectedPattern: /ord|traction|adoption|graduate|archive|iterate/i,
    // Derived, not echoed: 38 downloads with no repeat usage after 21 days is weak
    // traction, so the gate decision is iterate/archive — NOT graduate. The prompt
    // lists the gate options but never picks one; a transcriber leaves it open.
    requiredOutputPatterns: [
      {
        description: "Output's gate decision is iterate/archive, not graduate, given weak traction",
        pattern: /(?:do not|don'?t|not (?:ready )?to|too early to|hold off|insufficient to)\s*graduat|graduat\w*[\s\S]{0,20}\b(?:no|not|denied|blocked|fail|withhold)|recommendation[\s\S]{0,40}(?:iterate|archive)|verdict[\s\S]{0,25}(?:iterate|archive)|\b(?:iterate|archive)\b[\s\S]{0,30}(?:instead|rather than|not graduat|over graduat)/i,
      },
    ],
  },
  {
    skill: "platform-strategy",
    pack: "business-ops",
    focus: "platform strategy",
    inputs: ["Marketplace requires two-sided supply and demand", "API is already adopted by 12 developers"],
    expectedPattern: /platform|strategy|partner/i,
    // Derived, not echoed: a two-sided marketplace faces a cold-start problem, so the
    // sequence is to bootstrap the supply side first (leveraging the 12 API adopters)
    // before opening demand. The fixture names the ingredients, never the sequencing.
    requiredOutputPatterns: [
      {
        description: "Output sequences the two-sided cold start (seed supply first / bootstrap), not just naming the pieces",
        pattern: /cold[- ]?start|bootstrap|(supply|demand|api|adopter)[\s\S]{0,40}\bfirst\b|sequence[\s\S]{0,40}(supply|marketplace|api)|seed[\s\S]{0,30}(supply|marketplace)/i,
      },
    ],
  },
  {
    skill: "pmf-assessment",
    pack: "business-growth",
    focus: "PMF assessment",
    inputs: ["Week-8 retention flat at 55%", "40% of users say they'd be very disappointed without it", "60% convert to paid trial"],
    expectedPattern: /pmf|retention|signal/i,
    // Derived, not echoed: the 40% very-disappointed score meets the Sean Ellis
    // threshold and, with flat retention and paid conversion, supports a positive PMF
    // verdict. The fixture states the metrics; only the assessment renders the verdict.
    requiredOutputPatterns: [
      {
        description: "Output renders a PMF verdict (threshold met / have PMF), not just the metrics",
        pattern: /(have|hit|reached|achieved|strong|clear|passes?|meets?)\s+(?:product[- ]market fit|pmf)|pmf[\s\S]{0,30}(confirmed|achieved|met|yes|strong|reached)|(?:40\s*%|sean ellis)[\s\S]{0,30}(threshold|bar|met|passes|exceeds)|(?:above|at|meets|exceeds)[\s\S]{0,20}(?:40\s*%|threshold)[\s\S]{0,20}(?:pmf|fit)/i,
      },
    ],
  },
  {
    skill: "positioning",
    pack: "business-discovery",
    focus: "positioning narrative",
    inputs: ["Target user: small AI-agent teams", "Alternative they use today: hand-written coverage spreadsheets", "Differentiator: deterministic offline fixtures"],
    expectedPattern: /positioning|target|differentiator/i,
    // Derived, not echoed: the narrative must produce a contrastive "unlike the
    // spreadsheet" clause the fixture never phrases. A transcriber lists the pieces
    // without framing the differentiation.
    requiredOutputPatterns: [
      {
        description: "Output produces the contrastive 'unlike <alternative>' framing, not just naming the pieces",
        pattern: /\bunlike\b[\s\S]{0,40}(spreadsheet|alternative|manual|hand-?written)|(?:instead of|rather than|not (?:another|yet another))[\s\S]{0,40}(spreadsheet|manual|hand-?written)/i,
      },
    ],
  },
  {
    skill: "product-led-media-map",
    pack: "creator-foundation",
    focus: "product-led media map",
    inputs: ["Feature launch", "Educational series"],
    expectedPattern: /media|product|map/i,
    // Derived, not echoed: feature launches serve acquisition/awareness and the
    // educational series serves activation/retention, leaving a missing funnel stage.
    // The fixture names the media types; only the map maps them to funnel stages.
    requiredOutputPatterns: [
      {
        description: "Output maps each media type to a funnel stage and flags the missing stage, not just naming them",
        pattern: /(feature launch|launch)[\s\S]{0,30}(acquisition|awareness|top[- ]of[- ]funnel|tofu)|(educational|series)[\s\S]{0,30}(activation|retention|middle|nurture)|missing[\s\S]{0,30}(stage|funnel|retention|acquisition|media)/i,
      },
    ],
  },
  {
    skill: "product-line",
    pack: "business-ops",
    focus: "product-path portfolio review with activation, archive, and revisit triggers",
    inputs: ["Active path: core CLI", "Stale path: marketing site idle 45 days", "Revisit trigger: 30 days idle"],
    expectedPattern: /product|path|portfolio|activate|archive|trigger/i,
    // Derived, not echoed: 45 days idle exceeds the 30-day revisit trigger, so
    // the marketing path is past due for archive-or-revisit. The prompt never
    // states that the trigger has tripped; a transcriber only restates the inputs.
    requiredOutputPatterns: [
      {
        description: "Output flags the marketing path as past the 30-day revisit trigger (idle 45 > 30 → archive/revisit)",
        pattern: /(past|beyond|exceed\w*|over|breach\w*|trip\w*|overdue|surpass\w*|crossed?|due for (?:a )?(?:revisit|archive))[\s\S]{0,50}(revisit|30[- ]?day|trigger|threshold)|45[\s\S]{0,20}(?:>|exceeds?|beyond|past|over)[\s\S]{0,20}30|archive or revisit|revisit or archive|recommend\w*[\s\S]{0,40}(?:archive|revisit)/i,
      },
    ],
  },
  {
    skill: "prompt-history-backfill",
    pack: "session-analytics",
    focus: "report-only prompt-history audit with explicit apply safeguards",
    inputs: [
      "Claude and Codex history contain visible skill invocation prompts",
      "Existing prompts/skill-name entries should be compared before writing",
      "Likely secrets must block backfill writes",
    ],
    expectedPattern: /prompt|history|backfill|confidence|secret/i,
    requiredOutputPatterns: [
      { description: "Output keeps default mode report-only", pattern: /report-only|audit|dry-run/i },
      { description: "Output mentions explicit apply before writes", pattern: /--apply|explicit apply/i },
    ],
    nextRoutes: { claude: "/skills", codex: "$skills" },
  },
  {
    skill: "project-fleet",
    pack: "project-fleet",
    focus: "project fleet inventory",
    inputs: ["Idle-project policy: sunset anything past 90 days without a commit", "Project A: last commit 3 days ago", "Project B: last commit 200 days ago"],
    expectedPattern: /project|fleet|inventory/i,
    // Derived, not echoed: Project B at 200 days idle is past the 90-day policy, so it
    // should be archived. The fixture states the dates and policy; only the inventory
    // concludes which project trips the threshold.
    requiredOutputPatterns: [
      {
        description: "Output flags Project B (200 > 90) for archiving, not just listing the dates",
        pattern: /\barchiv\w+|200[\s\S]{0,25}(>|exceeds?|past|beyond|older than)[\s\S]{0,25}90/i,
      },
    ],
  },
  {
    skill: "skill-inventory",
    pack: "project-fleet",
    focus: "report-only downstream skill-copy drift inventory",
    inputs: [
      "tasks/downstream-repos.md contains Local Path entries for checked-out repos",
      "Downstream .codex/skills contains a stale managed skill copy",
      "V1 must not run scripts/pack.sh refresh or delete downstream skill roots",
    ],
    expectedPattern: /skill|inventory|stale|report-only|refresh/i,
    requiredOutputPatterns: [
      { description: "Output keeps inventory report-only", pattern: /report-only|without mutating|no downstream.*modified/i },
      { description: "Output names the durable report path", pattern: /tasks\/skill-inventory\.md/i },
    ],
    nextRoutes: { claude: "/project-fleet --status", codex: "$project-fleet --status" },
  },
  {
    skill: "quality-sweep",
    pack: "code-quality",
    focus: "quality sweep audit",
    inputs: ["Unchecked error handling on the payment path", "Missing regression test for a rarely-hit admin route", "Limited time before release"],
    expectedPattern: /quality|sweep|audit/i,
    // Derived, not echoed: the payment-path error handling is higher-risk than the
    // rarely-hit admin route, so fix it first. The fixture lists the issues; only the
    // sweep ranks the highest-risk fix.
    requiredOutputPatterns: [
      {
        description: "Output ranks the payment-path fix as highest-risk / first, not just listing issues",
        pattern: /(payment|error handling)[\s\S]{0,40}(first|highest[- ]?risk|top priority|before|prioriti\w+)|(highest[- ]?risk|top priority|fix first|address first)[\s\S]{0,40}(payment|error handling)/i,
      },
    ],
  },
  {
    skill: "reconcile-research",
    pack: "business-ops",
    focus: "research reconciliation",
    inputs: ["Old customer notes: users prefer weekly digests", "New survey (n=120): 68% prefer real-time alerts"],
    expectedPattern: /research|reconcile|source/i,
    // Derived, not echoed: the two sources conflict, and the newer, larger-sample
    // survey supersedes the old notes. The fixture states both datapoints; only a
    // real reconciliation names the contradiction and which source wins.
    requiredOutputPatterns: [
      {
        description: "Output names the contradiction and that the newer/larger survey supersedes the old notes",
        pattern: /contradict\w*|conflict\w*|disagree\w*|supersed\w*|overrid\w*|newer[\s\S]{0,20}(win|wins|prevail|supersede)|survey[\s\S]{0,40}(win|wins|supersede|takes precedence|more reliable|larger sample)/i,
      },
    ],
  },
  {
    skill: "repo-glossary",
    pack: "business-ops",
    focus: "shared glossary audit with stale terms and conflicts",
    inputs: ["Term A has conflicting definitions", "Term B is missing from the shared glossary"],
    expectedPattern: /glossary|term|definition|conflict/i,
    // Derived, not echoed: the fixture names the tensions (A conflicts, B missing);
    // a real audit resolves them (a canonical definition for A, a proposed one for
    // B). A transcriber restates the tensions without resolving either.
    requiredOutputPatterns: [
      {
        description: "Output resolves the conflict / proposes a definition, not just restating the tensions",
        pattern: /(resolv\w*|reconcil\w*|canonical|unif\w+|merge|single (?:agreed|shared) definition|proposed? definition|propose a definition|draft(?:ed)? definition|recommended definition)/i,
      },
    ],
  },
  {
    skill: "research-directory-conventions",
    pack: "creator-foundation",
    focus: "research directory conventions",
    inputs: ["Platform folders", "Dated snapshots"],
    expectedPattern: /directory|convention|snapshot/i,
    // Derived, not echoed: the convention requires platform-scoped nesting, dated
    // snapshots that are never overwritten (archive-before-replace), and a README
    // index. The fixture names the folders/snapshots; only the standard states the
    // immutability + indexing rules.
    requiredOutputPatterns: [
      {
        description: "Output states the archive-before-replace / README-index / platform-scoped rules, not just naming folders",
        pattern: /archive[- ]?before[- ]?replace|never overwrite|readme index|platform[- ]?scoped|(?:dated )?snapshot[\s\S]{0,30}(archive|append|never overwrite|immutable)/i,
      },
    ],
  },
  {
    skill: "retro",
    pack: "business-ops",
    focus: "retrospective synthesis",
    inputs: ["Worked: shipping behind flags cut rollback time", "Failed: manual QA missed two regressions", "Only one action can be resourced next sprint"],
    expectedPattern: /retro|action|lesson/i,
    // Derived, not echoed: with only one action resourceable, the highest-leverage
    // move comes from the failure — automate regression testing. The fixture states
    // the wins/failures; only synthesis picks the single top action.
    requiredOutputPatterns: [
      {
        description: "Output picks the single top action (automate regression testing) derived from the failure",
        pattern: /(top|first|highest[- ]?leverage|prioriti\w+|single most important)[\s\S]{0,40}action|action[\s\S]{0,30}(automat\w+ (?:qa|test)|regression test)|automat\w+[\s\S]{0,30}(qa|regression|test)/i,
      },
    ],
  },
  {
    skill: "risk-register",
    pack: "business-ops",
    focus: "risk register",
    inputs: ["Risk A: data-loss bug — high likelihood, severe impact", "Risk B: minor UI glitch — low likelihood, low impact"],
    expectedPattern: /risk|mitigation|register/i,
    // Derived, not echoed: likelihood×impact ranks Risk A (high×severe) as the P0
    // risk to mitigate first, ahead of Risk B. The fixture states both rows; only a
    // real register scores and ranks them.
    requiredOutputPatterns: [
      {
        description: "Output ranks Risk A (data loss) as P0 / mitigate first, ahead of Risk B",
        pattern: /(risk a|data[- ]?loss)[\s\S]{0,40}(p0|top priority|highest priority|first|critical|mitigate first)|(p0|top priority|highest priority|mitigate first)[\s\S]{0,30}(risk a|data[- ]?loss)/i,
      },
    ],
  },
  {
    skill: "runway-model",
    pack: "business-ops",
    focus: "runway model",
    inputs: ["Cash: $240k", "Monthly revenue: $12k", "Monthly burn: $52k"],
    expectedPattern: /runway|cash|burn/i,
    // Derived, not echoed: net burn = $52k − $12k = $40k/mo, so $240k / $40k ≈ 6
    // months of runway. The prompt states the three figures, never the answer.
    requiredOutputPatterns: [
      {
        description: "Output derives ~6 months runway (net burn $40k) from cash/revenue/burn",
        pattern: /\b(?:6|six)\s*months?\b|net burn[\s\S]{0,20}\$?\s*40/i,
      },
    ],
  },
  {
    skill: "scale-audit",
    pack: "business-ops",
    focus: "scale readiness audit",
    inputs: ["Support tickets doubled to 400/week while headcount held flat", "Manual onboarding is the operational bottleneck"],
    expectedPattern: /scale|audit|bottleneck/i,
    // Derived, not echoed: manual onboarding is the binding constraint that won't
    // scale linearly and must be automated before scaling. The fixture names the
    // load and the bottleneck; only the audit concludes what breaks first.
    requiredOutputPatterns: [
      {
        description: "Output concludes the binding constraint won't scale / must be automated before scaling",
        pattern: /(won'?t|cannot|can'?t|does not|doesn'?t|unable to)\s+scale|scales?\s+linearly|linear(?:ly)?\s+scal\w+|non[- ]?linear\w*|binding constraint|not\s+scale[- ]?ready\b|caps?\s+(?:customer\s+)?(?:intake|growth|throughput|volume)|automat\w+[\s\S]{0,40}(onboarding|first|before[\s\S]{0,20}scal|highest[- ]?leverage)|(?:highest[- ]?leverage|first)\s+fix[\s\S]{0,30}(onboarding|automat)/i,
      },
    ],
  },
  {
    skill: "series-spec",
    pack: "creator-foundation",
    focus: "content series specification",
    inputs: ["Audience promise", "Episode template"],
    expectedPattern: /series|spec|episode/i,
    // Derived, not echoed: the spec must define a through-line — a recurring payoff
    // every episode delivers — and fixed template slots. The fixture names the promise
    // and template; only the spec states the recurring structure.
    requiredOutputPatterns: [
      {
        description: "Output defines the through-line / recurring payoff and fixed slots, not just naming promise/template",
        pattern: /through[- ]?line|recurring\s+(?:payoff|slot|segment|beat)|every episode[\s\S]{0,35}(deliver|end|include|ship)|fixed\s+(?:slot|segment|beat)|template[\s\S]{0,25}(slot|beat|segment)/i,
      },
    ],
  },
  {
    skill: "spin-off",
    pack: "project-fleet",
    focus: "project spin-off plan",
    inputs: ["Shared code: the coverage-parser module used by two apps", "New repository target: coverage-parser standalone repo"],
    expectedPattern: /spin.?off|project|repository/i,
    // Derived, not echoed: the plan extracts the coverage-parser into the new repo and
    // publishes it as a package both apps depend on. The fixture names the shared code
    // and target; only the plan states the extraction + shared-dependency mechanic.
    requiredOutputPatterns: [
      {
        description: "Output states the extraction + published-dependency plan, not just naming shared code and target",
        pattern: /extract\w*[\s\S]{0,40}(coverage-parser|module|package)|publish\w*[\s\S]{0,30}(package|npm|registry)|(both|two) apps? (?:depend|import|consume)|standalone (?:package|dependency)/i,
      },
    ],
  },
  {
    skill: "spinoff-idea",
    pack: "project-fleet",
    focus: "repo-derived idea-scope-brief prompt",
    inputs: ["Source repo: a benchmark harness for agent skills", "The fixture-authoring flow is reused across three internal projects", "Need a scope brief for a fresh repo"],
    expectedPattern: /idea|prompt|brief|repo/i,
    // Derived, not echoed: the reuse across three projects is the signal to spin the
    // fixture-authoring flow into its own product and write the brief for it. The
    // fixture states the observation; only the idea names the extraction target.
    requiredOutputPatterns: [
      {
        description: "Output names the spinoff target (fixture-authoring as its own product), not just restating the observation",
        pattern: /(spin|extract|standalone|own product|its own tool|separate product)[\s\S]{0,40}(fixture|authoring)|fixture[- ]?authoring[\s\S]{0,30}(standalone|own (?:tool|product|repo)|spin|separate product)|the spin-?off (?:idea )?is/i,
      },
    ],
  },
  {
    skill: "strategic-canvas",
    pack: "business-discovery",
    focus: "Blue Ocean strategic canvas",
    inputs: ["Competitors over-invest in dashboards", "Customers value faster first outcome"],
    expectedPattern: /canvas|value curve|eliminate|reduce|raise|create|positioning/i,
    // Derived, not echoed: the ERRC grid applied to the fixture factors means
    // reduce/eliminate dashboards and raise/create time-to-first-outcome. The
    // prompt names the factors; only the skill maps them onto the ERRC verbs.
    requiredOutputPatterns: [
      {
        description: "Output maps the ERRC verbs onto the fixture factors (reduce dashboards, raise faster first outcome)",
        pattern: /(reduce|eliminat\w+|lower)[\s\S]{0,45}dashboard|(raise|creat\w+|boost|increase)[\s\S]{0,45}(first outcome|time[- ]to|faster|speed)/i,
      },
    ],
  },
  {
    skill: "uat-guide",
    pack: "guided-walkthrough",
    focus: "tester-ready instructions for one UAT journey and result-log update handoff",
    inputs: [
      "research/uat-plan.md contains Journey 1: Signup smoke test with Status: Not run",
      "tasks/manual-todo.md contains the matching human-run UAT journey item",
    ],
    promptRequirements: [
      "- include preparation, exact tester steps, checkpoints, evidence capture, gotchas, and result-log update guidance",
    ],
    retainedArtifacts: [
      {
        path: "research/uat-plan.md",
        content: [
          "# UAT Plan",
          "",
          "### Journey 1: Signup smoke test",
          "",
          "- Target user: Trial evaluator",
          "- User goal: Create an account and reach the dashboard",
          "- Setup: Local app URL and test email account are available",
          "- Task sequence:",
          "  - Open the signup page",
          "  - Submit the signup form",
          "  - Confirm the dashboard loads",
          "- Expected success state: Dashboard appears with the trial evaluator name",
          "- Acceptance criteria:",
          "  - [ ] Signup form accepts valid details",
          "  - [ ] Dashboard loads after signup",
          "- Evidence to capture: Screenshot of the dashboard and timestamped notes",
          "- Tester notes prompt: Would a trial evaluator trust this signup flow?",
          "",
          "#### UAT result log",
          "",
          "- Status: Not run",
          "- Evidence captured:",
          "- Tester notes:",
          "- Follow-up tasks promoted:",
        ],
      },
      {
        path: "tasks/manual-todo.md",
        content: [
          "# Manual Tasks",
          "",
          "## UAT Journeys",
          "",
          "- [ ] Run UAT journey: Signup smoke test as Trial evaluator _(after: research/uat-plan.md)_ - capture evidence in `research/uat-plan.md`.",
        ],
      },
    ],
    expectedPattern: /UAT|journey|tester|checkpoint|evidence|result log/i,
    // Derived from the retained plan, not the prompt: the specific journey name
    // and target user live only in research/uat-plan.md, never in the prompt, so
    // citing them proves the agent read the seeded artifact rather than emitting
    // generic UAT prose.
    requiredOutputPatterns: [
      { description: "Output cites the specific seeded UAT journey (Signup smoke test)", pattern: /Signup smoke test/i },
      { description: "Output names the seeded target user (Trial evaluator)", pattern: /Trial evaluator/i },
    ],
    nextRoutes: { claude: "/uat-guide next", codex: "$uat-guide next" },
  },
  {
    skill: "user-flow-map",
    pack: "product-design",
    focus: "screen flow map with entry points, decisions, branches, states, recovery, handoffs, and low-fidelity wireframe notes",
    inputs: [
      "Positioning: trial evaluators need fastest first value.",
      "Journey: arrive from comparison page, create workspace, invite teammate, recover from missing import.",
      "Existing route hints: /onboarding and /workspace.",
    ],
    expectedPattern: /flow|screen|route|branch|state|wireframe/i,
    requiredOutputPatterns: [
      { description: "Output covers branch and decision coverage", pattern: /branch|decision/i },
      { description: "Output covers state and recovery coverage", pattern: /state|failure|recovery/i },
      { description: "Output covers low-fidelity wireframe notes", pattern: /wireframe|low-fidelity|low-fi/i },
    ],
    nextRoutes: { claude: "/ui-interview --requirements-only", codex: "$ui-interview --requirements-only" },
  },
  {
    skill: "value-prop-canvas",
    pack: "business-discovery",
    focus: "value proposition canvas",
    inputs: ["Job: reach a trustworthy coverage baseline", "Pain: setup eats a full afternoon", "Gain: confidence to ship without regressions"],
    expectedPattern: /value proposition|canvas|pain/i,
    // Derived, not echoed: the canvas must map a pain-reliever to the setup pain and a
    // gain-creator to the confidence gain. The fixture states jobs/pains/gains; only
    // the mapping names the reliever/creator fit.
    requiredOutputPatterns: [
      {
        description: "Output maps a pain-reliever / gain-creator to the seeded pain and gain, not just listing them",
        pattern: /pain[- ]?reliever|gain[- ]?creator|(reliev\w+|address\w*|kills?|removes?)[\s\S]{0,30}(setup|afternoon|pain)|(map|fit|match)\w*[\s\S]{0,30}(pain|gain|job)/i,
      },
    ],
  },
  {
    skill: "vard-align",
    pack: "vard",
    focus: "VARD candidate alignment",
    inputs: ["Concept: offline-first coverage dashboard", "Validation signal: 3 of 4 interviewees pre-committed to try it", "Risk: needs a workflow change"],
    expectedPattern: /vard|align|candidate/i,
    // Derived, not echoed: a 3/4 pre-commit signal is strong enough to advance, but
    // the decision is conditional on the workflow-change risk. The fixture states the
    // signal and risk; only alignment renders the conditional verdict.
    requiredOutputPatterns: [
      {
        description: "Output renders a conditional advance/proceed verdict gated on the workflow-change risk, not just the inputs",
        pattern: /(proceed|advance|go\b|align|move forward)[\s\S]{0,50}(but|caveat|gate|contingent|risk|workflow change|provided)|(conditional|qualified)\s+(?:go|yes|proceed)|validated enough to (?:proceed|advance)/i,
      },
    ],
  },
  {
    skill: "vard-scan",
    pack: "vard",
    focus: "VARD opportunity scan",
    inputs: ["Audience problem: teams distrust unverified coverage claims", "Option: a one-command local verifier vs a hosted dashboard"],
    expectedPattern: /vard|scan|opportun/i,
    // Derived, not echoed: for a distrustful audience the sharpest wedge is the local
    // verifier (verifiable), not the hosted dashboard. The fixture states the options;
    // only the scan recommends which wedge leads.
    requiredOutputPatterns: [
      {
        description: "Output recommends the local-verifier wedge as sharpest, not just listing the options",
        pattern: /(sharpest|best|strongest|primary|recommended|leading)\s+wedge|(?:recommend|choose|pick|lead with|start with|verdict|winner|opportunity is)[\s\S]{0,35}(local verifier|one[- ]command)|(local verifier|one[- ]command)[\s\S]{0,40}(win|wins|dominates?|dominated|defensible|sharp|best|wedge|entry|first|recommend|verdict|attacks)|hosted dashboard[\s\S]{0,30}(dominated|loses?|weaker|rejected|worse|dead)/i,
      },
    ],
  },
  {
    skill: "vard-ship",
    pack: "vard",
    focus: "VARD shipping log and next experiment",
    inputs: ["Shipped a landing page 7 days ago", "Validation result: 40 visits, 4 email signups, 0 replies to the follow-up"],
    expectedPattern: /vard|ship|experiment/i,
    // Derived, not echoed: signups but zero replies mean the next experiment is to
    // interview the signups and test the value message before scaling. The fixture
    // states the result; only the log picks the next experiment.
    requiredOutputPatterns: [
      {
        description: "Output picks a concrete next experiment (interview signups / test message), not just logging the result",
        pattern: /next experiment[\s\S]{0,80}(interview|talk to|test|message|activation|value|signup|reply|why|onboarding|first[- ]run|conversion)|(interview|talk to)[\s\S]{0,30}(signup|the 4)|iterate[\s\S]{0,30}(message|value prop|before|not)|do (?:not|n'?t) scale (?:yet)?|weakest signal|(message|value prop|activation|conversion)[\s\S]{0,25}(experiment|test|weakest|improve)/i,
      },
    ],
  },
  {
    skill: "vard-traction",
    pack: "vard",
    focus: "post-launch VARD traction gate",
    inputs: ["Landing page live 14 days", "Waitlist: 9", "Activation signal is weak"],
    expectedPattern: /vard|traction|graduate|archive|iterate|activation/i,
    // Derived, not echoed: a 9-person waitlist with weak activation after 14 days
    // is below the graduation bar, so the gate decision is iterate/archive. The
    // prompt lists the options but never picks one; a transcriber leaves it open.
    requiredOutputPatterns: [
      {
        description: "Output's gate decision is iterate/archive, not graduate, given weak traction",
        pattern: /(?:do not|don'?t|not (?:ready )?to|too early to|hold off|insufficient to)\s*graduat|graduat\w*[\s\S]{0,20}\b(?:no|not|denied|blocked|fail|withhold)|recommendation[\s\S]{0,40}(?:iterate|archive)|verdict[\s\S]{0,25}(?:iterate|archive)|\b(?:iterate|archive)\b[\s\S]{0,30}(?:instead|rather than|not graduat|over graduat)/i,
      },
    ],
  },
  {
    skill: "vertical-slice-splitter",
    pack: "alignment-loop",
    focus: "vertical slice breakdown",
    inputs: ["Large feature: full team workspace with roles, billing, and audit log", "Constraint: ship something usable in one week"],
    expectedPattern: /vertical slice|split|scope/i,
    // Derived, not echoed: the thinnest shippable slice is a single-user workspace
    // that defers roles, billing, and the audit log. The fixture states the big
    // feature; only the split names the walking-skeleton slice.
    requiredOutputPatterns: [
      {
        description: "Output names the thinnest slice (single-user / defer roles-billing-audit), not just the big feature",
        pattern: /thinnest slice|walking skeleton|(first|thinnest|minimal)\s+slice[\s\S]{0,50}(without|no |single|drop|defer|exclud)|(defer|drop|cut)[\s\S]{0,30}(roles|billing|audit)|single[- ]?user[\s\S]{0,30}(first|slice|skeleton)/i,
      },
    ],
  },
  {
    skill: "video-build",
    pack: "remotion",
    focus: "video build plan without rendering",
    inputs: ["Script beats: intro, problem, one-command demo, results, CTA", "Constraint: 60-second cut"],
    expectedPattern: /video|build|scene/i,
    // Derived, not echoed: the five beats map to five scenes with the demo ordered
    // before results. The fixture lists the beats; only the build plan states the
    // scene count/order.
    requiredOutputPatterns: [
      {
        description: "Output states the scene count/order (e.g. five scenes, demo before results), not just the beats",
        pattern: /\b(?:[3-7]|three|four|five|six|seven)\s+scenes?\b|scene\s+(?:order|sequence|count|breakdown)|demo[\s\S]{0,15}(?:before|then|→|->)[\s\S]{0,15}result/i,
      },
    ],
  },
  {
    skill: "video-script",
    pack: "remotion",
    focus: "video script outline",
    inputs: ["Topic: shipping an offline benchmark in 5 minutes", "Demo: the one-command run", "CTA: try the repo"],
    expectedPattern: /video|script|hook/i,
    // Derived, not echoed: the script should cold-open on the payoff (lead the hook
    // with the result), not a slow intro. The fixture lists the parts; only the script
    // states the hook/cold-open structure.
    requiredOutputPatterns: [
      {
        description: "Output states a cold-open / hook-leads-with-payoff structure, not just listing the parts",
        pattern: /cold open|open\w*\s+(?:with|on)\s+the\s+(?:payoff|demo|result|hook)|lead(?:s|ing)?\s+with\s+the\s+(?:payoff|result|demo|hook)|hook\s+(?:promises?|leads?|is|line)[\s\S]{0,35}(5[- ]?min|payoff|result|demo)/i,
      },
    ],
  },
  {
    skill: "youtube-audit",
    pack: "youtube-ops",
    focus: "YouTube audit",
    inputs: ["Last 10 videos average 2,000 views", "One outlier hit 40,000 views on a tutorial topic"],
    expectedPattern: /youtube|audit|channel/i,
    // Derived, not echoed: the tutorial outlier at ~20x baseline is the winning format
    // to double down on. The fixture states the numbers; only the audit concludes the
    // action.
    requiredOutputPatterns: [
      {
        description: "Output concludes to double down on the tutorial outlier as the winning format, not just the numbers",
        pattern: /(outlier|tutorial|40[,.]?000|40k|breakout)[\s\S]{0,45}(double down|lean into|winning|repeat|20x|replicate|scale)|(double down|lean into|repeat|replicate)[\s\S]{0,30}(tutorial|outlier|winner|topic)|winning\s+(?:format|topic|angle)/i,
      },
    ],
  },
  {
    skill: "youtube-cadence-diagnosis",
    pack: "youtube-ops",
    focus: "YouTube cadence diagnosis",
    inputs: ["Uploads: Jan 3, Jan 10, Jan 17, then nothing until Mar 2", "Format mix: mostly long-form"],
    expectedPattern: /youtube|cadence|upload/i,
    // Derived, not echoed: the ~6-week gap after Jan 17 broke cadence — the channel
    // went dark through February. The fixture lists the dates; only the diagnosis
    // names the gap.
    requiredOutputPatterns: [
      {
        description: "Output names the multi-week gap / went-dark period, not just the dates",
        pattern: /(6[- ]?week|six[- ]?week|five[- ]?week|month[- ]?long|multi[- ]?week|\d+[- ]?week)\s+(?:gap|hiatus|silence)|went dark|(?:gap|hiatus|silence)[\s\S]{0,30}(feb|february|after jan)|brok\w+ cadence|cadence (?:gap|collaps\w+|brok\w+)/i,
      },
    ],
  },
  {
    skill: "youtube-channel-audit",
    pack: "youtube-ops",
    focus: "YouTube channel audit",
    inputs: ["About page describes the creator's background and tools", "Top videos are all one tutorial topic, but the About page lists five unrelated interests"],
    expectedPattern: /youtube|channel|audit/i,
    // Derived, not echoed: the About page's five interests mismatch the single proven
    // tutorial niche, so the fix is to tighten positioning to what the top videos
    // prove. The fixture states the mismatch inputs; only the audit concludes the fix.
    requiredOutputPatterns: [
      {
        description: "Output names the positioning mismatch and to tighten/realign it, not just describing the pages",
        pattern: /mismatch|(?:doesn'?t|does not|don'?t|fails? to)\s+(?:match|align|reflect)|tighten\s+(?:the\s+)?positioning|(?:realign|refocus)\s+(?:the\s+)?(?:about|positioning|niche)|positioning\s+(?:gap|conflict|mismatch)/i,
      },
    ],
  },
  {
    skill: "youtube-concept-research",
    pack: "youtube-ops",
    focus: "YouTube concept research",
    inputs: ["Concept: 'why our benchmark runs offline'", "Comparable videos on offline-first tools average high retention but low CTR"],
    expectedPattern: /youtube|concept|research/i,
    // Derived, not echoed: comparables retain well but have low CTR, so the concept's
    // risk is packaging (title/thumbnail), not retention. The fixture states the
    // comparable metrics; only the research names which lever is the risk.
    requiredOutputPatterns: [
      {
        description: "Output names CTR/packaging as the risk (not retention), not just the comparable metrics",
        pattern: /(ctr|click[- ]through|packaging|title|thumbnail)[\s\S]{0,35}(risk|weak|problem|sharpen|fix|lever|constraint|bottleneck)|(?:risk|weak|constraint|bottleneck)\s+(?:is|=)?\s*(?:the\s+)?(?:ctr|packaging|title|thumbnail)|retention[\s\S]{0,30}(not the (?:problem|risk|issue)|is fine|is strong)/i,
      },
    ],
  },
  {
    skill: "youtube-competitive-research",
    pack: "youtube-ops",
    focus: "YouTube competitive research",
    inputs: ["Peer A posts weekly, deep-dive format, 50k subs", "Peer B posts daily shorts, 200k subs"],
    expectedPattern: /youtube|competitive|peer/i,
    // Derived, not echoed: shorts correlate with faster sub growth (200k vs 50k), and
    // the open lane is a mid-cadence long-form niche neither peer owns. The fixture
    // states the peer metrics; only the research names the gap/lever.
    requiredOutputPatterns: [
      {
        description: "Output names the open lane / shorts-growth lever from the peer metrics, not just listing them",
        pattern: /(gap|open lane|whitespace|unclaimed|neither peer|open position)|shorts[\s\S]{0,30}(drive|faster|lever|grow|correlat)|(?:open|unclaimed|missing|untapped)\s+(?:lane|niche|position|space)/i,
      },
    ],
  },
  {
    skill: "youtube-derivative-cuts",
    pack: "youtube-ops",
    focus: "YouTube derivative cut slate from one long source video",
    inputs: [
      "Source video ID: abc123def45",
      "Source title: Building an agentic skills workflow end to end",
      "Transcript segment: 00:42-02:15 explains the core workflow failure mode and payoff.",
      "Transcript segment: 08:10-08:54 gives a crisp before/after example suitable for Shorts.",
      "Chapters: setup, diagnosis, implementation, measurement",
      "Portfolio gap: short proof clips are missing for education and acquisition.",
      "Metrics note: track source-video traffic, subscribers gained, retention, and long-form spillover.",
    ],
    promptRequirements: [
      "- include candidate timestamp start/end handles and estimated duration",
      "- distinguish companion clips from Shorts",
      "- include a publish sequence starting with a companion clip, then 3-5 Shorts, then checkpoint review",
      "- include measurement beyond views and explicitly state that Shorts views alone are insufficient success evidence",
      "- hand off thumbnail design to youtube-title-thumbnail-audit and upload-ready description optimization to youtube-description-optimizer",
    ],
    expectedPattern: /youtube|derivative|cut|clip|Shorts|timestamp/i,
    requiredOutputPatterns: [
      { description: "Output includes candidate timestamps", pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\b[\s\S]*\b\d{1,2}:\d{2}(?::\d{2})?\b/i },
      { description: "Output distinguishes companion clips from Shorts", pattern: /companion clip[\s\S]*Shorts|Shorts[\s\S]*companion clip/i },
      { description: "Output includes publish sequence", pattern: /publish sequence|companion clip first|checkpoint review/i },
      { description: "Output measures beyond views", pattern: /subscribers gained|subs gained|retention|long-form spillover|source-video traffic|Shorts views alone/i },
    ],
    nextRoutes: { claude: "/youtube-title-thumbnail-audit", codex: "$youtube-title-thumbnail-audit" },
  },
  {
    skill: "youtube-description-optimizer",
    pack: "youtube-ops",
    focus: "YouTube description optimization",
    inputs: ["Draft description: 3 paragraphs of backstory before any link", "Primary CTA link is buried in paragraph 3"],
    expectedPattern: /youtube|description|optimi/i,
    // Derived, not echoed: the fix is to move the primary CTA/link above the fold (the
    // first two lines) and front-load keywords. The fixture describes the draft; only
    // the optimizer states the reordering.
    requiredOutputPatterns: [
      {
        description: "Output moves the CTA above the fold / front-loads keywords, not just describing the draft",
        pattern: /first\s+(?:two|2)\s+lines?|above the fold|front[- ]?load|(cta|link|keyword)[\s\S]{0,30}(above the fold|first line|front|top of|move up)|move[\s\S]{0,20}(cta|link|primary)[\s\S]{0,20}(up|top|first|above)/i,
      },
    ],
  },
  {
    skill: "youtube-format-research",
    pack: "remotion",
    focus: "YouTube format research",
    inputs: ["Reference video: a 12-minute build-along that retains well", "Our past shorts underperform on this topic"],
    expectedPattern: /youtube|format|research/i,
    // Derived, not echoed: the retention evidence recommends the long-form build-along
    // format over shorts for this topic. The fixture states the evidence; only the
    // research renders the recommendation.
    requiredOutputPatterns: [
      {
        description: "Output recommends the long-form build-along format over shorts, not just the evidence",
        pattern: /recommend\w*[\s\S]{0,30}(long[- ]?form|build[- ]?along|12[- ]?min)|(long[- ]?form|build[- ]?along)[\s\S]{0,30}(over|instead of|beats?|not)\s+(?:the )?short|go with (?:the )?long[- ]?form|format\s+recommendation/i,
      },
    ],
  },
  {
    skill: "youtube-peer-benchmark",
    pack: "youtube-ops",
    focus: "YouTube peer benchmark",
    inputs: ["Peer median CTR 6%, ours 3%", "Peer median AVD 50%, ours 48%"],
    expectedPattern: /youtube|peer|benchmark/i,
    // Derived, not echoed: CTR is the gap (half the peer median) while AVD is at
    // parity, so fix packaging, not retention. The fixture states the paired metrics;
    // only the benchmark names which is the gap.
    requiredOutputPatterns: [
      {
        description: "Output names CTR as the gap and AVD as parity, not just the paired metrics",
        pattern: /(ctr|click[- ]through)[\s\S]{0,35}(gap|half|behind|below|trails?|lag|underperform)|(gap|behind|below|trails?|lag)\s+(?:vs\.?\s+)?(?:the\s+)?(?:peer|median|ctr)|avd[\s\S]{0,30}(parity|at par|matched|even|fine)|packaging\s+(?:not|over|before)\s+retention/i,
      },
    ],
  },
  {
    skill: "youtube-portfolio",
    pack: "youtube-ops",
    focus: "YouTube portfolio review",
    inputs: ["Catalog: 30 videos, 25 one-off, 5 in a series", "The 5 series videos retain viewers 2x longer"],
    expectedPattern: /youtube|portfolio|series/i,
    // Derived, not echoed: since series retain 2x, the action is to convert one-offs
    // into series — the catalog is too one-off-heavy. The fixture states the counts
    // and retention; only the review states the conversion action.
    requiredOutputPatterns: [
      {
        description: "Output recommends converting one-offs into series, not just stating the counts/retention",
        pattern: /convert[\s\S]{0,30}(one[- ]?off|standalone)[\s\S]{0,25}series|(?:expand|build|invest in|lean into|shift to)[\s\S]{0,20}(?:more\s+)?series|one[- ]?off[- ]?heavy|too many one[- ]?off/i,
      },
    ],
  },
  {
    skill: "youtube-search-positioning",
    pack: "youtube-ops",
    focus: "YouTube search positioning",
    inputs: ["Target query: 'how to benchmark agent skills'", "Our title: 'Our journey building a benchmark platform'"],
    expectedPattern: /youtube|search|positioning/i,
    // Derived, not echoed: the title doesn't match the how-to search intent, so it
    // should be reframed as a tutorial title. The fixture states the query and title;
    // only the analysis names the intent mismatch.
    requiredOutputPatterns: [
      {
        description: "Output names the query-intent mismatch and to reframe the title, not just the query/title",
        pattern: /(?:query|search)[- ]?intent\s+mismatch|(?:doesn'?t|does not|don'?t|fails? to)\s+match\b[\s\S]{0,30}(query|intent|search)|reframe[\s\S]{0,25}(title|as (?:a )?(?:how|tutorial))|(?:how[- ]?to|tutorial)\s+(?:framing|intent|reframe)|title[\s\S]{0,30}(?:doesn'?t|does not|fails?)[\s\S]{0,20}(query|intent|search)/i,
      },
    ],
  },
  {
    skill: "youtube-title-thumbnail-audit",
    pack: "youtube-ops",
    focus: "YouTube title and thumbnail audit",
    inputs: ["Title option: 'Building a benchmark'", "Title option: 'Benchmark agent skills in 5 minutes'", "Thumbnail shows a full code screenshot"],
    expectedPattern: /youtube|title|thumbnail/i,
    // Derived, not echoed: pick the specific 5-minute-payoff title, and the full code
    // screenshot is unreadable at small size — simplify to one bold element. The
    // fixture lists the options; only the audit picks and diagnoses the thumbnail.
    requiredOutputPatterns: [
      {
        description: "Output picks the specific-payoff title and flags the unreadable thumbnail, not just listing options",
        pattern: /(?:pick|choose|go with|winner|lead with|the strongest)[\s\S]{0,30}(specific|payoff|5[- ]?min|number|benefit|concrete)|thumbnail[\s\S]{0,40}(unreadable|too busy|illegib\w+|one (?:bold|clear|focal)|single (?:element|subject)|simplif\w+)|unreadable at (?:small|thumbnail|that)/i,
      },
    ],
  },
  {
    skill: "youtube-vid-research",
    pack: "youtube-ops",
    focus: "YouTube video research",
    inputs: ["Transcript excerpt: the first 30 seconds recap last week before the topic starts", "Retention graphs usually dip in the first 30 seconds"],
    expectedPattern: /youtube|video|research/i,
    // Derived, not echoed: the recap cold-open causes the early retention dip, so cut
    // it and get to the topic in the first 30s. The fixture states the transcript and
    // retention pattern; only the research states the fix.
    requiredOutputPatterns: [
      {
        description: "Output recommends cutting the recap intro to fix the early retention dip, not just the transcript",
        pattern: /(cut|drop|remove|skip|trim)[\s\S]{0,20}(recap|intro|cold[- ]?open|preamble)|get to the (?:topic|point|hook)[\s\S]{0,30}(first 30|immediately|faster|sooner|quicker)|early retention[\s\S]{0,20}(dip|drop|fix)|front[- ]?load[\s\S]{0,15}(hook|topic|value)/i,
      },
    ],
  },
  {
    skill: "youtube-video-audit",
    pack: "youtube-ops",
    focus: "YouTube single-video audit",
    inputs: ["Retention drops from 100% to 55% in the first 15 seconds", "Overall AVD is 40%"],
    expectedPattern: /youtube|video|audit/i,
    // Derived, not echoed: the first-15s cliff (100→55%) is the biggest single drop
    // and the top fix priority — rework the intro before packaging. The fixture states
    // the retention curve; only the audit names the fix priority.
    requiredOutputPatterns: [
      {
        description: "Output names the first-15s cliff as the top fix priority (rework intro), not just the retention curve",
        pattern: /(first 15|intro|opening|cold[- ]?open|hook)[\s\S]{0,40}(cliff|biggest drop|top (?:fix )?priority|fix first|rework|steepest)|(?:top|first|highest)\s+(?:fix\s+)?priority[\s\S]{0,30}(intro|opening|first 15|hook)|rework the (?:intro|opening|hook)|steepest drop/i,
      },
    ],
  },
  {
    skill: "youtube-video-prelaunch-audit",
    pack: "youtube-ops",
    focus: "YouTube prelaunch readiness audit for an unlisted video",
    inputs: ["Unlisted video URL placeholder", "Draft title", "Draft description", "Launch social platforms"],
    expectedPattern: /youtube|prelaunch|readiness|launch/i,
    requiredOutputPatterns: [
      { description: "Output covers edit readiness or polish", pattern: /edit|polish|readiness/i },
      { description: "Output covers launch strategy or publish settings", pattern: /launch|publish|schedule/i },
      { description: "Output covers social cross-sharing", pattern: /cross.?shar|social/i },
    ],
  },
];

export const PACK_WORKFLOW_SETUPS: Record<string, SkillBenchSetup> = Object.fromEntries(
  packWorkflowDefinitions.map((definition) => [definition.skill, createPackWorkflowSetup(definition)]),
);

// Test-support export: lets the offline discriminator check (and the ratchet)
// read each definition's live `inputs` / `focus` / `requiredOutputPatterns`
// directly, so the faithful-vs-transcriber check exercises the real regex rather
// than a hand-copied duplicate that could drift.
export const PACK_WORKFLOW_DEFINITIONS: ReadonlyArray<{
  skill: string;
  focus: string;
  inputs: readonly string[];
  requiredOutputPatterns?: ReadonlyArray<{ description: string; pattern: RegExp }>;
}> = packWorkflowDefinitions;

/**
 * Pack skills whose only content gate is the prompt-echoed `expectedPattern`
 * derived from `focus` — they carry no `requiredOutputPatterns`, so a transcriber
 * that copies the prompt/fixture back passes `assertResult` without doing the
 * skill's actual work. This is the tracked de-leak backlog; the shrinking ratchet
 * in tests/layer1/pack-discriminator-ratchet.test.ts pins it and forces it down.
 * Adding a `requiredOutputPatterns` entry to a definition removes it from here.
 */
export const PACK_SKILLS_WITHOUT_DISCRIMINATOR: string[] = packWorkflowDefinitions
  .filter((definition) => (definition.requiredOutputPatterns?.length ?? 0) === 0)
  .map((definition) => definition.skill);
