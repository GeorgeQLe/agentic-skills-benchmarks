# Benchmark Test: targeted-skill-builder

Date: 2026-05-19

Target skill: `targeted-skill-builder`

Command: `$benchmark-test-skill targeted-skill-builder`

Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `targeted-skill-builder`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

### Initial Run (Batch 41.1)

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | n/a | n/a | n/a | n/a | n/a | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 92.9% | 0 | 51.0s | 54.9s | 55.2s | $0.25 | $0.75 | 1.000 | 0 |

### Rerun After Batch 41.2 Fixes (budget + prompt)

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 86.5% | 0 | 30.4s | 38.9s | 39.6s | $1.00 | $3.00 | 0.865 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.9% | 0 | 49.1s | 49.5s | 49.6s | $1.00 | $3.00 | 0.879 | 0 |

## Batch 41.2 Fixes Applied

1. **Budget**: increased `perRunBudgetUsd` from `BENCH_BUDGETS_USD.smoke` ($0.25) to `BENCH_BUDGETS_USD.standard` ($1.00). This resolved all three Claude budget-blocked runs.
2. **Prompt routing**: added `End with Recommended next command: $run` to the fixture prompt. This resolved the Codex route mismatch (was routing to `$targeted-skill-builder` instead of `$run`).

## Failed Assertions (Initial Run)

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

## Failed Assertions (Rerun)

None.

## Output Quality (Rerun)

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 86.5% | 0 | 0 | See raw session for per-criterion detail. |
| codex | 3 | 87.9% | 0 | 0 | See raw session for per-criterion detail. |

## Infrastructure Blocked Runs (Rerun)

None.

## Raw Sessions

- Claude (initial): `tests/benchmarks/runs/targeted-skill-builder-claude-3b4f2b62/`
- Codex (initial): `tests/benchmarks/runs/targeted-skill-builder-codex-8f32ac01/`
- Claude (rerun): `tests/benchmarks/runs/targeted-skill-builder-claude-6d718aeb/`
- Codex (rerun): `tests/benchmarks/runs/targeted-skill-builder-codex-ef87cf3d/`

## Next Route

Recommended next command: `$run`
