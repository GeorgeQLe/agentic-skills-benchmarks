# Benchmark Test: devtool-integration-map

Date: 2026-05-20

Target skill: `devtool-integration-map`

Command: `$benchmark-test-skill devtool-integration-map`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `devtool-integration-map`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 26.2s | 30.3s | 30.7s | $1.00 | $3.00 | 0.920 | 0 |
| codex | 100.0% (2/2) | 1 | 34.2%-100.0% | 100.0% | 0 | 43.2s | 48.2s | 48.6s | $1.00 | $3.00 | 0.824 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 100.0% | 0 | 0 | `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0%; `devtool-context` 100.0% |
| codex | 2 | 100.0% | 0 | 0 | `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0%; `devtool-context` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/devtool-integration-map-claude-290ae0ae/`
- Codex: `tests/benchmarks/runs/devtool-integration-map-codex-1ac7ce18/`

## Next Route

Recommended next command: `$run`
