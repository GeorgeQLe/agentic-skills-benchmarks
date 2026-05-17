# Benchmark Test: roadmap

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill roadmap`
**Target skill:** `roadmap`
**Coverage:** custom
**Setup:** `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.8s | 15 files, 1204 tests passed. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `roadmap`; benchmark evidence is from the custom layer4 setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 0.0% (0/0 evaluated) | 3 | [0.0%, 0.0%] | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/roadmap-claude-8c1ee4a6/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 100.0% | 46.1s | 46.6s | 46.7s | $0.25 | $0.75 | 0.897 | 0 | `tests/benchmarks/runs/roadmap-codex-94365e0f/` |

## Failed Assertions

No hard assertion failures were reported in evaluated runs.

## Output-Quality Details

Output-quality scoring is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---:|---|
| Claude | 0 | n/a | n/a | n/a | n/a |
| Codex | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%, `file-reference` 100.0%, `scope-control` 100.0%, `roadmap-phase-structure` 100.0%, `validation-specificity` 100.0% |

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
| Codex | 46.1s | 46.6s | 46.7s |

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
| Codex | 0.897 | 0 |

## Raw Evidence

- Verify command: `pnpm verify --skill roadmap`
- Benchmark command: `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0`
- Claude report: `tests/benchmarks/runs/roadmap-claude-8c1ee4a6/report.json`
- Codex report: `tests/benchmarks/runs/roadmap-codex-94365e0f/report.json`

## Result

`roadmap` is eligible and verified successfully. Claude was fully infrastructure-blocked by runner budget, while Codex completed all three evaluated runs, passed hard assertions, and passed the configured output-quality rubric with no threshold or critical failures.

Recommended next skill: `$benchmark-test-skill roadmap`
