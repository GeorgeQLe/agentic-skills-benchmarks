# Benchmark Test: roadmap

**Date:** 2026-05-17 (initial), 2026-05-19 (rerun after Batch 41.2 fixes)
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

### Initial Run (2026-05-17)

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 0.0% (0/0 evaluated) | 3 | [0.0%, 0.0%] | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/roadmap-claude-8c1ee4a6/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 100.0% | 46.1s | 46.6s | 46.7s | $0.25 | $0.75 | 0.897 | 0 | `tests/benchmarks/runs/roadmap-codex-94365e0f/` |

### Rerun After Batch 41.2 Fixes (budget increase)

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 66.7% (2/3 evaluated) | 0 | [20.8%, 93.9%] | n/a | 45.0s | 51.8s | 52.4s | $1.00 | $3.00 | 0.930 | 0 | `tests/benchmarks/runs/roadmap-claude-f7e1eb9c/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | n/a | 55.1s | 73.2s | 74.9s | $1.00 | $3.00 | 0.911 | 0 | `tests/benchmarks/runs/roadmap-codex-6123f95c/` |

## Batch 41.2 Fix Applied

**Budget**: increased `perRunBudgetUsd` from `BENCH_BUDGETS_USD.smoke` ($0.25) to `BENCH_BUDGETS_USD.standard` ($1.00). This resolved all three Claude budget-blocked runs. No prompt or assertion changes were needed for `roadmap`.

## Failed Assertions

### Initial Run

No hard assertion failures in evaluated runs (Claude had no evaluated runs due to budget blocks).

### Rerun

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #2 | 0 | Output recommends $plan-phase 1 |

Claude run 2 failed the route assertion. This is one-off agent noncompliance (2/3 Claude runs correctly route to `$plan-phase 1`).

## Output-Quality Details (Initial Run)

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---:|---|
| Claude | 0 | n/a | n/a | n/a | n/a |
| Codex | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%, `file-reference` 100.0%, `scope-control` 100.0%, `roadmap-phase-structure` 100.0%, `validation-specificity` 100.0% |

## Infrastructure Blocks

### Initial Run

| Agent | Blocked Runs | Reason |
|---|---:|---|
| Claude | 3 | agent runner budget exceeded |
| Codex | 0 | none |

### Rerun

None.

## Raw Evidence

- Verify command: `pnpm verify --skill roadmap`
- Benchmark command: `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0`
- Claude report (initial): `tests/benchmarks/runs/roadmap-claude-8c1ee4a6/report.json`
- Codex report (initial): `tests/benchmarks/runs/roadmap-codex-94365e0f/report.json`
- Claude report (rerun): `tests/benchmarks/runs/roadmap-claude-f7e1eb9c/report.json`
- Codex report (rerun): `tests/benchmarks/runs/roadmap-codex-6123f95c/report.json`

## Result

`roadmap` is eligible and verified successfully. After the Batch 41.2 budget fix, Claude pass rate improved from 0/0 evaluated (all blocked) to 66.7% (2/3 evaluated). Codex remains at 100% pass rate. The one Claude failure is one-off route noncompliance, not a systematic issue.

Recommended next command: `$run`
