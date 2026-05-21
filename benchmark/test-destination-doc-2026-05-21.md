# Benchmark Test: destination-doc

Date: 2026-05-21

Target skill: `destination-doc`

Command: `$benchmark-test-skill destination-doc`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.6s | Static harness-contract gate passed. |
| layer2 | PASS | 37.5s | Target-specific layer2 tests passed. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 39.6s | 40.9s | 41.0s | $1.00 | $3.00 | 0.911 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 92.5% | 1 | 55.1s | 74.4s | 76.1s | $1.00 | $3.00 | 0.849 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 100.0% | 0 | 0 | All criteria 100.0% including `alignment-loop-context` 100.0% |
| codex | 3 | 92.5% | 0 | 1 | `pack-fixture-evidence` 66.7%; `pack-workflow-traits` 91.7%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

Domain-specific `alignment-loop-context` at 100.0% for claude (was included in criteria but previously scored low). `pack-workflow-traits` improved from 50.0% (2026-05-20) to 91.7% (codex) / 100.0% (claude). Overall quality improved from 95.0% to 100.0% (claude) and 92.5% (codex).

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/destination-doc-claude-ce36a590/`
- Codex: `tests/benchmarks/runs/destination-doc-codex-260bc064/`

## Next Route

Recommended next command: `$run`
