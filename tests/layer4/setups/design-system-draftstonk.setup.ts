import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillBenchSetup } from "../../harness/bench-types.js";
import type { RunResult, Assertion } from "../../harness/types.js";
import { inputFixture } from "../../harness/fixtures.js";

export const designSystemDraftstonkSetup: SkillBenchSetup = {
  skill: "design-system-draftstonk",

  prompt: `You have the design-system skill installed. Read specs/ui-v1-draft-night.md and extract all design tokens into a DESIGN.md file in the project root. Follow the Google Labs Stitch format: YAML frontmatter with machine-readable tokens (colors, typography, spacing, rounded, elevation, components, animations) plus prose sections (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Animation & Motion, Components, Do's and Don'ts). Use {token.path} cross-references in component definitions. Do NOT ask questions — use the spec values directly. Write DESIGN.md and design-system-interview.md.`,

  perRunBudgetUsd: 1.5,
  timeoutMs: 240_000,

  setupProject(workDir: string): void {
    const specContent = inputFixture("ui-draft-stonk-v1.md");
    mkdirSync(join(workDir, "specs"), { recursive: true });
    writeFileSync(join(workDir, "specs/ui-v1-draft-night.md"), specContent);
  },

  assertResult(result: RunResult): Assertion[] {
    const assertions: Assertion[] = [];

    const hasDesignMd = result.files.includes("DESIGN.md");
    assertions.push({
      description: "DESIGN.md created in project root",
      pass: hasDesignMd,
    });

    if (!hasDesignMd) return assertions;

    const content = readFileSync(join(result.workDir, "DESIGN.md"), "utf-8");

    assertions.push({
      description: "Starts with YAML frontmatter",
      pass: content.startsWith("---"),
    });

    const frontmatterEnd = content.indexOf("---", 4);
    assertions.push({
      description: "Has closing frontmatter delimiter",
      pass: frontmatterEnd > 0,
    });

    if (frontmatterEnd <= 0) return assertions;

    const frontmatter = content.slice(4, frontmatterEnd);

    // Token categories
    assertions.push({
      description: "Has colors section",
      pass: frontmatter.includes("colors:"),
    });
    assertions.push({
      description: "Has typography section",
      pass: frontmatter.includes("typography:"),
    });
    assertions.push({
      description: "Has spacing section",
      pass: frontmatter.includes("spacing:"),
    });
    assertions.push({
      description: "Has rounded section",
      pass: frontmatter.includes("rounded:"),
    });
    assertions.push({
      description: "Has components section",
      pass: frontmatter.includes("components:"),
    });

    // V1-specific colors
    assertions.push({
      description: "Has primary emerald #10b981",
      pass: frontmatter.includes("#10b981"),
    });
    assertions.push({
      description: "Has bg-base slate-900 #0f172a",
      pass: frontmatter.includes("#0f172a"),
    });
    assertions.push({
      description: "Has bg-card #1e293b",
      pass: frontmatter.includes("#1e293b"),
    });
    assertions.push({
      description: "Has accent amber #fbbf24",
      pass: frontmatter.includes("#fbbf24"),
    });
    assertions.push({
      description: "Has loss red #f87171",
      pass: frontmatter.includes("#f87171"),
    });

    // Animation tokens
    assertions.push({
      description: "Has animation or transition tokens",
      pass: /animat|transition|motion/i.test(content),
    });

    // Token cross-references
    assertions.push({
      description: "Uses token cross-references",
      pass: /\{colors\.\w+\}/.test(content),
    });

    // Prose sections
    const prose = content.slice(frontmatterEnd + 3);
    assertions.push({
      description: "Has Colors prose section",
      pass: /##?\s+Colors/i.test(prose),
    });
    assertions.push({
      description: "Has Typography prose section",
      pass: /##?\s+Typography/i.test(prose),
    });
    assertions.push({
      description: "Has Components prose section",
      pass: /##?\s+Components/i.test(prose),
    });

    // Interview log
    const hasInterviewLog = result.files.some((f) =>
      f.includes("design-system-interview"),
    );
    assertions.push({
      description: "Interview log created",
      pass: hasInterviewLog,
    });

    return assertions;
  },
};
