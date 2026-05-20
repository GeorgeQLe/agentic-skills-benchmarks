# Benchmark Test: codebase-status

Date: 2026-05-19

Target skill: `codebase-status`

Command: `$benchmark-test-skill codebase-status`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `codebase-status`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 72.0% | 2 | 36.3s | 45.2s | 46.0s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output includes what this repo is |
| codex | #1 | 0 | Output includes what this repo is |

All 3 Claude runs were infrastructure-blocked by agent runner timeout at smoke budget ($0.25). This matches the recurring budget-block pattern.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | -- | -- | -- | All runs infrastructure-blocked. |
| codex | 3 | 72.0% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-actionability` 91.7%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner timeout |
| claude | #1 | agent runner timeout |
| claude | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/codebase-status-claude-c4d0b304/`
- Codex: `tests/benchmarks/runs/codebase-status-codex-8575035e/`

## Next Route

Recommended next command: `$run`
