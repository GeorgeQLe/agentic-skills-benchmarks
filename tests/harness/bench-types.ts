import type { RunResult, Assertion } from "./types.js";

export type BenchAgent = "claude" | "codex";

export interface BenchConfig {
  skill: string;
  agent: BenchAgent;
  runs: number;
  chunkSize: number;
  pauseSeconds: number;
  maxBudgetUsd: number;
  perRunBudgetUsd: number;
  timeoutMs: number;
}

export interface SingleRunResult {
  index: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  exitCode: number;
  assertions: Assertion[];
  passed: boolean;
  stdout: string;
  stderr: string;
  files: string[];
  estimatedCostUsd: number;
  infrastructureBlocked?: boolean;
  infrastructureReason?: string;
}

export interface ChunkRecord {
  chunkIndex: number;
  startedAt: string;
  completedAt: string;
  runIndices: number[];
}

export interface SessionManifest {
  skill: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: "running" | "paused" | "completed" | "aborted";
  config: BenchConfig;
  completedRuns: number;
  totalEstimatedCostUsd: number;
  chunks: ChunkRecord[];
}

export interface OutlierRun {
  index: number;
  similarityToMedoid: number;
}

export interface BenchReport {
  sessionId: string;
  skill: string;
  agent: BenchAgent;
  totalRuns: number;
  evaluatedRuns: number;
  blockedRuns: {
    index: number;
    reason: string;
  }[];
  passRate: number;
  wilsonLower: number;
  wilsonUpper: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  consistency: {
    meanPairwiseSimilarity: number;
    medoidIndex: number;
    medoidAvgSimilarity: number;
    outliers: OutlierRun[];
  };
  totalEstimatedCostUsd: number;
  failedRuns: {
    index: number;
    exitCode: number;
    failedAssertions: string[];
  }[];
  generatedAt: string;
}

export interface SkillBenchSetup {
  skill: string;
  prompt: string;
  perRunBudgetUsd: number;
  timeoutMs: number;
  setupProject(workDir: string): void;
  assertResult(result: RunResult): Assertion[];
}

export type ResolvedBenchCoverageStatus = "custom" | "generic" | "blocked";

export interface ResolvedBenchTarget {
  skill: string;
  coverageStatus: ResolvedBenchCoverageStatus;
  setup?: SkillBenchSetup;
  setupPath?: string;
  blockedReason?: string;
  nextCommand?: string;
}
