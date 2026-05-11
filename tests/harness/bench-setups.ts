import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { designSystemSetup } from "../layer4/setups/design-system.setup.js";
import { designSystemDraftstonkSetup } from "../layer4/setups/design-system-draftstonk.setup.js";
import type { SkillBenchSetup } from "./bench-types.js";
import type { Assertion, RunResult } from "./types.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const CUSTOM_BENCH_SETUPS: Record<string, SkillBenchSetup> = {
  "design-system": designSystemSetup,
  "design-system-draftstonk": designSystemDraftstonkSetup,
};

export function supportedBenchSkills(): string[] {
  return allRepositorySkillNames();
}

export function resolveBenchSetup(skill: string): SkillBenchSetup | undefined {
  return CUSTOM_BENCH_SETUPS[skill] ?? (
    allRepositorySkillNames().includes(skill) ? genericBenchSetup(skill) : undefined
  );
}

export function allRepositorySkillNames(): string[] {
  const names = new Set<string>();
  for (const skillPath of skillPaths()) {
    const name = frontmatterName(skillPath);
    if (name) names.add(name);
  }
  return [...names].sort();
}

function skillPaths(): string[] {
  return [
    ...globalSkillPaths("global/claude"),
    ...globalSkillPaths("global/codex"),
    ...packSkillPaths("packs"),
  ];
}

function globalSkillPaths(relativeDir: string): string[] {
  const dir = join(REPO_ROOT, relativeDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name, "SKILL.md"))
    .filter((path) => existsSync(path));
}

function packSkillPaths(relativeDir: string): string[] {
  const packsDir = join(REPO_ROOT, relativeDir);
  if (!existsSync(packsDir)) return [];

  const paths: string[] = [];
  for (const pack of readdirSync(packsDir, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue;
    for (const platform of ["claude", "codex"]) {
      const platformDir = join(packsDir, pack.name, platform);
      if (!existsSync(platformDir)) continue;
      for (const skill of readdirSync(platformDir, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue;
        const skillPath = join(platformDir, skill.name, "SKILL.md");
        if (existsSync(skillPath)) paths.push(skillPath);
      }
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

function genericBenchSetup(skill: string): SkillBenchSetup {
  return {
    skill,
    prompt: `You have the ${skill} skill installed. Run a minimal smoke exercise for that skill using the local repository context only. Do not ask follow-up questions. Write a file named benchmark-output.md in the project root with: a heading containing "${skill}", a concise summary of what the skill would do for this repository, and a "Next command:" line. Keep the output short and deterministic.`,
    perRunBudgetUsd: 0.25,
    timeoutMs: 180_000,

    setupProject(workDir: string): void {
      writeFileSync(
        join(workDir, "benchmark-input.md"),
        [
          `# Generic benchmark input for ${skill}`,
          "",
          "This is a smoke benchmark for repository skill invocation.",
          "Use local context only and produce benchmark-output.md.",
          "",
        ].join("\n"),
      );
    },

    assertResult(result: RunResult): Assertion[] {
      const assertions: Assertion[] = [
        {
          description: "Agent command exited successfully",
          pass: result.exitCode === 0,
        },
        {
          description: "benchmark-output.md created in project root",
          pass: result.files.includes("benchmark-output.md"),
        },
      ];

      if (result.files.includes("benchmark-output.md")) {
        const content = readFileSync(join(result.workDir, "benchmark-output.md"), "utf8");
        assertions.push({
          description: "Output names the benchmarked skill",
          pass: content.toLowerCase().includes(skill.toLowerCase()),
        });
        assertions.push({
          description: "Output includes next command handoff",
          pass: /next command:/i.test(content),
        });
      }

      return assertions;
    },
  };
}
