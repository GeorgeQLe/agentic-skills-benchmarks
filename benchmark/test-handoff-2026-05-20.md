# Benchmark Test: handoff

Date: 2026-05-20

Target skill: `handoff`

Command: `$benchmark-test-skill handoff`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `handoff`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.2% | 4 | 33.6s | 34.6s | 34.7s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 73.5% | 3 | 29.7s | 30.7s | 30.8s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output includes current goal; Output includes completed work; Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents fail on route assertion across all runs. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 68.2% | 3 | 4 | `workflow-next-route` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-artifact-reference` 66.7%; `workflow-actionability` 83.3%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 73.5% | 3 | 3 | `workflow-next-route` 0.0%; `workflow-artifact-reference` 33.3%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/handoff-claude-3e315c1b/`
- Codex: `tests/benchmarks/runs/handoff-codex-32ac73e9/`

## Next Route

Recommended next command: `$run`
