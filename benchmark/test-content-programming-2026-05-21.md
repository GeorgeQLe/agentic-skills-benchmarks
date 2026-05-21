# Benchmark Test: content-programming

Date: 2026-05-21

Target skill: `content-programming`

Command: `$benchmark-test-skill content-programming`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.5s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `content-programming`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.6% | 3 | 60.6s | 70.7s | 71.6s | $1.00 | $3.00 | 0.903 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 94.9% | 1 | 68.8s | 77.2s | 77.9s | $1.00 | $3.00 | 0.859 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 84.6% | 0 | 3 | `pack-fixture-evidence` 0.0%; `creator-media-context` 100.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 94.9% | 0 | 1 | `pack-fixture-evidence` 66.7%; `creator-media-context` 100.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

Domain enrichment impact: `creator-media-context` (was `creator-foundation-context`) improved from 0% (2026-05-20) to 100% for both agents. `pack-workflow-traits` no longer appears as a separate low-scoring criterion. Overall quality improved from 80.8% to 84.6% (Claude) and 94.9% (Codex).

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/content-programming-claude-36e25fe4/`
- Codex: `tests/benchmarks/runs/content-programming-codex-377472c4/`

## Next Route

Recommended next command: `$run`
