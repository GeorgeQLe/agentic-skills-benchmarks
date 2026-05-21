# Benchmark Test: burn-rate

Date: 2026-05-21

Target skill: `burn-rate`

Command: `$benchmark-test-skill burn-rate`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.6s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `burn-rate`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 93.3% | 1 | 31.5s | 32.7s | 32.8s | $1.00 | $3.00 | 0.894 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 37.6s | 55.3s | 56.9s | $1.00 | $3.00 | 0.910 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 93.3% | 0 | 1 | `pack-fixture-evidence` 66.7%; `business-ops-context` 100.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | All criteria 100.0% |

Domain enrichment impact: `business-ops-context` improved from 0% (2026-05-20) to 100% for both agents. `pack-workflow-traits` no longer appears as a separate low-scoring criterion.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/burn-rate-claude-e5a4571d/`
- Codex: `tests/benchmarks/runs/burn-rate-codex-c21c704a/`

## Next Route

Recommended next command: `$run`
