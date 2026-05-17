# Benchmark Test: roadmap

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill roadmap`
**Target skill:** `roadmap`
**Coverage:** custom
**Setup:** `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 8.8s | 15 files, 1204 tests passed. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `roadmap`; benchmark evidence is from the custom layer4 setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 0.0% (0/0 evaluated) | 3 | [0.0%, 0.0%] | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/roadmap-claude-511af1ee/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 92.9% | 63.1s | 95.7s | 98.6s | $0.25 | $0.75 | 0.875 | 0 | `tests/benchmarks/runs/roadmap-codex-3f01cb21/` |

## Failed Assertions

No hard assertion failures were reported in evaluated runs.

## Output-Quality Details

Output-quality scoring is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---:|---|
| Claude | 0 | n/a | n/a | n/a | n/a |
| Codex | 3 | 92.9% | 0 | 1 | `evidence-linked` 66.7%, `file-reference` 100.0%, `scope-control` 100.0%, `roadmap-phase-structure` 100.0%, `validation-specificity` 100.0% |

The Codex hard assertions passed, but the deterministic quality summary recorded one critical failure in the output-quality rubric. Treat that as a benchmark quality failure needing triage before this target is considered cleanly covered.

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
|---|---:|---|
| Claude | 3 | agent runner budget exceeded |
| Codex | 0 | none |

The Claude lane was fully infrastructure-blocked by runner budget, so it provides no evaluated pass-rate or quality evidence in this run.

## Latency

| Agent | p50 | p95 | p99 |
|---|---:|---:|---:|
| Claude | 0.0s | 0.0s | 0.0s |
| Codex | 63.1s | 95.7s | 98.6s |

## Cost

| Agent | Cost / Run | Total Cost |
|---|---:|---:|
| Claude | $0.25 | $0.75 |
| Codex | $0.25 | $0.75 |
| Total | -- | $1.50 |

## Consistency

| Agent | Mean Pairwise Similarity | Outlier Count |
|---|---:|---:|
| Claude | 1.000 | 0 |
| Codex | 0.875 | 0 |

## Raw Evidence

- Verify command: `pnpm verify --skill roadmap`
- Benchmark command: `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0`
- Claude report: `tests/benchmarks/runs/roadmap-claude-511af1ee/report.json`
- Codex report: `tests/benchmarks/runs/roadmap-codex-3f01cb21/report.json`

## Result

`roadmap` is eligible and verified successfully. Claude was fully infrastructure-blocked by runner budget, while Codex completed all three evaluated runs and passed hard assertions. The run is not a clean pass because the Codex output-quality evaluator recorded one critical failure on the evidence-linked criterion.

Recommended next skill: `$session-triage roadmap benchmark failure`
