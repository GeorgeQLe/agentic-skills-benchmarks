# Benchmark Test: devtool-dx-journey

Date: 2026-05-20

Target skill: `devtool-dx-journey`

Command: `$benchmark-test-skill devtool-dx-journey`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `devtool-dx-journey`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.8% | 0 | 29.3s | 31.1s | 31.3s | $1.00 | $3.00 | 0.882 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 96.7% | 0 | 49.2s | 50.1s | 50.2s | $1.00 | $3.00 | 0.961 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.8% | 0 | 0 | `devtool-context` 0.0%; `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 96.7% | 0 | 0 | `devtool-context` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/devtool-dx-journey-claude-cd545df1/`
- Codex: `tests/benchmarks/runs/devtool-dx-journey-codex-878aaa9f/`

## Next Route

Recommended next command: `$run`
