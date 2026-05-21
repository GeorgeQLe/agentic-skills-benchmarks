# Benchmark Test: trace

Date: 2026-05-20

Target skill: `trace`

Command: `$benchmark-test-skill trace`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `trace`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 58.3% | 4 | 41.0s | 45.4s | 45.8s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 65.9% | 3 | 32.2s | 45.1s | 46.2s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output includes entrypoint; Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents consistently fail the `$run` route assertion. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 58.3% | 3 | 4 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 66.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 65.9% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/trace-claude-696e4a8b/`
- Codex: `tests/benchmarks/runs/trace-codex-6cba7113/`

## Next Route

Recommended next command: `$run`
