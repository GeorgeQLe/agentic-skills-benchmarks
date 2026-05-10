import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchReport, SingleRunResult } from "./bench-types.js";
import { computeConsistency } from "./bench-similarity.js";
import { loadSessionRuns, getSessionDir } from "./bench-persistence.js";
import type { SessionManifest } from "./bench-types.js";

function wilsonCI(
  successes: number,
  total: number,
  z = 1.96,
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return {
    lower: Math.max(0, (center - spread) / denom),
    upper: Math.min(1, (center + spread) / denom),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function generateReport(manifest: SessionManifest): BenchReport {
  const runs = loadSessionRuns(manifest);
  const passedRuns = runs.filter((r) => r.passed);
  const { lower, upper } = wilsonCI(passedRuns.length, runs.length);

  const durations = runs.map((r) => r.durationMs).sort((a, b) => a - b);
  const consistency = computeConsistency(runs.filter((r) => r.passed));

  return {
    sessionId: manifest.sessionId,
    skill: manifest.skill,
    totalRuns: runs.length,
    passRate: runs.length > 0 ? passedRuns.length / runs.length : 0,
    wilsonLower: lower,
    wilsonUpper: upper,
    latency: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    },
    consistency,
    totalEstimatedCostUsd: manifest.totalEstimatedCostUsd,
    generatedAt: new Date().toISOString(),
  };
}

export function writeReport(manifest: SessionManifest): BenchReport {
  const report = generateReport(manifest);
  const dir = getSessionDir(manifest);

  writeFileSync(join(dir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(dir, "report.md"), formatMarkdown(report));

  return report;
}

function formatMarkdown(r: BenchReport): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  return `# Benchmark Report: ${r.skill}

**Session**: ${r.sessionId}
**Generated**: ${r.generatedAt}

## Pass Rate

- **${pct(r.passRate)}** (${Math.round(r.passRate * r.totalRuns)}/${r.totalRuns} runs)
- 95% Wilson CI: [${pct(r.wilsonLower)}, ${pct(r.wilsonUpper)}]

## Latency

| Percentile | Duration |
|------------|----------|
| p50 | ${sec(r.latency.p50)} |
| p95 | ${sec(r.latency.p95)} |
| p99 | ${sec(r.latency.p99)} |

## Consistency

- Mean pairwise similarity: ${r.consistency.meanPairwiseSimilarity.toFixed(3)}
- Medoid run: #${r.consistency.medoidIndex} (avg similarity: ${r.consistency.medoidAvgSimilarity.toFixed(3)})
- Outliers: ${r.consistency.outliers.length === 0 ? "none" : r.consistency.outliers.map((o) => `#${o.index} (${o.similarityToMedoid.toFixed(3)})`).join(", ")}

## Cost

- Total estimated: $${r.totalEstimatedCostUsd.toFixed(2)}
- Per run: $${(r.totalEstimatedCostUsd / r.totalRuns).toFixed(2)}
`;
}
