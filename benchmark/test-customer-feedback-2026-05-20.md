# Benchmark Test: customer-feedback

Date: 2026-05-20

Target skill: `customer-feedback`

Command: `$benchmark-test-skill customer-feedback`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `customer-feedback`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.5% | 0 | 23.6s | 26.7s | 27.0s | $1.00 | $3.00 | 0.884 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.5% | 0 | 40.5s | 41.6s | 41.7s | $1.00 | $3.00 | 0.926 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 87.5% | 0 | 0 | `business-discovery-context` 0.0%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 87.5% | 0 | 0 | `business-discovery-context` 0.0%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/customer-feedback-claude-62e8d54b/`
- Codex: `tests/benchmarks/runs/customer-feedback-codex-7d328c09/`

## Next Route

Recommended next command: `$run`
