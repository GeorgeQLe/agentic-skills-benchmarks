import { readFileSync } from "node:fs";
import matter from "gray-matter";
import type { Assertion, SkillMeta } from "./types.js";

export function validFrontmatter(filePath: string): Assertion {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const meta = data as Partial<SkillMeta>;

    const missing: string[] = [];
    for (const field of ["name", "description", "type", "version"]) {
      if (!meta[field]) missing.push(field);
    }

    if (missing.length > 0) {
      return {
        description: `Frontmatter missing fields: ${missing.join(", ")}`,
        pass: false,
        detail: filePath,
      };
    }

    return { description: "Valid frontmatter", pass: true };
  } catch (err: any) {
    return {
      description: `Failed to parse frontmatter: ${err.message}`,
      pass: false,
      detail: filePath,
    };
  }
}

export function parseFrontmatter(filePath: string): SkillMeta {
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data as SkillMeta;
}

export function parseContent(filePath: string): string {
  const raw = readFileSync(filePath, "utf-8");
  const { content } = matter(raw);
  return content;
}

export function hasRequiredSections(
  markdown: string,
  sections: string[],
): Assertion {
  const headings = markdown
    .split("\n")
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim().toLowerCase());

  const missing = sections.filter(
    (s) => !headings.some((h) => h.includes(s.toLowerCase())),
  );

  if (missing.length > 0) {
    return {
      description: `Missing sections: ${missing.join(", ")}`,
      pass: false,
      detail: `Found headings: ${headings.join(", ")}`,
    };
  }

  return { description: "All required sections present", pass: true };
}

export function validDAG(dagMarkdown: string): Assertion {
  const hasMermaid = dagMarkdown.includes("```mermaid");
  if (!hasMermaid) {
    return {
      description: "DAG missing mermaid diagram",
      pass: false,
    };
  }
  return { description: "Valid DAG structure", pass: true };
}

export function hasSourceAttribution(markdown: string): Assertion {
  const sourceComments = markdown.match(/<!-- Source: .+? -->/g) ?? [];
  if (sourceComments.length === 0) {
    return {
      description: "No source attribution comments found",
      pass: false,
    };
  }
  return {
    description: `Found ${sourceComments.length} source attribution comments`,
    pass: true,
  };
}

export function hasUngroundedSection(markdown: string): Assertion {
  const hasSection =
    /#{1,3}\s+ungrounded/i.test(markdown) ||
    markdown.includes("<!-- UNGROUNDED");
  if (!hasSection) {
    return {
      description: "No ungrounded claims section or markers found",
      pass: false,
    };
  }
  return { description: "Ungrounded claims section present", pass: true };
}

export function matchesNarrativeArc(
  markdown: string,
  type: string,
): Assertion {
  const arcs: Record<string, string[]> = {
    launch: ["hook", "context", "reveal", "proof", "transformation", "cta", "outro"],
    explainer: ["hook", "problem", "concept", "application", "summary", "cta", "outro"],
    demo: ["end result", "setup", "walkthrough", "result", "cta", "outro"],
    testimonial: ["strongest quote", "problem", "discovery", "experience", "results", "cta", "outro"],
  };

  const expected = arcs[type.toLowerCase()];
  if (!expected) {
    return {
      description: `Unknown arc type: ${type}`,
      pass: false,
    };
  }

  const headings = markdown
    .split("\n")
    .filter((line) => /^#{1,4}\s/.test(line))
    .map((line) => line.replace(/^#{1,4}\s+/, "").trim().toLowerCase());

  const missing = expected.filter(
    (keyword) => !headings.some((h) => h.includes(keyword)),
  );

  if (missing.length > 0) {
    return {
      description: `Narrative arc missing sections: ${missing.join(", ")}`,
      pass: false,
      detail: `Expected arc for "${type}": ${expected.join(" → ")}. Found headings: ${headings.join(", ")}`,
    };
  }

  return {
    description: `Matches ${type} narrative arc`,
    pass: true,
  };
}
