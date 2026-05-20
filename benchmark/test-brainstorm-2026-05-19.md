# Benchmark Test: brainstorm

Date: 2026-05-19

Target skill: `brainstorm`

Command: `$benchmark-test-skill brainstorm`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `brainstorm`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 50.0% (1/2) | 1 | 9.5%-90.5% | 76.1% | 1 | 54.4s | 54.8s | 54.8s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #2 | 0 | Output includes tradeoffs |

All 3 Claude runs were infrastructure-blocked by agent runner timeout at smoke budget ($0.25). This matches the Batch 41.2 budget-block pattern — `brainstorm` likely needs `BENCH_BUDGETS_USD.standard` ($1.00).

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | -- | -- | -- | All runs infrastructure-blocked. |
| codex | 2 | 76.1% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 50.0%; `workflow-actionability` 87.5%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner timeout |
| claude | #1 | agent runner timeout |
| claude | #2 | agent runner timeout |
| codex | #0 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/brainstorm-claude-dcb97159/`
- Codex: `tests/benchmarks/runs/brainstorm-codex-94e0e6e8/`

## Next Route

Recommended next command: `$run`
