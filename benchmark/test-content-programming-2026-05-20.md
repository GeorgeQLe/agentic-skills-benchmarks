# Benchmark Test: content-programming

Date: 2026-05-20

Target skill: `content-programming`

Command: `$benchmark-test-skill content-programming`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `content-programming`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 80.8% | 3 | 52.4s | 53.2s | 53.3s | $1.00 | $3.00 | 0.910 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.9% | 2 | 66.0s | 72.6s | 73.2s | $1.00 | $3.00 | 0.821 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 80.8% | 0 | 3 | `pack-fixture-evidence` 0.0%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 85.9% | 0 | 2 | `pack-fixture-evidence` 33.3%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/content-programming-claude-f51091c9/`
- Codex: `tests/benchmarks/runs/content-programming-codex-a18440e8/`

## Next Route

Recommended next command: `$run`
