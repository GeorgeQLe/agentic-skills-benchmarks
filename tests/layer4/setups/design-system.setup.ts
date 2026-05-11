import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SkillBenchSetup } from "../../harness/bench-types.js";
import type { RunResult, Assertion } from "../../harness/types.js";
import { inputFixture } from "../../harness/fixtures.js";
import {
  assertAnyFileMatching,
  assertContentIncludes,
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

export const designSystemSetup: SkillBenchSetup = {
  skill: "design-system",

  prompt: `You have the design-system skill installed. Read specs/ui-final-dashboard.md and extract all design tokens into a DESIGN.md file in the project root. Follow the Google Labs Stitch format: YAML frontmatter with machine-readable tokens (colors, typography, spacing, rounded, elevation, components) plus prose sections (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts). Use {token.path} cross-references in component definitions. Do NOT ask questions — use the spec values directly. Write DESIGN.md and design-system-interview.md.`,

  perRunBudgetUsd: BENCH_BUDGETS_USD.standard,
  timeoutMs: BENCH_TIMEOUTS_MS.standard,

  setupProject(workDir: string): void {
    const specContent = inputFixture("ui-final-dashboard.md");
    mkdirSync(join(workDir, "specs"), { recursive: true });
    writeFileSync(join(workDir, "specs/ui-final-dashboard.md"), specContent);
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
    ]));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#2563EB", "Has primary color #2563EB"));
    assertions.push(assertContentIncludes(frontmatterResult.frontmatter, "#FAFAFA", "Has surface color #FAFAFA"));
    assertions.push(assertTokenCrossReferences(content));

    assertions.push(...assertMarkdownHeadings(frontmatterResult.prose, [
      "Colors",
      "Typography",
    ]));

    assertions.push(assertAnyFileMatching(
      result,
      (f) => f.includes("design-system-interview"),
      "Interview log created",
    ));

    return assertions;
  },
};
