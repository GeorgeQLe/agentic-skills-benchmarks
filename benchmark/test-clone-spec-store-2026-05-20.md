# Benchmark Test: clone-spec-store

Date: 2026-05-20

Target skill: `clone-spec-store`

Command: `$benchmark-test-skill clone-spec-store`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.8s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `clone-spec-store`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.8% | 1 | 31.6s | 32.6s | 32.7s | $1.00 | $3.00 | 0.886 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 75.8% | 3 | 51.6s | 72.6s | 74.5s | $1.00 | $3.00 | 0.834 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.8% | 1 | 1 | `pack-workflow-traits` 25.0%; `pack-fixture-evidence` 66.7%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 75.8% | 0 | 3 | `pack-fixture-evidence` 0.0%; `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/clone-spec-store-claude-5682f7cd/`
- Codex: `tests/benchmarks/runs/clone-spec-store-codex-fcfaf846/`

## Next Route

Recommended next command: `$run`
