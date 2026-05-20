# Benchmark Test: create-local-skill

Date: 2026-05-19

Target skill: `create-local-skill`

Command: `$benchmark-test-skill create-local-skill`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `create-local-skill`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2) | 1 | 0.0%-65.8% | 54.5% | 3 | 38.4s | 43.7s | 44.2s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 59.8% | 4 | 31.2s | 33.5s | 33.7s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #1 | 0 | Output includes promotion option; Output recommends $ship |
| claude | #2 | 0 | Output recommends $ship |
| codex | #0 | 0 | Output recommends $ship |
| codex | #1 | 0 | Output recommends $ship |
| codex | #2 | 0 | Output includes local skill path; Output recommends $ship |

Both agents consistently fail the `$ship` route assertion. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 54.5% | 2 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-fixture-facts` 50.0%; `workflow-actionability` 50.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 59.8% | 3 | 4 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 66.7%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/create-local-skill-claude-e9c00b4f/`
- Codex: `tests/benchmarks/runs/create-local-skill-codex-941bef25/`

## Next Route

Recommended next command: `$run`
