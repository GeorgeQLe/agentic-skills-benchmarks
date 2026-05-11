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

const LAST_VERIFIED = "2026-05-11";

export const BENCH_COVERAGE_SKILLS = [
  "affected",
  "analyze-sessions",
  "assumption-tracker",
  "benchmark-test-skill",
  "bootstrap-repo",
  "brainstorm",
  "brainstorm-kanban",
  "branch-lifecycle",
  "burn-rate",
  "clone-spec-store",
  "codebase-status",
  "cohort-review",
  "commit-and-push-by-feature",
  "competitive-analysis",
  "concept-exploration",
  "content-programming",
  "create-agentic-skill",
  "create-local-skill",
  "creator-evidence-schema",
  "creator-metrics-review",
  "creator-platform-capability-matrix",
  "creator-positioning",
  "creator-presence-dossier",
  "customer-feedback",
  "dead-code",
  "debug",
  "decommission",
  "delegate",
  "deploy",
  "design-system",
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
  "experiment",
  "expert-review",
  "extract-shared-types",
  "feature-interview",
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
  "guide",
  "handoff",
  "hook-model",
  "hygiene",
  "icp",
  "install-agentic-skills",
  "investigate",
  "investor-update",
  "journey-map",
  "landing-copy",
  "lean-canvas",
  "metrics",
  "migrate",
  "monetization",
  "mono-detect",
  "mono-guard",
  "mono-plan",
  "mono-run",
  "mono-ship",
  "mvp-gap",
  "pack",
  "patch-exec-profile",
  "plan-phase",
  "platform-strategy",
  "pmf-assessment",
  "poketo-kanban",
  "positioning",
  "product-led-media-map",
  "project-fleet",
  "provision-agentic-config",
  "quality-sweep",
  "reconcile-dev-docs",
  "reconcile-research",
  "regression-check",
  "release",
  "research-bootstrap",
  "research-directory-conventions",
  "research-roadmap",
  "retro",
  "risk-register",
  "roadmap",
  "roadmap-kanban",
  "run",
  "run-kanban",
  "runway-model",
  "scaffold",
  "scale-audit",
  "series-spec",
  "session-triage",
  "ship",
  "ship-end",
  "ship-end-kanban",
  "ship-kanban",
  "skills",
  "slim-audit",
  "spec-drift",
  "spec-interview",
  "spec-interview-kanban",
  "spin-off",
  "sync",
  "sync-roadmap-kanban",
  "targeted-skill-builder",
  "trace",
  "uat",
  "uat-guide",
  "ui-consolidate",
  "ui-interview",
  "ux-variation",
  "value-prop-canvas",
  "vertical-slice-splitter",
  "video-build",
  "video-script",
  "youtube-audit",
  "youtube-cadence-diagnosis",
  "youtube-channel-audit",
  "youtube-competitive-research",
  "youtube-description-optimizer",
  "youtube-format-research",
  "youtube-peer-benchmark",
  "youtube-portfolio",
  "youtube-search-positioning",
  "youtube-title-thumbnail-audit",
  "youtube-vid-research",
  "youtube-video-audit",
] as const;

const COVERAGE_OVERRIDES: Record<string, Partial<BenchCoverageRow>> = {
  "design-system": {
    coverage_status: "custom",
    setup_path: "tests/layer4/setups/design-system.setup.ts",
    priority_tier: 1,
    fixture_type: "custom-fixture",
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
  const skills = new Map<string, string[]>();
  for (const skillPath of skillPaths()) {
    const name = frontmatterName(skillPath);
    if (!name) continue;
    const paths = skills.get(name) ?? [];
    paths.push(relative(REPO_ROOT, skillPath));
    skills.set(name, paths.sort());
  }
  return new Map([...skills.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function skillPaths(): string[] {
  return [
    ...walkSkillPaths(join(REPO_ROOT, "global")),
    ...walkSkillPaths(join(REPO_ROOT, "packs")),
  ];
}

function walkSkillPaths(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
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
