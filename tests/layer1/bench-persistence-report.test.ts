import { readFileSync, rmSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BenchConfig, SingleRunResult } from "../harness/bench-types.js";
import { writeReport } from "../harness/bench-report.js";
import {
  createSession,
  getSessionDir,
  saveRunResult,
} from "../harness/bench-persistence.js";
import { loadBenchmarkCatalogMetadata } from "../harness/skills-catalog.js";

function config(skill: string): BenchConfig {
  return {
    skill,
    agent: "claude",
    runs: 1,
    chunkSize: 1,
    pauseSeconds: 0,
    maxBudgetUsd: 1,
    perRunBudgetUsd: 0.05,
    timeoutMs: 1000,
  };
}

function passedRun(): SingleRunResult {
  return {
    index: 0,
    startedAt: "2026-07-05T00:00:00.000Z",
    completedAt: "2026-07-05T00:00:01.000Z",
    durationMs: 1000,
    exitCode: 0,
    assertions: [{ description: "passes", pass: true }],
    passed: true,
    stdout: "",
    stderr: "",
    files: [],
    estimatedCostUsd: 0.05,
  };
}

describe("benchmark run persistence and reports", () => {
  it("persists catalog metadata in the session manifest and generated report", () => {
    const metadata = loadBenchmarkCatalogMetadata("canary");
    const manifest = createSession(config("catalog-metadata-test"), metadata);
    const dir = getSessionDir(manifest);

    try {
      saveRunResult(manifest, passedRun());
      const savedManifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
      expect(savedManifest.skillsCatalogRef).toBe(metadata.skillsCatalogRef);
      expect(savedManifest.skillsCatalogVersion).toBe(metadata.skillsCatalogVersion);
      expect(savedManifest.sourceCommit).toBe(metadata.sourceCommit);
      expect(savedManifest.releaseChannel).toBe("canary");

      const report = writeReport(manifest);
      expect(report.skillsCatalogRef).toBe(metadata.skillsCatalogRef);
      expect(report.skillsCatalogVersion).toBe(metadata.skillsCatalogVersion);
      expect(report.sourceCommit).toBe(metadata.sourceCommit);
      expect(report.releaseChannel).toBe("canary");

      const reportJson = JSON.parse(readFileSync(`${dir}/report.json`, "utf8"));
      expect(reportJson.releaseChannel).toBe("canary");
      expect(readFileSync(`${dir}/report.md`, "utf8")).toContain("**Release channel**: canary");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses unknown catalog metadata for older manifests", () => {
    const metadata = loadBenchmarkCatalogMetadata("release");
    const manifest = createSession(config("old-catalog-metadata-test"), metadata);
    const dir = getSessionDir(manifest);

    try {
      saveRunResult(manifest, passedRun());
      const oldManifest = { ...manifest } as Partial<typeof manifest>;
      delete oldManifest.skillsCatalogRef;
      delete oldManifest.skillsCatalogVersion;
      delete oldManifest.sourceCommit;
      delete oldManifest.releaseChannel;

      const report = writeReport(oldManifest as typeof manifest);
      expect(report.skillsCatalogRef).toBe("unknown");
      expect(report.skillsCatalogVersion).toBe("unknown");
      expect(report.sourceCommit).toBe("unknown");
      expect(report.releaseChannel).toBe("unknown");
      expect(readFileSync(`${dir}/report.md`, "utf8")).toContain("**Release channel**: unknown");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
