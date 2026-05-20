# Benchmark Test: migrate

Date: 2026-05-20

Target skill: `migrate`

Command: `$benchmark-test-skill migrate`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `migrate`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2) | 1 | 0.0%-65.8% | 70.5% | 2 | 54.3s | 54.3s | 54.3s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 70.5% | 3 | 38.5s | 49.7s | 50.7s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Claude budget-blocked on run #1. Both agents fail on route assertion only — fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 70.5% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 70.5% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #1 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/migrate-claude-2e999e56/`
- Codex: `tests/benchmarks/runs/migrate-codex-9d71a883/`

## Next Route

Recommended next command: `$run`
