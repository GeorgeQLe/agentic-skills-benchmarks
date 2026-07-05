import type { RunResult, Assertion } from "./types.js";

export type BenchAgent = "claude" | "codex";
export type ReleaseChannel = "release" | "canary";

export interface BenchmarkCatalogMetadata {
  skillsCatalogRef: string;
  skillsCatalogVersion: string;
  sourceCommit: string;
  releaseChannel: ReleaseChannel | "unknown";
}

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

export interface BenchRunContext {
  index: number;
  agent: BenchAgent;
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
  artifacts?: Record<string, string>;
  estimatedCostUsd: number;
  infrastructureBlocked?: boolean;
  infrastructureReason?: string;
  qualityResult?: QualityEvaluationResult;
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
  skillsCatalogRef: string;
  skillsCatalogVersion: string;
  sourceCommit: string;
  releaseChannel: ReleaseChannel | "unknown";
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
  skillsCatalogRef: string;
  skillsCatalogVersion: string;
  sourceCommit: string;
  releaseChannel: ReleaseChannel | "unknown";
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
  qualitySummary?: QualitySummary;
  generatedAt: string;
}

export interface SkillBenchSetup {
  skill: string;
  prompt: string;
  perRunBudgetUsd: number;
  timeoutMs: number;
  qualityOutputPath?: string;
  qualityOutputPaths?: string[];
  setupProject(workDir: string, context?: BenchRunContext): void;
  assertResult(result: RunResult, context?: { agent: BenchAgent }): Assertion[];
  qualityEvaluator?: QualityEvaluator;
}

export interface QualityCriterionResult {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
  score: number;
  passed: boolean;
  notes: string[];
}

export interface QualityEvaluationResult {
  score: number;
  passed: boolean;
  thresholdPassed: boolean;
  criticalFailures: string[];
  criteria: QualityCriterionResult[];
  notes: string[];
}

export interface QualitySummary {
  evaluatedRuns: number;
  averageScore: number;
  thresholdFailures: number;
  criticalFailures: number;
  lowestScoringCriteria: {
    id: string;
    averageScore: number;
  }[];
}

export interface QualityCriterion {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
  // Literal strings this criterion requires the output to contain (populated by
  // the requiredFacts-style builders). Exposed so the anti-prompt-echo lint can
  // assert a gating criterion does not merely re-check tokens the prompt dictated.
  requiredLiterals?: string[];
  evaluate(output: string): {
    score: number;
    notes?: string[];
  };
}

export interface QualityRubric {
  minimumScore: number;
  criteria: QualityCriterion[];
}

export interface QualityEvaluator {
  rubric: QualityRubric;
  evaluate(output: string): QualityEvaluationResult;
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
