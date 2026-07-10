import { lstatSync, readFileSync } from "node:fs";
import type { ExecutionResult } from "./runner.js";
import type { RunIdentity } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameIdentity(left: RunIdentity, right: RunIdentity): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function readValidResultArtifact(path: string, expected: RunIdentity): ExecutionResult {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`result artifact is not an owned regular file: ${path}`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.run)) throw new Error(`result schema mismatch: ${expected.id}`);
  const result = parsed as unknown as ExecutionResult;
  if (!sameIdentity(result.run, expected)) throw new Error(`result identity mismatch: ${expected.id}`);
  if (result.assignmentId !== expected.assignmentId || result.scenarioId !== expected.scenarioId) throw new Error(`result ownership fields mismatch: ${expected.id}`);
  if (!Array.isArray(result.judges) || result.judges.length < 2) throw new Error(`result judges schema mismatch: ${expected.id}`);
  if (!isRecord(result.usage) || !isRecord(result.usage.openai) || !isRecord(result.usage.anthropic)
    || typeof result.usage.openaiUnits !== "number" || !Number.isFinite(result.usage.openaiUnits) || result.usage.openaiUnits < 0
    || typeof result.usage.anthropicUnits !== "number" || !Number.isFinite(result.usage.anthropicUnits) || result.usage.anthropicUnits < 0
    || !isRecord(result.deterministic)) throw new Error(`result evaluation schema mismatch: ${expected.id}`);
  if (typeof result.attemptRoot !== "string" || !result.attemptRoot.startsWith(`runs/${expected.id}/attempts/attempt-`)) {
    throw new Error(`result attempt ownership mismatch: ${expected.id}`);
  }
  return result;
}
