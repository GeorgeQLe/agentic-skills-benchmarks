import type { Assertion } from "../../harness/types.js";

export interface FrontmatterParseResult {
  frontmatter: string;
  prose: string;
  assertions: Assertion[];
}

export function parseYamlFrontmatter(content: string): FrontmatterParseResult {
  const assertions: Assertion[] = [
    {
      description: "Starts with YAML frontmatter",
      pass: content.startsWith("---"),
    },
  ];

  const frontmatterEnd = content.indexOf("---", 4);
  assertions.push({
    description: "Has closing frontmatter delimiter",
    pass: frontmatterEnd > 0,
  });

  if (frontmatterEnd <= 0) {
    return { frontmatter: "", prose: "", assertions };
  }

  return {
    frontmatter: content.slice(4, frontmatterEnd),
    prose: content.slice(frontmatterEnd + 3),
    assertions,
  };
}

export function assertFrontmatterKeys(frontmatter: string, keys: string[]): Assertion[] {
  return keys.map((key) => ({
    description: `Has ${key} section`,
    pass: frontmatter.includes(`${key}:`),
  }));
}

export function assertMarkdownHeadings(prose: string, headings: string[]): Assertion[] {
  return headings.map((heading) => ({
    description: `Has ${heading} prose section`,
    pass: new RegExp(`##?\\s+${escapeRegExp(heading)}`, "i").test(prose),
  }));
}

export function assertTokenCrossReferences(content: string): Assertion {
  return {
    description: "Uses token cross-references",
    pass: /\{colors\.\w+\}/.test(content),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
