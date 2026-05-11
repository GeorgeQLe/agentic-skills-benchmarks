import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SkillBenchSetup } from "../../harness/bench-types.js";
import type { RunResult, Assertion } from "../../harness/types.js";
import { inputFixture } from "../../harness/fixtures.js";
import {
  assertAnyFileMatching,
  assertContentIncludes,
  assertContentMatches,
  assertFileCreated,
  readGeneratedFile,
} from "../setup-helpers/artifacts.js";
import { BENCH_BUDGETS_USD, BENCH_TIMEOUTS_MS } from "../setup-helpers/budgets.js";
import {
  assertFrontmatterKeys,
  assertMarkdownHeadings,
  assertTokenCrossReferences,
  parseYamlFrontmatter,
} from "../setup-helpers/markdown.js";

export const designSystemDraftstonkSetup: SkillBenchSetup = {
  skill: "design-system-draftstonk",

  prompt: `You have the design-system skill installed. Read specs/ui-v1-draft-night.md and extract all design tokens into a DESIGN.md file in the project root. Follow the Google Labs Stitch format: YAML frontmatter with machine-readable tokens (colors, typography, spacing, rounded, elevation, components, animations) plus prose sections (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Animation & Motion, Components, Do's and Don'ts). Use {token.path} cross-references in component definitions. Do NOT ask questions — use the spec values directly. Write DESIGN.md and design-system-interview.md.`,

  perRunBudgetUsd: BENCH_BUDGETS_USD.expanded,
  timeoutMs: BENCH_TIMEOUTS_MS.focused,

  setupProject(workDir: string): void {
    const specContent = inputFixture("ui-draft-stonk-v1.md");
    mkdirSync(join(workDir, "specs"), { recursive: true });
    writeFileSync(join(workDir, "specs/ui-v1-draft-night.md"), specContent);
  },

  assertResult(result: RunResult): Assertion[] {
    const assertions: Assertion[] = [];

    assertions.push(assertFileCreated(result, "DESIGN.md"));

    const content = readGeneratedFile(result, "DESIGN.md");
    if (!content) return assertions;

    const frontmatterResult = parseYamlFrontmatter(content);
    assertions.push(...frontmatterResult.assertions);

    if (!frontmatterResult.frontmatter) return assertions;

    assertions.push(...assertFrontmatterKeys(frontmatterResult.frontmatter, [
      "colors",
      "typography",
      "spacing",
      "rounded",
      "components",
    ]));

    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#10b981", "Has primary emerald #10b981"));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#0f172a", "Has bg-base slate-900 #0f172a"));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#1e293b", "Has bg-card #1e293b"));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#fbbf24", "Has accent amber #fbbf24"));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#f87171", "Has loss red #f87171"));

    assertions.push(assertContentMatches(content, /animat|transition|motion/i, "Has animation or transition tokens"));

    assertions.push(assertTokenCrossReferences(content));

    assertions.push(...assertMarkdownHeadings(frontmatterResult.prose, [
      "Colors",
      "Typography",
      "Components",
    ]));

    assertions.push(assertAnyFileMatching(
      result,
      (f) => f.includes("design-system-interview"),
      "Interview log created",
    ));

    return assertions;
  },
};
