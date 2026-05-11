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
import {
  concreteFileReferenceCriterion,
  createSetupQualityEvaluator,
  forbiddenFabricationCriterion,
  referenceTraitCriterion,
  requiredFactCoverageCriterion,
  requiredPatternCriterion,
} from "../setup-helpers/quality.js";

export const designSystemSetup: SkillBenchSetup = {
  skill: "design-system",

  prompt: `You have the design-system skill installed. Read specs/ui-final-dashboard.md and extract all design tokens into a DESIGN.md file in the project root. Follow the Google Labs Stitch format: YAML frontmatter with machine-readable tokens (colors, typography, spacing, rounded, elevation, components) plus prose sections (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts). Use {token.path} cross-references in component definitions. Do NOT ask questions — use the spec values directly. Write DESIGN.md and design-system-interview.md.`,
  qualityOutputPath: "DESIGN.md",
  qualityEvaluator: createSetupQualityEvaluator({
    minimumScore: 0.85,
    criteria: [
      requiredFactCoverageCriterion({
        id: "design-token-facts",
        description: "Output preserves fixture color token facts from the source spec.",
        weight: 3,
        critical: true,
        facts: ["#2563EB", "#FAFAFA"],
      }),
      requiredPatternCriterion({
        id: "stitch-frontmatter-shape",
        description: "Output includes Stitch-style token groups in YAML frontmatter.",
        weight: 3,
        critical: true,
        patterns: [/^---[\s\S]*colors:/i, /^---[\s\S]*typography:/i, /^---[\s\S]*spacing:/i],
      }),
      referenceTraitCriterion({
        id: "component-token-cross-references",
        description: "Output links component guidance to token references and prose sections.",
        weight: 2,
        traits: ["{", "Colors", "Typography", "Components"],
      }),
      concreteFileReferenceCriterion({
        id: "interview-artifact-reference",
        description: "Output references the companion interview artifact requested by the setup.",
        weight: 1,
        files: ["design-system-interview.md"],
      }),
      forbiddenFabricationCriterion({
        id: "no-fabricated-design-values",
        description: "Output avoids design values not present in the fixture.",
        weight: 2,
        critical: true,
        forbidden: ["#8B5CF6", "Inter Tight", "glassmorphism", "neon"],
      }),
    ],
  }),

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
