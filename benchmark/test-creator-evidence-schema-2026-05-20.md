# Benchmark Test: creator-evidence-schema

Date: 2026-05-20

Target skill: `creator-evidence-schema`

Command: `$benchmark-test-skill creator-evidence-schema`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `creator-evidence-schema`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 90.0% | 0 | 29.7s | 31.2s | 31.4s | $1.00 | $3.00 | 0.880 | 0 |
| codex | 100.0% (2/2) | 1 | 34.2%-100.0% | 88.8% | 0 | 45.9s | 54.8s | 55.6s | $1.00 | $3.00 | 0.904 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 90.0% | 0 | 0 | `creator-media-context` 0.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 2 | 88.8% | 0 | 0 | `creator-media-context` 0.0%; `pack-workflow-traits` 87.5%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/creator-evidence-schema-claude-d34147a3/`
- Codex: `tests/benchmarks/runs/creator-evidence-schema-codex-34b0255b/`

## Next Route

Recommended next command: `$run`
