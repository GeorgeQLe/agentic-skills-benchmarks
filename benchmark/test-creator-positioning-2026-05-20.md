# Benchmark Test: creator-positioning

Date: 2026-05-20

Target skill: `creator-positioning`

Command: `$benchmark-test-skill creator-positioning`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `creator-positioning`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 75.8% | 3 | 23.7s | 23.8s | 23.9s | $1.00 | $3.00 | 0.897 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 76.7% | 3 | 37.0s | 39.5s | 39.8s | $1.00 | $3.00 | 0.841 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 75.8% | 0 | 3 | `pack-fixture-evidence` 0.0%; `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 76.7% | 0 | 3 | `pack-fixture-evidence` 0.0%; `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/creator-positioning-claude-4d91e65a/`
- Codex: `tests/benchmarks/runs/creator-positioning-codex-719621b4/`

## Next Route

Recommended next command: `$run`
