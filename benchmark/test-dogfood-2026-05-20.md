# Benchmark Test: dogfood

Date: 2026-05-20

Target skill: `dogfood`

Command: `$benchmark-test-skill dogfood`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `dogfood`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2) | 1 | 0.0%-65.8% | 40.9% | 4 | 50.1s | 52.7s | 52.9s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 72.0% | 2 | 50.6s | 57.5s | 58.1s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #1 | 0 | Output includes owner scenarios; Output recommends $uat |
| claude | #2 | 0 | Output includes owner scenarios; Output includes manual checks; Output recommends $uat |
| codex | #0 | 0 | Output includes owner scenarios |
| codex | #2 | 0 | Output recommends $uat |

Claude budget-blocked on run #0. Both agents struggle with owner-scenario and route assertions.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 40.9% | 2 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 72.0% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 66.7%; `workflow-next-route` 66.7%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/dogfood-claude-f235667a/`
- Codex: `tests/benchmarks/runs/dogfood-codex-1eaa9207/`

## Next Route

Recommended next command: `$run`
