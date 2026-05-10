import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillBenchSetup } from "../../harness/bench-types.js";
import type { RunResult, Assertion } from "../../harness/types.js";
import { inputFixture } from "../../harness/fixtures.js";

export const designSystemSetup: SkillBenchSetup = {
  skill: "design-system",

  prompt: `You have the design-system skill installed. Read specs/ui-final-dashboard.md and extract all design tokens into a DESIGN.md file in the project root. Follow the Google Labs Stitch format: YAML frontmatter with machine-readable tokens (colors, typography, spacing, rounded, elevation, components) plus prose sections (Overview, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts). Use {token.path} cross-references in component definitions. Do NOT ask questions — use the spec values directly. Write DESIGN.md and design-system-interview.md.`,

  perRunBudgetUsd: 1.0,
  timeoutMs: 180_000,

  setupProject(workDir: string): void {
    const specContent = inputFixture("ui-final-dashboard.md");
    mkdirSync(join(workDir, "specs"), { recursive: true });
    writeFileSync(join(workDir, "specs/ui-final-dashboard.md"), specContent);
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
      description: "Has primary color #2563EB",
      pass: frontmatter.includes("#2563EB"),
    });
    assertions.push({
      description: "Has surface color #FAFAFA",
      pass: frontmatter.includes("#FAFAFA"),
    });
    assertions.push({
      description: "Uses token cross-references",
      pass: /\{colors\.\w+\}/.test(content),
    });

    const prose = content.slice(frontmatterEnd + 3);
    assertions.push({
      description: "Has Colors prose section",
      pass: /##?\s+Colors/i.test(prose),
    });
    assertions.push({
      description: "Has Typography prose section",
      pass: /##?\s+Typography/i.test(prose),
    });

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
