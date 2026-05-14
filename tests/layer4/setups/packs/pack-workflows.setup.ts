import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

interface PackWorkflowDefinition {
  skill: string;
  pack: string;
  focus: string;
  inputs: string[];
  expectedPattern: RegExp;
  promptRequirements?: string[];
  requiredOutputPatterns?: Array<{ description: string; pattern: RegExp }>;
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
  kanban: {
    id: "kanban-context",
    facts: ["kanban", "card"],
    traits: ["board", "lane", "handoff"],
  },
  monorepo: {
    id: "monorepo-context",
    facts: ["monorepo", "validation"],
    traits: ["package", "workspace", "lane"],
  },
  "poketowork-kanban": {
    id: "kanban-context",
    facts: ["kanban", "board"],
    traits: ["card", "roadmap", "sync"],
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
    perRunBudgetUsd: BENCH_BUDGETS_USD.smoke,
    timeoutMs: BENCH_TIMEOUTS_MS.smoke,
    qualityEvaluator: createPackQualityEvaluator(definition),

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
  if (definition.skill !== "content-programming") {
    return [];
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
  { skill: "benchmark-agent-review", pack: "agentic-skills-bench", focus: "subjective quality review of persisted skill output artifacts", inputs: ["Hard assertions: 100%", "Deterministic quality score: 78.6%", "Reviewed output: ship-manifest.md is compliant but lacks residual-risk awareness", "Reviewer concern: do not judge benchmark laxness as the primary issue"], expectedPattern: /output|quality|review|score/i, nextRoute: "$targeted-skill-builder", forbidden: ["google analytics", "stripe dashboard", "salesforce", "hubspot", "api dashboard", "industry-leading", "best-in-class", "proprietary data"] },
  { skill: "brainstorm-kanban", pack: "kanban", focus: "board-aware idea generation and card routing", inputs: ["Backlog has three stale discovery cards", "Need one next experiment"], expectedPattern: /kanban|card|board/i },
  { skill: "burn-rate", pack: "business-ops", focus: "runway and burn-rate analysis", inputs: ["Cash: 120000", "Monthly burn: 18000"], expectedPattern: /burn|runway|cash/i },
  { skill: "clone-spec-store", pack: "project-fleet", focus: "spec-store clone plan without network execution", inputs: ["Spec store URL is unavailable in benchmark", "Need local checklist"], expectedPattern: /clone|spec|store/i },
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
  { skill: "icp", pack: "business-discovery", focus: "ideal customer profile", inputs: ["Small teams", "Repeated manual research"], expectedPattern: /ideal customer|icp|profile/i },
  { skill: "investor-update", pack: "business-ops", focus: "investor update structure", inputs: ["Wins", "Metrics", "Asks"], expectedPattern: /investor|update|metrics/i },
  { skill: "journey-map", pack: "customer-lifecycle", focus: "customer journey map", inputs: ["Awareness", "Trial", "Activation"], expectedPattern: /journey|customer|activation/i },
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
  { skill: "mono-run", pack: "monorepo", focus: "monorepo run planning", inputs: ["Affected package", "Validation command"], expectedPattern: /monorepo|run|validation/i },
  { skill: "mono-ship", pack: "monorepo", focus: "monorepo ship plan", inputs: ["Package changes", "Commit boundary"], expectedPattern: /ship|monorepo|commit/i },
  { skill: "mvp-gap", pack: "business-ops", focus: "MVP gap analysis", inputs: ["Missing onboarding", "Missing billing"], expectedPattern: /mvp|gap|missing/i },
  { skill: "platform-strategy", pack: "business-ops", focus: "platform strategy", inputs: ["API", "Marketplace", "Partners"], expectedPattern: /platform|strategy|partner/i },
  { skill: "pmf-assessment", pack: "business-growth", focus: "PMF assessment", inputs: ["Retention", "Pull signal", "Willingness to pay"], expectedPattern: /pmf|retention|signal/i },
  { skill: "poketo-kanban", pack: "poketowork-kanban", focus: "Poketo board operation plan", inputs: ["Board ID", "Card state"], expectedPattern: /poketo|kanban|board/i },
  { skill: "positioning", pack: "business-discovery", focus: "positioning narrative", inputs: ["Target user", "Alternative", "Differentiator"], expectedPattern: /positioning|target|differentiator/i },
  { skill: "product-led-media-map", pack: "creator-foundation", focus: "product-led media map", inputs: ["Feature launch", "Educational series"], expectedPattern: /media|product|map/i },
  { skill: "project-fleet", pack: "project-fleet", focus: "project fleet inventory", inputs: ["Project A active", "Project B stale"], expectedPattern: /project|fleet|inventory/i },
  { skill: "quality-sweep", pack: "code-quality", focus: "quality sweep audit", inputs: ["Unchecked error handling", "Missing regression test"], expectedPattern: /quality|sweep|audit/i },
  { skill: "reconcile-research", pack: "business-ops", focus: "research reconciliation", inputs: ["Old customer notes", "New survey"], expectedPattern: /research|reconcile|source/i },
  { skill: "research-bootstrap", pack: "creator-foundation", focus: "research directory bootstrap", inputs: ["YouTube", "LinkedIn", "Manual exports"], expectedPattern: /research|directory|bootstrap/i },
  { skill: "research-directory-conventions", pack: "creator-foundation", focus: "research directory conventions", inputs: ["Platform folders", "Dated snapshots"], expectedPattern: /directory|convention|snapshot/i },
  { skill: "retro", pack: "business-ops", focus: "retrospective synthesis", inputs: ["What worked", "What failed", "Actions"], expectedPattern: /retro|action|lesson/i },
  { skill: "risk-register", pack: "business-ops", focus: "risk register", inputs: ["Risk", "Likelihood", "Mitigation"], expectedPattern: /risk|mitigation|register/i },
  { skill: "roadmap-kanban", pack: "kanban", focus: "roadmap to kanban cards", inputs: ["Phase 1", "Phase 2"], expectedPattern: /roadmap|kanban|card/i },
  { skill: "run-kanban", pack: "kanban", focus: "kanban execution step", inputs: ["Current card", "Acceptance criteria"], expectedPattern: /run|kanban|card/i },
  { skill: "runway-model", pack: "business-ops", focus: "runway model", inputs: ["Cash", "Revenue", "Burn"], expectedPattern: /runway|cash|burn/i },
  { skill: "scale-audit", pack: "business-ops", focus: "scale readiness audit", inputs: ["Support load", "Operational bottleneck"], expectedPattern: /scale|audit|bottleneck/i },
  { skill: "series-spec", pack: "creator-foundation", focus: "content series specification", inputs: ["Audience promise", "Episode template"], expectedPattern: /series|spec|episode/i },
  { skill: "ship-end-kanban", pack: "kanban", focus: "kanban session wrap-up", inputs: ["Completed card", "Next card"], expectedPattern: /ship-end|kanban|next/i },
  { skill: "ship-kanban", pack: "kanban", focus: "kanban shipping plan", inputs: ["Card complete", "Validation evidence"], expectedPattern: /ship|kanban|validation/i },
  { skill: "spec-interview-kanban", pack: "kanban", focus: "spec interview to kanban card", inputs: ["Open product question", "Board swimlane"], expectedPattern: /spec|interview|kanban/i },
  { skill: "spin-off", pack: "project-fleet", focus: "project spin-off plan", inputs: ["Shared code", "New repository target"], expectedPattern: /spin.?off|project|repository/i },
  { skill: "sync-roadmap-kanban", pack: "poketowork-kanban", focus: "roadmap and kanban synchronization", inputs: ["Roadmap step", "Poketo card"], expectedPattern: /sync|roadmap|kanban/i },
  { skill: "value-prop-canvas", pack: "business-discovery", focus: "value proposition canvas", inputs: ["Jobs", "Pains", "Gains"], expectedPattern: /value proposition|canvas|pain/i },
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
];

export const PACK_WORKFLOW_SETUPS: Record<string, SkillBenchSetup> = Object.fromEntries(
  packWorkflowDefinitions.map((definition) => [definition.skill, createPackWorkflowSetup(definition)]),
);
