import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

export function inputFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, "inputs", name), "utf-8");
}

export function inputFixturePath(name: string): string {
  return resolve(FIXTURES_DIR, "inputs", name);
}

export function goldenSchema(name: string): Record<string, unknown> {
  const raw = readFileSync(resolve(FIXTURES_DIR, "golden", name), "utf-8");
  return JSON.parse(raw);
}
