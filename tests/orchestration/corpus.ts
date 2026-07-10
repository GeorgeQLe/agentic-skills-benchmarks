import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { sha256 } from "./canonical.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { loadScenarios } from "./design.js";
import type { TaskScenario } from "./types.js";

export interface FixtureManifest {
  schemaVersion: 1;
  id: string;
  language: "typescript" | "python" | "go";
  mode: "greenfield" | "brownfield";
  verification: [string, ...string[]];
  requiredFiles: string[];
  forbiddenFiles: string[];
}

export interface FixtureQualification {
  fixtureId: string;
  seedFailed: boolean;
  referencePassed: boolean;
  seedExitCode: number;
  referenceExitCode: number;
  referenceChecksum: string;
  ok: boolean;
}

function copyDirectory(source: string, target: string): void {
  if (!existsSync(source)) return;
  cpSync(source, target, { recursive: true, force: true, preserveTimestamps: false });
}

function hashDirectory(root: string): string {
  const parts: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = resolve(dir, name);
      const stats = statSync(path);
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile()) parts.push(`${relative(root, path)}\0${sha256(readFileSync(path))}\n`);
    }
  };
  visit(root);
  return sha256(parts.join(""));
}

export function loadFixtureManifest(fixtureRoot: string): FixtureManifest {
  const manifest = JSON.parse(readFileSync(resolve(fixtureRoot, "fixture.json"), "utf8")) as FixtureManifest;
  if (!Array.isArray(manifest.verification) || manifest.verification.length === 0) {
    throw new Error(`fixture ${manifest.id} has no verification command`);
  }
  return manifest;
}

export function materializeFixture(
  fixtureRoot: string,
  target: string,
  kind: "seed" | "reference",
  includeHidden = false,
): string {
  mkdirSync(target, { recursive: true });
  copyDirectory(resolve(fixtureRoot, "seed"), target);
  if (kind === "reference") copyDirectory(resolve(fixtureRoot, "reference"), target);
  if (includeHidden) copyDirectory(resolve(fixtureRoot, "hidden"), resolve(target, "hidden"));
  return hashDirectory(target);
}

function runVerification(manifest: FixtureManifest, cwd: string): number {
  const [command, ...args] = manifest.verification;
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 60_000,
    env: subscriptionSafeEnv(process.env),
  });
  return result.status ?? 1;
}

export function subscriptionSafeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const forbidden = new Set(["OPENAI_API_KEY", "OPENAI_ADMIN_KEY", "ANTHROPIC_API_KEY"]);
  const clean: NodeJS.ProcessEnv = {};
  for (const key of Object.keys(env)) {
    if (forbidden.has(key)) continue;
    const value = env[key];
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

export function qualifyFixture(fixtureRoot: string, scratchRoot: string): FixtureQualification {
  const manifest = loadFixtureManifest(fixtureRoot);
  const seedDir = resolve(scratchRoot, `${manifest.id}-seed`);
  const referenceDir = resolve(scratchRoot, `${manifest.id}-reference`);
  rmSync(seedDir, { recursive: true, force: true });
  rmSync(referenceDir, { recursive: true, force: true });
  materializeFixture(fixtureRoot, seedDir, "seed", true);
  const referenceChecksum = materializeFixture(fixtureRoot, referenceDir, "reference", true);
  const seedExitCode = runVerification(manifest, seedDir);
  const referenceExitCode = runVerification(manifest, referenceDir);
  rmSync(seedDir, { recursive: true, force: true });
  rmSync(referenceDir, { recursive: true, force: true });
  return {
    fixtureId: manifest.id,
    seedFailed: seedExitCode !== 0,
    referencePassed: referenceExitCode === 0,
    seedExitCode,
    referenceExitCode,
    referenceChecksum,
    ok: seedExitCode !== 0 && referenceExitCode === 0,
  };
}

export function qualifyAllFixtures(scratchRoot: string, experimentRoot = EXPERIMENT_ROOT): FixtureQualification[] {
  mkdirSync(scratchRoot, { recursive: true });
  const fixtures = readdirSync(resolve(experimentRoot, "fixtures"))
    .sort()
    .map((name) => resolve(experimentRoot, "fixtures", name))
    .filter((path) => statSync(path).isDirectory());
  return fixtures.map((fixture) => qualifyFixture(fixture, scratchRoot));
}

export function assertScenarioPairs(scenarios: TaskScenario[] = loadScenarios()): void {
  const families = new Map<string, TaskScenario[]>();
  for (const scenario of scenarios) {
    const group = families.get(scenario.familyId) ?? [];
    group.push(scenario);
    families.set(scenario.familyId, group);
  }
  if (families.size !== 6) throw new Error(`expected six task families, got ${families.size}`);
  for (const [family, pair] of families) {
    if (pair.length !== 2) throw new Error(`${family} does not have exactly two variants`);
    const clean = pair.find((scenario) => scenario.variant === "clean");
    const challenge = pair.find((scenario) => scenario.variant === "challenge");
    if (!clean || !challenge) throw new Error(`${family} is missing clean or challenge variant`);
    if (clean.fixture !== challenge.fixture) throw new Error(`${family} variants use different fixtures`);
    if (clean.intervention !== null || challenge.intervention === null) throw new Error(`${family} intervention registration is invalid`);
    const expectedChallenge = `${clean.prompt} ${challenge.intervention.text}`;
    if (challenge.prompt !== expectedChallenge) {
      throw new Error(`${family} challenge differs by more than its registered intervention`);
    }
  }
}

export function capabilityProbes(): Record<string, string> {
  const probe = (command: string, args: string[]) => {
    try {
      return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "unavailable";
    }
  };
  return {
    node: process.version,
    python: probe("python3", ["--version"]),
    go: probe("go", ["version"]),
    codex: probe("codex", ["--version"]),
    claude: probe("claude", ["--version"]),
  };
}
