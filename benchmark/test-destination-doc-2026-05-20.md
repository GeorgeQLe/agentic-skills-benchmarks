# Benchmark Test: destination-doc

Date: 2026-05-20

Target skill: `destination-doc`

Command: `$benchmark-test-skill destination-doc`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | Static harness-contract gate passed. |
| layer2 | PASS | 36.4s | Target-specific layer2 tests passed. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 95.0% | 0 | 25.3s | 27.7s | 27.9s | $1.00 | $3.00 | 0.916 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 95.8% | 0 | 41.5s | 46.3s | 46.7s | $1.00 | $3.00 | 0.868 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 95.0% | 0 | 0 | `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 95.8% | 0 | 0 | `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/destination-doc-claude-8fc99201/`
- Codex: `tests/benchmarks/runs/destination-doc-codex-91e7b097/`

## Next Route

Recommended next command: `$run`
