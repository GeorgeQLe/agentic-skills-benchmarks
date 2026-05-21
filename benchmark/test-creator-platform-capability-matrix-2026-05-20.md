# Benchmark Test: creator-platform-capability-matrix

Date: 2026-05-20

Target skill: `creator-platform-capability-matrix`

Command: `$benchmark-test-skill creator-platform-capability-matrix`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.7s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `creator-platform-capability-matrix`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.5% | 0 | 28.3s | 31.6s | 31.9s | $1.00 | $3.00 | 0.854 | 0 |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 71.7% | 2 | 76.4s | 105.4s | 108.0s | $1.00 | $3.00 | 0.887 | 0 |

## Failed Assertions

| Agent | Run | Failed Assertions |
| --- | ---: | --- |
| codex | #2 | `Agent command exited successfully`; `pack-benchmark-output.md created in project root` |

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 87.5% | 0 | 0 | `creator-media-context` 0.0%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 71.7% | 1 | 2 | `pack-workflow-traits` 50.0%; `pack-skill-context` 66.7%; `pack-fixture-evidence` 66.7%; `pack-practical-risk-or-validation` 66.7%; `pack-next-route` 66.7% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/creator-platform-capability-matrix-claude-a5ac680a/`
- Codex: `tests/benchmarks/runs/creator-platform-capability-matrix-codex-41a09854/`

## Next Route

Recommended next command: `$run`
