# Benchmark Test: competitive-analysis

Date: 2026-05-20

Target skill: `competitive-analysis`

Command: `$benchmark-test-skill competitive-analysis`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `competitive-analysis`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 91.7% | 0 | 27.3s | 29.5s | 29.7s | $1.00 | $3.00 | 0.892 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 95.0% | 0 | 42.8s | 46.7s | 47.1s | $1.00 | $3.00 | 0.885 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 91.7% | 0 | 0 | `business-discovery-context` 33.3%; `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 95.0% | 0 | 0 | `business-discovery-context` 66.7%; `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/competitive-analysis-claude-d0b6bc77/`
- Codex: `tests/benchmarks/runs/competitive-analysis-codex-a221c381/`

## Next Route

Recommended next command: `$run`
