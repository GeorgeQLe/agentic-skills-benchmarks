import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export function prettyCanonicalJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

export function contentId(prefix: string, value: unknown, length = 20): string {
  return `${prefix}-${sha256(canonicalJson(value)).slice(0, length)}`;
}

export function jsonLines(values: unknown[]): string {
  return `${values.map(canonicalJson).join("\n")}\n`;
}

export function seededNumber(seed: string): number {
  return Number.parseInt(sha256(seed).slice(0, 13), 16);
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let state = seededNumber(seed) || 1;
  for (let index = result.length - 1; index > 0; index--) {
    state = (state * 48271) % 0x7fffffff;
    const next = state % (index + 1);
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}
