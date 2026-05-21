# Benchmark Test: regression-check

Date: 2026-05-20

Target skill: `regression-check`

Command: `$benchmark-test-skill regression-check`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `regression-check`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 43.2% | 6 | 40.0s | 43.4s | 43.7s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 71.2% | 3 | 53.2s | 63.9s | 64.8s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes health checks; Output recommends $ship |
| claude | #1 | 0 | Output includes health checks; Output recommends $ship |
| claude | #2 | 0 | Output includes health checks; Output includes command results; Output recommends $ship |
| codex | #0 | 0 | Output recommends $ship |
| codex | #1 | 0 | Output recommends $ship |
| codex | #2 | 0 | Output recommends $ship |

Both agents fail the `$ship` route assertion. Claude also fails health check and command result assertions.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 43.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 83.3%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 71.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/regression-check-claude-9ee4e439/`
- Codex: `tests/benchmarks/runs/regression-check-codex-345a91d4/`

## Next Route

Recommended next command: `$run`
