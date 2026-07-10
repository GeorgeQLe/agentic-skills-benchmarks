import { readFileSync } from "node:fs";

export function readCodexStructuredOutput(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readClaudeStructuredOutput(stdout: string): unknown {
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  if (parsed.structured_output !== undefined) return parsed.structured_output;
  if (typeof parsed.result === "string") {
    try { return JSON.parse(parsed.result); } catch { return parsed.result; }
  }
  return parsed;
}

export function formatWorkerOutput(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
