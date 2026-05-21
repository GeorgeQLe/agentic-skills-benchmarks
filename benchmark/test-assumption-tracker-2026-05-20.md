# Benchmark Test: assumption-tracker

Date: 2026-05-20

Target skill: `assumption-tracker`

Command: `$benchmark-test-skill assumption-tracker`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `assumption-tracker`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 98.3% | 0 | 26.5s | 29.3s | 29.5s | $1.00 | $3.00 | 0.900 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 96.7% | 0 | 45.8s | 47.0s | 47.1s | $1.00 | $3.00 | 0.894 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 98.3% | 0 | 0 | `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 96.7% | 0 | 0 | `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/assumption-tracker-claude-b30cee35/`
- Codex: `tests/benchmarks/runs/assumption-tracker-codex-aee26208/`

## Next Route

Recommended next command: `$run`
