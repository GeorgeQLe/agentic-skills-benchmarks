# Benchmark Test: devtool-adoption

Date: 2026-05-21

Target skill: `devtool-adoption`

Command: `$benchmark-test-skill devtool-adoption`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.7s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `devtool-adoption`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 27.1s | 28.1s | 28.1s | $1.00 | $3.00 | 0.891 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 27.9s | 73.9s | 77.9s | $1.00 | $3.00 | 0.871 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 100.0% | 0 | 0 | All criteria 100.0% |
| codex | 3 | 100.0% | 0 | 0 | All criteria 100.0% |

Domain enrichment impact: `devtool-context` improved from 0% (2026-05-20) to 100% for both agents. `pack-workflow-traits` no longer appears as a separate low-scoring criterion. Overall quality improved from 87.5% to 100.0%.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/devtool-adoption-claude-944bd568/`
- Codex: `tests/benchmarks/runs/devtool-adoption-codex-f45c94a7/`

## Next Route

Recommended next command: `$run`
