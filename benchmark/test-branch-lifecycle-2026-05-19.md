# Benchmark Test: branch-lifecycle

Date: 2026-05-19

Target skill: `branch-lifecycle`

Command: `$benchmark-test-skill branch-lifecycle`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `branch-lifecycle`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 66.7% | 3 | 25.8s | 26.3s | 26.4s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 65.9% | 3 | 29.3s | 36.8s | 37.4s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $ship |
| claude | #1 | 0 | Output recommends $ship |
| claude | #2 | 0 | Output recommends $ship |
| codex | #0 | 0 | Output recommends $ship |
| codex | #1 | 0 | Output recommends $ship |
| codex | #2 | 0 | Output recommends $ship |

Both agents consistently fail the `$ship` route assertion (6/6 runs). The fixture prompt likely needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 66.7% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 65.9% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/branch-lifecycle-claude-533715c3/`
- Codex: `tests/benchmarks/runs/branch-lifecycle-codex-58eb9902/`

## Next Route

Recommended next command: `$run`
