import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  SessionManifest,
  SingleRunResult,
  BenchConfig,
} from "./bench-types.js";

const RUNS_DIR = resolve(import.meta.dirname, "../benchmarks/runs");

function sessionDir(skill: string, sessionId: string): string {
  return join(RUNS_DIR, `${skill}-${sessionId}`);
}

function sessionPrefix(config: Pick<BenchConfig, "skill" | "agent">): string {
  return `${config.skill}-${config.agent}`;
}

function writeAtomic(path: string, data: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, data, "utf-8");
  renameSync(tmp, path);
}

export function createSession(config: BenchConfig): SessionManifest {
  const sessionId = randomUUID().slice(0, 8);
  const dir = sessionDir(sessionPrefix(config), sessionId);
  mkdirSync(dir, { recursive: true });

  const manifest: SessionManifest = {
    skill: config.skill,
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "running",
    config,
    completedRuns: 0,
    totalEstimatedCostUsd: 0,
    chunks: [],
  };

  writeAtomic(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

export function saveRunResult(
  manifest: SessionManifest,
  result: SingleRunResult,
): void {
  const dir = sessionDir(sessionPrefix(manifest.config), manifest.sessionId);
  const fileName = `run-${String(result.index).padStart(3, "0")}.json`;
  writeAtomic(join(dir, fileName), JSON.stringify(result, null, 2));

  manifest.completedRuns++;
  manifest.totalEstimatedCostUsd += result.estimatedCostUsd;
  manifest.updatedAt = new Date().toISOString();
  writeAtomic(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export function updateManifestStatus(
  manifest: SessionManifest,
  status: SessionManifest["status"],
): void {
  const dir = sessionDir(sessionPrefix(manifest.config), manifest.sessionId);
  manifest.status = status;
  manifest.updatedAt = new Date().toISOString();
  writeAtomic(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export function findResumeableSession(
  skill: string,
  agent: BenchConfig["agent"],
): SessionManifest | null {
  if (!existsSync(RUNS_DIR)) return null;

  const prefix = `${skill}-${agent}-`;
  const dirs = readdirSync(RUNS_DIR)
    .filter((d) => d.startsWith(prefix))
    .sort()
    .reverse();

  for (const d of dirs) {
    const manifestPath = join(RUNS_DIR, d, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const manifest: SessionManifest = JSON.parse(
      readFileSync(manifestPath, "utf-8"),
    );
    if (manifest.status === "running" || manifest.status === "paused") {
      return manifest;
    }
  }
  return null;
}

export function loadSessionRuns(
  manifest: SessionManifest,
): SingleRunResult[] {
  const dir = sessionDir(sessionPrefix(manifest.config), manifest.sessionId);
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
    .sort();

  return files.map((f) =>
    JSON.parse(readFileSync(join(dir, f), "utf-8")) as SingleRunResult,
  );
}

export function getSessionDir(manifest: SessionManifest): string {
  return sessionDir(sessionPrefix(manifest.config), manifest.sessionId);
}

export function loadManifestFromDir(dir: string): SessionManifest {
  return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
}
