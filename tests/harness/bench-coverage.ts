import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export type BenchCoverageStatus = "custom" | "generic" | "blocked";
export type BenchAgentScope = "codex" | "claude" | "both";

export interface BenchCoverageRow {
  skill: string;
  source_paths: string[];
  coverage_status: BenchCoverageStatus;
  setup_path?: string;
  priority_tier: 1 | 2 | 3;
  agent_scope: BenchAgentScope;
  fixture_type: string;
  blocked_reason?: string;
  next_command?: string;
  last_verified: string;
}

export interface BenchCoverageValidationResult {
  ok: boolean;
  errors: string[];
}

const LAST_VERIFIED = "2026-05-21";
const TIER23_BASE_SETUP_PATH = "tests/layer4/setups/tier23-base-workflows.setup.ts";
const PACK_WORKFLOW_SETUP_PATH = "tests/layer4/setups/packs/pack-workflows.setup.ts";

const TIER23_BASE_CUSTOM_SKILLS = [
  "affected",
  "analyze-sessions",
  "animation-design-planner",
  "bootstrap-repo",
  "brainstorm",
  "branch-lifecycle",
  "codebase-status",
  "compile-central-alignment",
  "css-transitions",
  "idea-scope-brief",
  "create-alignment-page",
  "create-agentic-skill",
  "create-local-skill",
  "dead-code",
  "debug",
  "decommission",
  "desk-flip",
  "dogfood",
  "expert-review",
  "fork-idea-branch",
  "gsap",
  "guide",
  "handoff",
  "hygiene",
  "icon-handler",
  "migrate",
  "motion-framer",
  "mono-plan",
  "pack",
  "prototype",
  "provision-agentic-config",
  "quiz-me",
  "reconcile-dev-docs",
  "regression-check",
  "report-website",
  "research-roadmap",
  "scaffold",
  "skills",
  "slim-audit",
  "spec-drift",
  "threejs",
  "trace",
  "update-packages",
  "uat",
  "consolidate-variations",
  "ui-interview",
  "ux-variations",
  "web-animations-api",
] as const;

const TIER23_BASE_BLOCKED_SKILLS: Record<string, Pick<BenchCoverageRow, "blocked_reason" | "next_command">> = {
  "autoresearch": {
    blocked_reason: "Claude-only autonomous experiment loop that mutates git branches, repeatedly edits source files, and depends on user-defined metric commands.",
    next_command: "$targeted-skill-builder autoresearch benchmark coverage",
  },
  "autoresearch-prep": {
    blocked_reason: "Claude-only prep workflow requires an interactive metric/direction interview and may run user-provided metric commands.",
    next_command: "$targeted-skill-builder autoresearch-prep benchmark coverage",
  },
  "delegate": {
    blocked_reason: "Claude-only orchestration skill with subagent dispatch semantics that Codex benchmarks cannot execute directly.",
    next_command: "$targeted-skill-builder delegate benchmark coverage",
  },
  "deploy": {
    blocked_reason: "Requires environment-specific deploy credentials, possible production safety decisions, and external service state.",
    next_command: "$guide deploy benchmark fixture",
  },
  "init-agentic-skills": {
    blocked_reason: "Mutates local Codex and Claude skill installations outside the benchmark worktree.",
    next_command: "$targeted-skill-builder init-agentic-skills benchmark coverage",
  },
  "patch-exec-profile": {
    blocked_reason: "Claude-only workflow patching skill without a Codex skill contract.",
    next_command: "$targeted-skill-builder patch-exec-profile benchmark coverage",
  },
  "release": {
    blocked_reason: "May create tags, version bumps, and publishable release artifacts; deterministic coverage needs a dry-run fixture first.",
    next_command: "$targeted-skill-builder release benchmark coverage",
  },
};

const PACK_CUSTOM_SKILLS = [
  "assumption-tracker",
  "upgrade-alignment-pages",
  "benchmark-agent-review",
  "burn-rate",
  "clone-spec-store",
  "category-design",
  "cohort-review",
  "competitive-analysis",
  "content-programming",
  "conversion-map",
  "creator-evidence-schema",
  "creator-metrics-review",
  "creator-platform-capability-matrix",
  "creator-positioning",
  "creator-presence-dossier",
  "customer-discovery",
  "customer-feedback",
  "destination-doc",
  "devtool-adoption",
  "devtool-docs-audit",
  "devtool-dx-journey",
  "devtool-integration-map",
  "devtool-monetization",
  "devtool-positioning",
  "devtool-user-map",
  "devtool-workflow",
  "enterprise-icp",
  "experiment",
  "expansion-map",
  "extract-shared-types",
  "game-audience",
  "game-comparables",
  "game-core-loop",
  "game-fantasy",
  "game-genre-map",
  "game-launch",
  "game-playtest-metrics",
  "game-prototype-test",
  "game-roadmap",
  "game-store-page-test",
  "game-workflow",
  "taste-calibration",
  "growth-model",
  "gtm",
  "hook-model",
  "investor-update",
  "journey-map",
  "jtbd-positioning",
  "landing-copy",
  "lean-canvas",
  "lifecycle-metrics",
  "metrics",
  "monetization",
  "moore-positioning",
  "mono-detect",
  "mono-guard",
  "mono-exec",
  "mono-ship",
  "mvp-gap",
  "onboarding-map",
  "obviously-awesome",
  "ord-align",
  "ord-scan",
  "ord-ship",
  "ord-traction",
  "platform-strategy",
  "pmf-assessment",
  "positioning",
  "product-led-media-map",
  "product-line",
  "prompt-history-backfill",
  "project-fleet",
  "quality-sweep",
  "reconcile-research",
  "repo-glossary",
  "research-directory-conventions",
  "retention-map",
  "retro",
  "risk-register",
  "runway-model",
  "scale-audit",
  "series-spec",
  "skill-inventory",
  "spin-off",
  "strategic-canvas",
  "transaction-map",
  "uat-guide",
  "user-flow-map",
  "vard-align",
  "vard-scan",
  "vard-ship",
  "vard-traction",
  "value-prop-canvas",
  "vertical-slice-splitter",
  "video-build",
  "video-script",
  "youtube-audit",
  "youtube-cadence-diagnosis",
  "youtube-channel-audit",
  "youtube-concept-research",
  "youtube-competitive-research",
  "youtube-derivative-cuts",
  "youtube-description-optimizer",
  "youtube-format-research",
  "youtube-peer-benchmark",
  "youtube-portfolio",
  "youtube-search-positioning",
  "youtube-title-thumbnail-audit",
  "youtube-vid-research",
  "youtube-video-audit",
  "youtube-video-prelaunch-audit",
] as const;

const PACK_BLOCKED_SKILLS: Record<string, Pick<BenchCoverageRow, "blocked_reason" | "next_command">> = {
  "env-setup": {
    blocked_reason: "Env scaffolding skill lacks a deterministic pack workflow fixture; secret-safety contract is covered by tests/layer1/env-setup-contract.test.ts.",
    next_command: "$targeted-skill-builder env-setup benchmark coverage",
  },
  "customer-journey-canvas": {
    blocked_reason: "Journey-map framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder customer-journey-canvas benchmark coverage",
  },
  "design-inspirations": {
    blocked_reason: "Design inspiration research requires live web research and source-link inspection; deterministic local fixture coverage needs a safe offline source corpus first.",
    next_command: "$targeted-skill-builder design-inspirations benchmark coverage",
  },
  "experience-map": {
    blocked_reason: "Journey-map framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder experience-map benchmark coverage",
  },
  "feature-pricing-matrix": {
    blocked_reason: "Competitive-analysis framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder feature-pricing-matrix benchmark coverage",
  },
  "five-rings": {
    blocked_reason: "Customer-discovery framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder five-rings benchmark coverage",
  },
  "four-forces": {
    blocked_reason: "Customer-discovery framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder four-forces benchmark coverage",
  },
  "jtbd-needs": {
    blocked_reason: "Customer-discovery framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder jtbd-needs benchmark coverage",
  },
  "pmf-engine": {
    blocked_reason: "Customer-discovery framework subskill requires real product/user evidence and lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder pmf-engine benchmark coverage",
  },
  "porter-five-forces": {
    blocked_reason: "Competitive-analysis framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder porter-five-forces benchmark coverage",
  },
  "jtbd-timeline": {
    blocked_reason: "Journey-map framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder jtbd-timeline benchmark coverage",
  },
  "service-blueprint": {
    blocked_reason: "Journey-map framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder service-blueprint benchmark coverage",
  },
  "seven-dimensions": {
    blocked_reason: "Customer-discovery framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder seven-dimensions benchmark coverage",
  },
  "strategic-group-map": {
    blocked_reason: "Competitive-analysis framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder strategic-group-map benchmark coverage",
  },
  "swot": {
    blocked_reason: "Competitive-analysis framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder swot benchmark coverage",
  },
  "user-story-map": {
    blocked_reason: "Journey-map framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder user-story-map benchmark coverage",
  },
  "w3-hypothesis": {
    blocked_reason: "Customer-discovery framework subskill lacks a deterministic pack workflow fixture.",
    next_command: "$targeted-skill-builder w3-hypothesis benchmark coverage",
  },
  "youtube": {
    blocked_reason: "YouTube parent router skill lacks a deterministic pack workflow fixture distinct from child YouTube ops skills.",
    next_command: "$targeted-skill-builder youtube benchmark coverage",
  },
};

export const BENCH_COVERAGE_SKILLS = [
  "affected",
  "afps-status",
  "analyze-sessions",
  "animation-design-planner",
  "autoresearch",
  "autoresearch-prep",
  "assumption-tracker",
  "benchmark-agent-review",
  "benchmark-test-skill",
  "bootstrap-repo",
  "brainstorm",
  "branch-lifecycle",
  "burn-rate",
  "category-design",
  "clone-spec-store",
  "codebase-status",
  "cohort-review",
  "commit-and-push-by-feature",
  "compile-central-alignment",
  "competitive-analysis",
  "idea-scope-brief",
  "content-programming",
  "conversion-map",
  "create-alignment-page",
  "create-agentic-skill",
  "create-local-skill",
  "creator-evidence-schema",
  "css-transitions",
  "creator-metrics-review",
  "creator-platform-capability-matrix",
  "creator-positioning",
  "creator-presence-dossier",
  "customer-discovery",
  "customer-journey-canvas",
  "customer-feedback",
  "dead-code",
  "debug",
  "decommission",
  "delegate",
  "deploy",
  "desk-flip",
  "design-system",
  "design-inspirations",
  "destination-doc",
  "devtool-adoption",
  "devtool-docs-audit",
  "devtool-dx-journey",
  "devtool-integration-map",
  "devtool-monetization",
  "devtool-positioning",
  "devtool-user-map",
  "devtool-workflow",
  "dogfood",
  "enterprise-icp",
  "env-setup",
  "experiment",
  "expansion-map",
  "experience-map",
  "expert-review",
  "extract-shared-types",
  "feature-pricing-matrix",
  "feature-interview",
  "five-rings",
  "fork-idea-branch",
  "four-forces",
  "game-audience",
  "game-comparables",
  "game-core-loop",
  "game-fantasy",
  "game-genre-map",
  "game-launch",
  "game-playtest-metrics",
  "game-prototype-test",
  "game-roadmap",
  "game-store-page-test",
  "game-workflow",
  "taste-calibration",
  "gsap",
  "growth-model",
  "gtm",
  "guide",
  "handoff",
  "hook-model",
  "hygiene",
  "icon-handler",
  "init-agentic-skills",
  "investigate",
  "investor-update",
  "journey-map",
  "jtbd-needs",
  "jtbd-positioning",
  "jtbd-timeline",
  "landing-copy",
  "lean-canvas",
  "lifecycle-metrics",
  "metrics",
  "migrate",
  "monetization",
  "moore-positioning",
  "motion-framer",
  "mono-detect",
  "mono-guard",
  "mono-plan",
  "mono-exec",
  "mono-ship",
  "mvp-gap",
  "onboarding-map",
  "obviously-awesome",
  "ord-align",
  "ord-scan",
  "ord-ship",
  "ord-traction",
  "pack",
  "patch-exec-profile",
  "plan-phase",
  "platform-strategy",
  "pmf-engine",
  "pmf-assessment",
  "porter-five-forces",
  "positioning",
  "product-led-media-map",
  "product-line",
  "prompt-history-backfill",
  "project-fleet",
  "prototype",
  "provision-agentic-config",
  "quality-sweep",
  "quiz-me",
  "reconcile-dev-docs",
  "reconcile-research",
  "repo-glossary",
  "regression-check",
  "release",
  "report-website",
  "research-directory-conventions",
  "retention-map",
  "research-roadmap",
  "retro",
  "risk-register",
  "roadmap",
  "exec",
  "runway-model",
  "scaffold",
  "scale-audit",
  "service-blueprint",
  "series-spec",
  "session-triage",
  "seven-dimensions",
  "ship",
  "ship-end",
  "skill-inventory",
  "skill-interview",
  "skills",
  "slim-audit",
  "spec-drift",
  "spec-interview",
  "spin-off",
  "strategic-canvas",
  "strategic-group-map",
  "sync",
  "swot",
  "transaction-map",
  "targeted-skill-builder",
  "threejs",
  "trace",
  "update-packages",
  "uat",
  "uat-guide",
  "consolidate-variations",
  "ui-interview",
  "upgrade-alignment-pages",
  "user-flow-map",
  "user-story-map",
  "ux-variations",
  "vard-align",
  "vard-scan",
  "vard-ship",
  "vard-traction",
  "value-prop-canvas",
  "web-animations-api",
  "vertical-slice-splitter",
  "video-build",
  "video-script",
  "w3-hypothesis",
  "youtube",
  "youtube-audit",
  "youtube-cadence-diagnosis",
  "youtube-channel-audit",
  "youtube-concept-research",
  "youtube-competitive-research",
  "youtube-derivative-cuts",
  "youtube-description-optimizer",
  "youtube-format-research",
  "youtube-peer-benchmark",
  "youtube-portfolio",
  "youtube-search-positioning",
  "youtube-title-thumbnail-audit",
  "youtube-vid-research",
  "youtube-video-audit",
  "youtube-video-prelaunch-audit",
] as const;

const COVERAGE_OVERRIDES: Record<string, Partial<BenchCoverageRow>> = {
  ...Object.fromEntries(TIER23_BASE_CUSTOM_SKILLS.map((skill) => [skill, {
    coverage_status: "custom",
    setup_path: TIER23_BASE_SETUP_PATH,
    priority_tier: 2,
    fixture_type: "base-workflow-fixture",
  }] satisfies [string, Partial<BenchCoverageRow>])),
  ...Object.fromEntries(Object.entries(TIER23_BASE_BLOCKED_SKILLS).map(([skill, blocked]) => [skill, {
    coverage_status: "blocked",
    priority_tier: 2,
    agent_scope: "codex",
    fixture_type: "blocked-external-or-claude-only",
    ...blocked,
  }] satisfies [string, Partial<BenchCoverageRow>])),
  ...Object.fromEntries(PACK_CUSTOM_SKILLS.map((skill) => [skill, {
    coverage_status: "custom",
    setup_path: PACK_WORKFLOW_SETUP_PATH,
    priority_tier: 3,
    agent_scope: "codex",
    fixture_type: "pack-local-fixture",
  }] satisfies [string, Partial<BenchCoverageRow>])),
  ...Object.fromEntries(Object.entries(PACK_BLOCKED_SKILLS).map(([skill, blocked]) => [skill, {
    coverage_status: "blocked",
    priority_tier: 3,
    agent_scope: "codex",
    fixture_type: "blocked-pack-workflow-fixture",
    ...blocked,
  }] satisfies [string, Partial<BenchCoverageRow>])),
  "commit-and-push-by-feature": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/git-fixture-commit-and-push.setup.ts",
    priority_tier: 2,
    agent_scope: "both",
    fixture_type: "git-disposable-repo-fixture",
  },
  "sync": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/git-fixture-sync.setup.ts",
    priority_tier: 2,
    agent_scope: "both",
    fixture_type: "git-disposable-repo-fixture",
  },
  "benchmark-test-skill": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "benchmark-report-fixture",
  },
  "design-system": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/design-system.setup.ts",
    priority_tier: 1,
    fixture_type: "custom-fixture",
  },
  "feature-interview": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "interview-artifact-fixture",
  },
  "investigate": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "debug-log-fixture",
  },
  "plan-phase": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "task-planning-fixture",
  },
  "roadmap": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "roadmap-fixture",
  },
  "exec": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "execution-plan-fixture",
  },
  "session-triage": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "incident-report-fixture",
  },
  "ship": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "ship-manifest-fixture",
  },
  "ship-end": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "handoff-fixture",
  },
  "skill-interview": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "skill-brief-fixture",
  },
  "spec-interview": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "spec-artifact-fixture",
  },
  "targeted-skill-builder": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/tier1-workflows.setup.ts",
    priority_tier: 1,
    fixture_type: "skill-update-plan-fixture",
  },
};

export function benchmarkCoverageMatrix(): BenchCoverageRow[] {
  const discovered = discoverRepositorySkills();

  return [...BENCH_COVERAGE_SKILLS].sort().map((skill) => {
    const override = COVERAGE_OVERRIDES[skill] ?? {};
    return {
      skill,
      source_paths: discovered.get(skill) ?? [],
      coverage_status: "generic",
      priority_tier: 3,
      agent_scope: "codex",
      fixture_type: "generic-smoke",
      last_verified: LAST_VERIFIED,
      ...override,
    };
  });
}

export function coverageForSkill(skill: string): BenchCoverageRow | undefined {
  return benchmarkCoverageMatrix().find((row) => row.skill === skill);
}

export function validateBenchmarkCoverage(
  rows: BenchCoverageRow[] = benchmarkCoverageMatrix(),
  repositorySkills: Map<string, string[]> = discoverRepositorySkills(),
): BenchCoverageValidationResult {
  const errors: string[] = [];
  const rowBySkill = new Map<string, BenchCoverageRow>();

  for (const row of rows) {
    if (rowBySkill.has(row.skill)) {
      errors.push(`Duplicate benchmark coverage row for skill "${row.skill}".`);
    }
    rowBySkill.set(row.skill, row);

    if (row.coverage_status === "custom") {
      if (!row.setup_path) {
        errors.push(`Custom benchmark coverage row for "${row.skill}" must include setup_path.`);
      } else if (!existsSync(join(REPO_ROOT, row.setup_path))) {
        errors.push(`Custom benchmark coverage row for "${row.skill}" points to missing setup_path: ${row.setup_path}.`);
      }
    }

    if (row.coverage_status === "blocked") {
      if (!row.blocked_reason?.trim()) {
        errors.push(`Blocked benchmark coverage row for "${row.skill}" must include blocked_reason.`);
      }
      if (!row.next_command?.trim()) {
        errors.push(`Blocked benchmark coverage row for "${row.skill}" must include next_command.`);
      }
    }
  }

  for (const skill of repositorySkills.keys()) {
    if (!rowBySkill.has(skill)) {
      errors.push(`Repository skill "${skill}" is missing from benchmark coverage matrix.`);
    }
  }

  for (const row of rows) {
    if (!repositorySkills.has(row.skill)) {
      errors.push(`Benchmark coverage row "${row.skill}" does not match any repository skill.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function discoverRepositorySkills(): Map<string, string[]> {
  return new Map(discoverRepositorySkillsCached());
}

let repositorySkillsCache: Map<string, string[]> | undefined;

function discoverRepositorySkillsCached(): Map<string, string[]> {
  if (repositorySkillsCache) return repositorySkillsCache;

  const skills = new Map<string, string[]>();
  for (const skillPath of skillPaths()) {
    const name = frontmatterName(skillPath);
    if (!name) continue;
    const paths = skills.get(name) ?? [];
    paths.push(relative(REPO_ROOT, skillPath));
    skills.set(name, paths.sort());
  }
  repositorySkillsCache = new Map([...skills.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return repositorySkillsCache;
}

function skillPaths(): string[] {
  return [
    ...walkSkillPaths(join(REPO_ROOT, "base")),
    ...walkSkillPaths(join(REPO_ROOT, "packs")),
  ];
}

function walkSkillPaths(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      paths.push(...walkSkillPaths(fullPath));
    } else if (entry.name === "SKILL.md") {
      paths.push(fullPath);
    }
  }
  return paths;
}

function frontmatterName(skillPath: string): string | undefined {
  const content = readFileSync(skillPath, "utf8");
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const match = frontmatter.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m);
  return match?.[1]?.trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateBenchmarkCoverage();
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(`Benchmark coverage matrix valid (${benchmarkCoverageMatrix().length} skills).`);
}
