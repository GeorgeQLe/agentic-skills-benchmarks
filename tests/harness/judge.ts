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
