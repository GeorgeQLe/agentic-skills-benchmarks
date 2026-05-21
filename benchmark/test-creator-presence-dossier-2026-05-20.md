# Benchmark Test: creator-presence-dossier

Date: 2026-05-20

Target skill: `creator-presence-dossier`

Command: `$benchmark-test-skill creator-presence-dossier`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `creator-presence-dossier`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 89.2% | 0 | 34.4s | 35.7s | 35.8s | $1.00 | $3.00 | 0.914 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 96.7% | 0 | 53.7s | 96.7s | 100.5s | $1.00 | $3.00 | 0.801 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 89.2% | 0 | 0 | `creator-media-context` 33.3%; `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 96.7% | 0 | 0 | `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/creator-presence-dossier-claude-97b4ffae/`
- Codex: `tests/benchmarks/runs/creator-presence-dossier-codex-4b9a789d/`

## Next Route

Recommended next command: `$run`
