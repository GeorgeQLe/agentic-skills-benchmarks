# Benchmark Test: dead-code

Date: 2026-05-19

Target skill: `dead-code`

Command: `$benchmark-test-skill dead-code`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.4s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `dead-code`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.2% | 3 | 27.6s | 47.5s | 49.2s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 76.5% | 2 | 40.0s | 41.6s | 41.8s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents consistently fail the `$run` route assertion. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 68.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 76.5% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 33.3%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/dead-code-claude-79d2f0f1/`
- Codex: `tests/benchmarks/runs/dead-code-codex-b9ac78b0/`

## Next Route

Recommended next command: `$run`
