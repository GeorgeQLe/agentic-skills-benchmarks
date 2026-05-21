# Benchmark Test: devtool-docs-audit

Date: 2026-05-20

Target skill: `devtool-docs-audit`

Command: `$benchmark-test-skill devtool-docs-audit`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `devtool-docs-audit`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (1/1) | 2 | 20.7%-100.0% | 85.0% | 0 | 29.7s | 29.7s | 29.7s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 100.0% (1/1) | 2 | 20.7%-100.0% | 85.0% | 0 | 29.0s | 29.0s | 29.0s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 1 | 85.0% | 0 | 0 | `devtool-context` 0.0%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | 1 | 85.0% | 0 | 0 | `devtool-context` 0.0%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #1 | agent runner timeout |
| claude | #2 | agent runner timeout |
| codex | #0 | agent runner timeout |
| codex | #1 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/devtool-docs-audit-claude-90cb7859/`
- Codex: `tests/benchmarks/runs/devtool-docs-audit-codex-09077966/`

## Next Route

Recommended next command: `$run`
