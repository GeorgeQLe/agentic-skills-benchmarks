export interface ParsedArgs {
  positional: string[];
  flags: Set<string>;
  raw: string[];
}

export function parseArgs(raw: string[]): ParsedArgs {
  return {
    raw,
    flags: new Set(raw.filter((arg) => arg.startsWith("--"))),
    positional: raw.filter((arg) => !arg.startsWith("--")),
  };
}

export function valueFor(raw: string[], name: string, fallback?: string): string | undefined {
  const index = raw.indexOf(name);
  return index >= 0 ? raw[index + 1] : fallback;
}

export function csvFlag(raw: string[], name: string): string[] {
  return (valueFor(raw, name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parsePositiveIntegerFlag(raw: string[], name: string, fallback: string): number {
  const value = valueFor(raw, name, fallback)!;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got "${value}"`);
  }
  return parsed;
}

export function parseNonNegativeUsdFlag(raw: string[], name: string, fallback: string): number {
  const value = valueFor(raw, name, fallback)!;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative USD value, got "${value}"`);
  }
  return parsed;
}

export function helpText(title: string, usage: string, options: string[], examples: string[] = []): string {
  return [
    title,
    "",
    "Usage:",
    usage,
    "",
    "Options:",
    ...options,
    ...(examples.length > 0 ? ["", "Examples:", ...examples] : []),
    "",
  ].join("\n");
}
