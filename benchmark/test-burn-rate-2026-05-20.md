# Benchmark Test: burn-rate

Date: 2026-05-20

Target skill: `burn-rate`

Command: `$benchmark-test-skill burn-rate`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.8s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `burn-rate`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 69.2% | 2 | 24.6s | 25.1s | 25.2s | $1.00 | $3.00 | 0.859 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 75.8% | 1 | 36.4s | 39.4s | 39.6s | $1.00 | $3.00 | 0.904 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 69.2% | 2 | 2 | `business-ops-context` 0.0%; `pack-workflow-traits` 25.0%; `pack-fixture-evidence` 33.3%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 75.8% | 1 | 1 | `business-ops-context` 0.0%; `pack-workflow-traits` 25.0%; `pack-fixture-evidence` 66.7%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0% |

Both agents score 0% on `business-ops-context` — domain-specific criterion. `pack-workflow-traits` also low for both.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/burn-rate-claude-5b273215/`
- Codex: `tests/benchmarks/runs/burn-rate-codex-dfcd8fe0/`

## Next Route

Recommended next command: `$run`
