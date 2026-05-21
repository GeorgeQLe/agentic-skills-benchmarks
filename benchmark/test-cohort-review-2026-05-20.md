# Benchmark Test: cohort-review

Date: 2026-05-20

Target skill: `cohort-review`

Command: `$benchmark-test-skill cohort-review`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `cohort-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 80.0% | 1 | 30.2s | 30.4s | 30.4s | $1.00 | $3.00 | 0.846 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 70.0% | 2 | 32.4s | 38.7s | 39.2s | $1.00 | $3.00 | 0.853 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 80.0% | 1 | 1 | `business-ops-context` 33.3%; `pack-workflow-traits` 33.3%; `pack-fixture-evidence` 66.7%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 70.0% | 2 | 2 | `business-ops-context` 0.0%; `pack-fixture-evidence` 33.3%; `pack-workflow-traits` 33.3%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/cohort-review-claude-543183b4/`
- Codex: `tests/benchmarks/runs/cohort-review-codex-af9a6bd7/`

## Next Route

Recommended next command: `$run`
