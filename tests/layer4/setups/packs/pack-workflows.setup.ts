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

function domainContextLine(definition: PackWorkflowDefinition): string | undefined {
  const ctx = packFamilyContexts[definition.pack];
  if (!ctx) return undefined;
  const facts = ctx.facts.join(" and ");
  const traits = ctx.traits.join(", ");
  return `- domain context: this ${definition.pack} workflow covers ${facts} with attention to ${traits}`;
}

function domainContextFixtureSection(definition: PackWorkflowDefinition): string[] {
  const ctx = packFamilyContexts[definition.pack];
  if (!ctx) return [];
  return [
    "## Domain Context",
    "",
    `Pack family: ${definition.pack}`,
    `Key concerns: ${ctx.facts.join(", ")}`,
    `Practical dimensions: ${ctx.traits.join(", ")}`,
    "",
  ];
}

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
      ...(domainContextLine(definition) ? [domainContextLine(definition)!] : []),
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
          ...domainContextFixtureSection(definition),
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
    id: `${definition.skill}-pack-quality`,
    minimumScore: 0.75,
    criteria: [
      requiredFactCoverageCriterion({
        id: "pack-skill-context",
        description: "Names the exact pack and skill under benchmark.",
        weight: 2,
        critical: true,
        facts: [definition.pack, definition.skill],
      }),
      requiredFactCoverageCriterion({
        id: "pack-fixture-evidence",
        description: "Uses deterministic local fixture evidence instead of generic pack prose.",
        weight: 2,
        critical: true,
        facts: ["pack-input.md", "fixtures/local-evidence.md", ...definition.inputs.slice(0, 2)],
      }),
      specificityCriterion({
        id: "pack-practical-risk-or-validation",
        description: "Includes a practical risk, assumption, or validation detail for the pack workflow.",
        weight: 1,
        requiredAny: ["risk", "risks", "assumption", "assumptions", "validation", "validate", "metric", "evidence"],
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

const packWorkflowDefinitions: PackWorkflowDefinition[] = [
  { skill: "assumption-tracker", pack: "business-ops", focus: "assumption inventory with owner and validation cadence", inputs: ["Unverified pricing assumption", "Unknown onboarding conversion"], expectedPattern: /assumption|validation|owner/i },
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
  { skill: "burn-rate", pack: "business-ops", focus: "runway and burn-rate analysis", inputs: ["Cash: 120000", "Monthly burn: 18000"], expectedPattern: /burn|runway|cash/i },
  { skill: "clone-spec-store", pack: "project-fleet", focus: "spec-store clone plan without network execution", inputs: ["Spec store URL is unavailable in benchmark", "Need local checklist"], expectedPattern: /clone|spec|store/i },
  { skill: "category-design", pack: "business-discovery", focus: "category diagnosis and POV development", inputs: ["Existing categories underserve the target segment", "Competitors frame the problem too narrowly"], expectedPattern: /category|positioning|pov|market/i },
  { skill: "cohort-review", pack: "business-ops", focus: "cohort retention and activation review", inputs: ["Week 1 activation: 42%", "Week 4 retained: 18%"], expectedPattern: /cohort|retention|activation/i },
  { skill: "competitive-analysis", pack: "business-discovery", focus: "competitor comparison and positioning gaps", inputs: ["Competitor A has onboarding templates", "Competitor B has integrations"], expectedPattern: /competitor|positioning|gap/i },
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
  { skill: "creator-evidence-schema", pack: "creator-foundation", focus: "evidence schema fields and provenance", inputs: ["YouTube export", "LinkedIn manual snapshot"], expectedPattern: /evidence|schema|provenance/i },
  { skill: "creator-metrics-review", pack: "creator-foundation", focus: "creator metrics interpretation", inputs: ["CTR: 4.5%", "Average view duration: 38%"], expectedPattern: /metrics|ctr|duration/i },
  { skill: "creator-platform-capability-matrix", pack: "creator-foundation", focus: "platform capability matrix", inputs: ["YouTube analytics available", "LinkedIn export manual"], expectedPattern: /platform|capability|matrix/i },
  { skill: "creator-positioning", pack: "creator-foundation", focus: "creator positioning statement", inputs: ["Audience: agentic engineers", "Differentiator: workflow library"], expectedPattern: /positioning|audience|differentiator/i },
  { skill: "creator-presence-dossier", pack: "creator-foundation", focus: "presence dossier from local evidence", inputs: ["Website bio", "Repository proof"], expectedPattern: /presence|dossier|evidence/i },
  { skill: "customer-feedback", pack: "business-discovery", focus: "customer feedback synthesis", inputs: ["Users ask for faster setup", "Users dislike vague docs"], expectedPattern: /feedback|customer|theme/i },
  { skill: "destination-doc", pack: "alignment-loop", focus: "destination document for desired state", inputs: ["Current state unclear", "Target launch in two weeks"], expectedPattern: /destination|current|target/i },
  { skill: "devtool-adoption", pack: "devtool", focus: "developer adoption motion", inputs: ["Install friction", "First successful run"], expectedPattern: /adoption|developer|friction/i },
  { skill: "devtool-docs-audit", pack: "devtool", focus: "developer documentation audit", inputs: ["Quickstart missing verification", "API examples outdated"], expectedPattern: /docs|quickstart|audit/i },
  { skill: "devtool-dx-journey", pack: "devtool", focus: "developer experience journey map", inputs: ["Discovery", "Install", "First integration"], expectedPattern: /journey|developer|install/i },
  { skill: "devtool-integration-map", pack: "devtool", focus: "integration surface map", inputs: ["CLI", "SDK", "Webhook"], expectedPattern: /integration|surface|map/i },
  { skill: "devtool-monetization", pack: "devtool", focus: "developer tool monetization", inputs: ["Free tier", "Team plan"], expectedPattern: /monetization|pricing|plan/i },
  { skill: "devtool-positioning", pack: "devtool", focus: "developer tool positioning", inputs: ["Faster agent workflows", "Open-source proof"], expectedPattern: /positioning|developer|proof/i },
  { skill: "devtool-user-map", pack: "devtool", focus: "developer user segmentation", inputs: ["Solo maintainer", "Platform team"], expectedPattern: /user|segment|developer/i },
  { skill: "devtool-workflow", pack: "devtool", focus: "developer workflow design", inputs: ["Local validation", "Ship gate"], expectedPattern: /workflow|developer|validation/i },
  { skill: "enterprise-icp", pack: "business-discovery", focus: "enterprise ICP definition", inputs: ["Security review required", "Multiple buying roles"], expectedPattern: /enterprise|icp|buyer/i },
  { skill: "experiment", pack: "business-growth", focus: "growth experiment design", inputs: ["Hypothesis", "Success metric", "Guardrail"], expectedPattern: /experiment|hypothesis|metric/i },
  { skill: "extract-shared-types", pack: "code-quality", focus: "shared type extraction plan", inputs: ["Duplicate User type", "Duplicate Account type"], expectedPattern: /shared|type|duplicate/i },
  { skill: "game-audience", pack: "game", focus: "game audience definition", inputs: ["Cozy strategy players", "Short sessions"], expectedPattern: /audience|player|game/i },
  { skill: "game-comparables", pack: "game", focus: "game comparable analysis", inputs: ["Comparable A", "Comparable B"], expectedPattern: /comparable|game|market/i },
  { skill: "game-core-loop", pack: "game", focus: "core loop articulation", inputs: ["Collect", "Upgrade", "Challenge"], expectedPattern: /core loop|collect|upgrade/i },
  { skill: "game-fantasy", pack: "game", focus: "player fantasy", inputs: ["Be the clever shopkeeper", "Optimize daily choices"], expectedPattern: /fantasy|player|game/i },
  { skill: "game-genre-map", pack: "game", focus: "genre map", inputs: ["Sim", "Strategy", "Idle"], expectedPattern: /genre|map|game/i },
  { skill: "game-launch", pack: "game", focus: "launch plan", inputs: ["Steam page", "Demo festival"], expectedPattern: /launch|steam|demo/i },
  { skill: "game-playtest-metrics", pack: "game", focus: "playtest metric plan", inputs: ["Session length", "Completion rate"], expectedPattern: /playtest|metric|session/i },
  { skill: "game-prototype-test", pack: "game", focus: "prototype test plan", inputs: ["Mechanic hypothesis", "Test script"], expectedPattern: /prototype|test|mechanic/i },
  { skill: "game-roadmap", pack: "game", focus: "game roadmap", inputs: ["Vertical slice", "Content pass"], expectedPattern: /roadmap|milestone|game/i },
  { skill: "game-store-page-test", pack: "game", focus: "store page test", inputs: ["Capsule art", "Short description"], expectedPattern: /store|page|capsule/i },
  { skill: "game-workflow", pack: "game", focus: "game production workflow", inputs: ["Design", "Prototype", "Playtest"], expectedPattern: /workflow|playtest|game/i },
  { skill: "taste-calibration", pack: "alignment-loop", focus: "adversarial questioning", inputs: ["Claim: users will pay immediately", "Evidence is thin"], expectedPattern: /question|assumption|evidence/i },
  { skill: "growth-model", pack: "business-growth", focus: "growth model", inputs: ["Acquisition", "Activation", "Referral"], expectedPattern: /growth|model|acquisition/i },
  { skill: "gtm", pack: "business-growth", focus: "go-to-market plan", inputs: ["Founder-led launch", "Community channel"], expectedPattern: /go-to-market|gtm|channel/i },
  { skill: "hook-model", pack: "business-growth", focus: "retention hook model", inputs: ["Trigger", "Action", "Reward"], expectedPattern: /hook|trigger|reward/i },
  { skill: "customer-discovery", pack: "business-discovery", focus: "customer discovery with willingness-to-pay evidence", inputs: ["Small teams", "Repeated manual research", "Budget owner and paid alternatives"], expectedPattern: /customer discovery|ideal customer|willingness-to-pay|WTP|paid alternatives/i },
  { skill: "investor-update", pack: "business-ops", focus: "investor update structure", inputs: ["Wins", "Metrics", "Asks"], expectedPattern: /investor|update|metrics/i },
  { skill: "journey-map", pack: "customer-lifecycle", focus: "customer journey map", inputs: ["Awareness", "Trial", "Activation"], expectedPattern: /journey|customer|activation/i },
  { skill: "jtbd-positioning", pack: "business-discovery", focus: "job outcome positioning", inputs: ["Customers hire the product to reduce manual planning risk", "The current alternative is spreadsheets plus meetings"], expectedPattern: /job|outcome|positioning|customer/i },
  { skill: "onboarding-map", pack: "customer-lifecycle", focus: "activation onboarding", inputs: ["Signup", "Setup", "First success"], expectedPattern: /onboarding|activation|first success/i },
  { skill: "conversion-map", pack: "customer-lifecycle", focus: "trial conversion", inputs: ["Evaluation", "Objection", "Payment trigger"], expectedPattern: /conversion|trial|objection/i },
  { skill: "transaction-map", pack: "customer-lifecycle", focus: "checkout transaction", inputs: ["Checkout", "Receipt", "Refund"], expectedPattern: /transaction|payment|refund/i },
  { skill: "retention-map", pack: "customer-lifecycle", focus: "retention loop", inputs: ["Return trigger", "Healthy usage", "Churn risk"], expectedPattern: /retention|churn|healthy/i },
  { skill: "expansion-map", pack: "customer-lifecycle", focus: "account expansion", inputs: ["Upgrade", "Seats", "Referral"], expectedPattern: /expansion|upgrade|referral/i },
  { skill: "lifecycle-metrics", pack: "customer-lifecycle", focus: "stage metrics", inputs: ["Activation rate", "Conversion rate", "Retention signal"], expectedPattern: /metrics|instrumentation|stage/i },
  { skill: "landing-copy", pack: "business-growth", focus: "landing page copy", inputs: ["Promise", "Proof", "CTA"], expectedPattern: /landing|copy|cta/i },
  { skill: "lean-canvas", pack: "business-discovery", focus: "lean canvas", inputs: ["Problem", "Solution", "Channels"], expectedPattern: /lean canvas|problem|solution/i },
  { skill: "metrics", pack: "business-growth", focus: "metric tree", inputs: ["North star", "Input metrics"], expectedPattern: /metric|north star|input/i },
  { skill: "monetization", pack: "business-growth", focus: "monetization strategy", inputs: ["Packaging", "Pricing", "Expansion"], expectedPattern: /monetization|pricing|package/i },
  { skill: "mono-detect", pack: "monorepo", focus: "monorepo detection", inputs: ["pnpm-workspace.yaml", "packages/app"], expectedPattern: /monorepo|workspace|package/i },
  { skill: "mono-guard", pack: "monorepo", focus: "parallel lane safety guard", inputs: ["Lane A owns packages/a", "Lane B owns packages/b"], expectedPattern: /guard|lane|safety/i },
  { skill: "moore-positioning", pack: "business-discovery", focus: "Geoffrey Moore positioning hypothesis", inputs: ["Target segment needs a practical positioning statement", "Evidence confidence differs by claim"], expectedPattern: /positioning|segment|unlike|evidence/i },
  { skill: "mono-exec", pack: "monorepo", focus: "monorepo run planning", inputs: ["Affected package", "Validation command"], expectedPattern: /monorepo|run|validation/i },
  { skill: "mono-ship", pack: "monorepo", focus: "monorepo ship plan", inputs: ["Package changes", "Commit boundary"], expectedPattern: /ship|monorepo|commit/i },
  { skill: "mvp-gap", pack: "business-ops", focus: "MVP gap analysis", inputs: ["Missing onboarding", "Missing billing"], expectedPattern: /mvp|gap|missing/i },
  { skill: "obviously-awesome", pack: "business-discovery", focus: "April Dunford positioning framework", inputs: ["Customer feedback names switching triggers", "Competitive alternatives are known"], expectedPattern: /alternative|attribute|value|category|positioning/i },
  { skill: "ord-align", pack: "ord", focus: "ORD candidate alignment", inputs: ["Tool concept", "API surface", "Target developer user"], expectedPattern: /ord|align|candidate/i },
  { skill: "ord-scan", pack: "ord", focus: "ORD opportunity scan", inputs: ["Developer workflow friction", "Tooling gap"], expectedPattern: /ord|scan|opportun/i },
  { skill: "ord-ship", pack: "ord", focus: "ORD shipping log and next experiment", inputs: ["Aligned tool candidate", "Adoption signal"], expectedPattern: /ord|ship|experiment/i },
  { skill: "platform-strategy", pack: "business-ops", focus: "platform strategy", inputs: ["API", "Marketplace", "Partners"], expectedPattern: /platform|strategy|partner/i },
  { skill: "pmf-assessment", pack: "business-growth", focus: "PMF assessment", inputs: ["Retention", "Pull signal", "Willingness to pay"], expectedPattern: /pmf|retention|signal/i },
  { skill: "positioning", pack: "business-discovery", focus: "positioning narrative", inputs: ["Target user", "Alternative", "Differentiator"], expectedPattern: /positioning|target|differentiator/i },
  { skill: "product-led-media-map", pack: "creator-foundation", focus: "product-led media map", inputs: ["Feature launch", "Educational series"], expectedPattern: /media|product|map/i },
  { skill: "product-line", pack: "business-ops", focus: "product-path portfolio review with activation, archive, and revisit triggers", inputs: ["Active path: core CLI", "Stale path: marketing site idle 45 days", "Revisit trigger: 30 days idle"], expectedPattern: /product|path|portfolio|activate|archive|trigger/i },
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
  { skill: "project-fleet", pack: "project-fleet", focus: "project fleet inventory", inputs: ["Project A active", "Project B stale"], expectedPattern: /project|fleet|inventory/i },
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
  { skill: "quality-sweep", pack: "code-quality", focus: "quality sweep audit", inputs: ["Unchecked error handling", "Missing regression test"], expectedPattern: /quality|sweep|audit/i },
  { skill: "reconcile-research", pack: "business-ops", focus: "research reconciliation", inputs: ["Old customer notes", "New survey"], expectedPattern: /research|reconcile|source/i },
  { skill: "repo-glossary", pack: "business-ops", focus: "shared glossary audit with stale terms and conflicts", inputs: ["Term A has conflicting definitions", "Term B is missing from the shared glossary"], expectedPattern: /glossary|term|definition|conflict/i },
  { skill: "research-directory-conventions", pack: "creator-foundation", focus: "research directory conventions", inputs: ["Platform folders", "Dated snapshots"], expectedPattern: /directory|convention|snapshot/i },
  { skill: "retro", pack: "business-ops", focus: "retrospective synthesis", inputs: ["What worked", "What failed", "Actions"], expectedPattern: /retro|action|lesson/i },
  { skill: "risk-register", pack: "business-ops", focus: "risk register", inputs: ["Risk", "Likelihood", "Mitigation"], expectedPattern: /risk|mitigation|register/i },
  { skill: "runway-model", pack: "business-ops", focus: "runway model", inputs: ["Cash", "Revenue", "Burn"], expectedPattern: /runway|cash|burn/i },
  { skill: "scale-audit", pack: "business-ops", focus: "scale readiness audit", inputs: ["Support load", "Operational bottleneck"], expectedPattern: /scale|audit|bottleneck/i },
  { skill: "series-spec", pack: "creator-foundation", focus: "content series specification", inputs: ["Audience promise", "Episode template"], expectedPattern: /series|spec|episode/i },
  { skill: "spin-off", pack: "project-fleet", focus: "project spin-off plan", inputs: ["Shared code", "New repository target"], expectedPattern: /spin.?off|project|repository/i },
  { skill: "strategic-canvas", pack: "business-discovery", focus: "Blue Ocean strategic canvas", inputs: ["Competitors over-invest in dashboards", "Customers value faster first outcome"], expectedPattern: /canvas|value curve|eliminate|reduce|raise|create|positioning/i },
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
  { skill: "value-prop-canvas", pack: "business-discovery", focus: "value proposition canvas", inputs: ["Jobs", "Pains", "Gains"], expectedPattern: /value proposition|canvas|pain/i },
  { skill: "vard-align", pack: "vard", focus: "VARD candidate alignment", inputs: ["Product concept", "Validation signal", "Risk notes"], expectedPattern: /vard|align|candidate/i },
  { skill: "vard-scan", pack: "vard", focus: "VARD opportunity scan", inputs: ["Audience problem", "Prototype wedge"], expectedPattern: /vard|scan|opportun/i },
  { skill: "vard-ship", pack: "vard", focus: "VARD shipping log and next experiment", inputs: ["Aligned concept", "Validation result"], expectedPattern: /vard|ship|experiment/i },
  { skill: "vertical-slice-splitter", pack: "alignment-loop", focus: "vertical slice breakdown", inputs: ["Large feature", "Need shippable slice"], expectedPattern: /vertical slice|split|scope/i },
  { skill: "video-build", pack: "remotion", focus: "video build plan without rendering", inputs: ["Script draft", "Scene list"], expectedPattern: /video|build|scene/i },
  { skill: "video-script", pack: "remotion", focus: "video script outline", inputs: ["Hook", "Demo", "CTA"], expectedPattern: /video|script|hook/i },
  { skill: "youtube-audit", pack: "youtube-ops", focus: "YouTube audit", inputs: ["Channel snapshot", "Recent video list"], expectedPattern: /youtube|audit|channel/i },
  { skill: "youtube-cadence-diagnosis", pack: "youtube-ops", focus: "YouTube cadence diagnosis", inputs: ["Upload dates", "Format mix"], expectedPattern: /youtube|cadence|upload/i },
  { skill: "youtube-channel-audit", pack: "youtube-ops", focus: "YouTube channel audit", inputs: ["About page", "Top videos"], expectedPattern: /youtube|channel|audit/i },
  { skill: "youtube-concept-research", pack: "youtube-ops", focus: "YouTube concept research", inputs: ["Video concept", "Comparable themes"], expectedPattern: /youtube|concept|research/i },
  { skill: "youtube-competitive-research", pack: "youtube-ops", focus: "YouTube competitive research", inputs: ["Peer channel A", "Peer channel B"], expectedPattern: /youtube|competitive|peer/i },
  { skill: "youtube-description-optimizer", pack: "youtube-ops", focus: "YouTube description optimization", inputs: ["Draft description", "Links"], expectedPattern: /youtube|description|optimi/i },
  { skill: "youtube-format-research", pack: "remotion", focus: "YouTube format research", inputs: ["Reference video", "Format notes"], expectedPattern: /youtube|format|research/i },
  { skill: "youtube-peer-benchmark", pack: "youtube-ops", focus: "YouTube peer benchmark", inputs: ["Peer metrics", "Topic clusters"], expectedPattern: /youtube|peer|benchmark/i },
  { skill: "youtube-portfolio", pack: "youtube-ops", focus: "YouTube portfolio review", inputs: ["Video catalog", "Series tags"], expectedPattern: /youtube|portfolio|series/i },
  { skill: "youtube-search-positioning", pack: "youtube-ops", focus: "YouTube search positioning", inputs: ["Target query", "Competing titles"], expectedPattern: /youtube|search|positioning/i },
  { skill: "youtube-title-thumbnail-audit", pack: "youtube-ops", focus: "YouTube title and thumbnail audit", inputs: ["Title variants", "Thumbnail notes"], expectedPattern: /youtube|title|thumbnail/i },
  { skill: "youtube-vid-research", pack: "youtube-ops", focus: "YouTube video research", inputs: ["Video URL placeholder", "Transcript excerpt"], expectedPattern: /youtube|video|research/i },
  { skill: "youtube-video-audit", pack: "youtube-ops", focus: "YouTube single-video audit", inputs: ["Retention notes", "Packaging notes"], expectedPattern: /youtube|video|audit/i },
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
