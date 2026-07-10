import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { loadFixtureManifest, subscriptionSafeEnv, type FixtureManifest } from "./corpus.js";
import type { DeterministicChecks } from "./types.js";

export interface DeterministicEvaluation {
  checks: DeterministicChecks;
  patch: string;
  changedFiles: string[];
  testStdout: string;
  testStderr: string;
  testExitCode: number;
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === ".git") continue;
      const path = resolve(dir, name);
      const stats = statSync(path);
      if (stats.isDirectory()) visit(path);
      else if (stats.isFile()) files.push(relative(root, path));
    }
  };
  visit(root);
  return files;
}

function git(fixture: string, args: string[]): string {
  return execFileSync("git", args, { cwd: fixture, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function containsProhibitedModelLaunch(fixture: string): boolean {
  const expression = /(?:child_process|os\.exec|subprocess|exec\.Command|system\s*\()[\s\S]{0,180}\b(?:codex|claude)\b/i;
  return listFiles(fixture).some((file) => {
    try { return expression.test(readFileSync(resolve(fixture, file), "utf8")); } catch { return false; }
  });
}

export function runDeterministicEvaluation(input: {
  candidateFixture: string;
  sourceFixture: string;
  scratchRoot: string;
  topologyCompliant: boolean;
}): DeterministicEvaluation {
  const manifest = loadFixtureManifest(input.sourceFixture);
  const patch = git(input.candidateFixture, ["diff", "--binary", "HEAD"]);
  const changedFiles = git(input.candidateFixture, ["status", "--short"])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .sort();
  const evaluationRoot = resolve(input.scratchRoot, `evaluation-${process.pid}-${Date.now()}`);
  mkdirSync(evaluationRoot, { recursive: true });
  cpSync(input.candidateFixture, evaluationRoot, {
    recursive: true,
    preserveTimestamps: false,
    filter: (source) => !source.split(/[\\/]/).includes(".git"),
  });
  cpSync(resolve(input.sourceFixture, "hidden"), resolve(evaluationRoot, "hidden"), { recursive: true, preserveTimestamps: false });
  const [command, ...args] = manifest.verification;
  const test = spawnSync(command, args, {
    cwd: evaluationRoot,
    encoding: "utf8",
    timeout: 120_000,
    env: subscriptionSafeEnv(process.env),
    maxBuffer: 10 * 1024 * 1024,
  });
  const testExitCode = test.status ?? 1;
  const requiredChanges = manifest.requiredFiles.every((file) => changedFiles.includes(file));
  const forbiddenChanges = manifest.forbiddenFiles.every((file) => !changedFiles.includes(file));
  const repositoryIntegrity = !changedFiles.some((file) => file.startsWith(".git/")) && existsSync(resolve(input.candidateFixture, ".git"));
  const prohibitedLaunch = containsProhibitedModelLaunch(input.candidateFixture);
  const hiddenTests = testExitCode === 0;
  const criticalFailures: string[] = [];
  if (!hiddenTests) criticalFailures.push("hidden functional tests failed");
  if (!forbiddenChanges) criticalFailures.push("forbidden file change");
  if (!repositoryIntegrity) criticalFailures.push("repository integrity failure");
  if (prohibitedLaunch) criticalFailures.push("direct model subprocess introduced");
  if (!input.topologyCompliant) criticalFailures.push("topology trace is noncompliant");
  const checks: DeterministicChecks = {
    hiddenTests,
    build: hiddenTests,
    typecheck: manifest.language !== "typescript" || hiddenTests,
    lint: !prohibitedLaunch,
    staticAnalysis: !prohibitedLaunch,
    requiredChanges,
    forbiddenChanges,
    patchScope: changedFiles.length > 0 && changedFiles.length <= 8,
    repositoryIntegrity,
    requirementCompliance: hiddenTests && requiredChanges,
    topologyCompliance: input.topologyCompliant,
    criticalFailures,
  };
  rmSync(evaluationRoot, { recursive: true, force: true });
  return {
    checks,
    patch,
    changedFiles,
    testStdout: test.stdout ?? "",
    testStderr: test.stderr ?? "",
    testExitCode,
  };
}

export function deterministicChecksPass(checks: DeterministicChecks): boolean {
  return checks.criticalFailures.length === 0
    && checks.hiddenTests
    && checks.requiredChanges
    && checks.forbiddenChanges
    && checks.patchScope
    && checks.repositoryIntegrity
    && checks.requirementCompliance
    && checks.topologyCompliance;
}
