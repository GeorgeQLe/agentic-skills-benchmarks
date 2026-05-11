import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Assertion, RunResult } from "../../harness/types.js";

export function assertFileCreated(
  result: RunResult,
  relativePath: string,
  description = `${relativePath} created in project root`,
): Assertion {
  return {
    description,
    pass: result.files.includes(relativePath),
  };
}

export function assertAnyFileMatching(
  result: RunResult,
  predicate: (relativePath: string) => boolean,
  description: string,
): Assertion {
  return {
    description,
    pass: result.files.some(predicate),
  };
}

export function readGeneratedFile(result: RunResult, relativePath: string): string | undefined {
  if (!result.files.includes(relativePath)) return undefined;
  return readFileSync(join(result.workDir, relativePath), "utf-8");
}

export function assertContentIncludes(
  content: string,
  expected: string,
  description = `Content includes ${expected}`,
): Assertion {
  return {
    description,
    pass: content.includes(expected),
  };
}

export function assertContentMatches(
  content: string,
  pattern: RegExp,
  description: string,
): Assertion {
  return {
    description,
    pass: pattern.test(content),
  };
}
