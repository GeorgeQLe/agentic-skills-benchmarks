# Benchmark Test: creator-metrics-review

Date: 2026-05-20

Target skill: `creator-metrics-review`

Command: `$benchmark-test-skill creator-metrics-review`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.5s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `creator-metrics-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 93.3% | 0 | 30.0s | 31.6s | 31.7s | $1.00 | $3.00 | 0.891 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 96.7% | 0 | 38.7s | 38.9s | 38.9s | $1.00 | $3.00 | 0.792 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 93.3% | 0 | 0 | `creator-media-context` 66.7%; `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 96.7% | 0 | 0 | `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/creator-metrics-review-claude-7cd1b40c/`
- Codex: `tests/benchmarks/runs/creator-metrics-review-codex-891bd8d0/`

## Next Route

Recommended next command: `$run`
