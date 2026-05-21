# Benchmark Test: devtool-adoption

Date: 2026-05-20

Target skill: `devtool-adoption`

Command: `$benchmark-test-skill devtool-adoption`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `devtool-adoption`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.5% | 0 | 26.2s | 29.3s | 29.6s | $1.00 | $3.00 | 0.894 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.5% | 0 | 31.2s | 47.4s | 48.8s | $1.00 | $3.00 | 0.806 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 87.5% | 0 | 0 | `devtool-context` 0.0%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 3 | 87.5% | 0 | 0 | `devtool-context` 0.0%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/devtool-adoption-claude-51324599/`
- Codex: `tests/benchmarks/runs/devtool-adoption-codex-3df32e72/`

## Next Route

Recommended next command: `$run`
