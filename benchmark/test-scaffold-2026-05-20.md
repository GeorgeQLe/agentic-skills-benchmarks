# Benchmark Test: scaffold

Date: 2026-05-20

Target skill: `scaffold`

Command: `$benchmark-test-skill scaffold`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | FAIL | 2.9s | Pre-existing `quiz-me` coverage gap (unrelated to `scaffold`). |
| layer2 | SKIP | -- | No layer2 tests matched `scaffold`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 50.0% | 5 | 54.3s | 70.5s | 72.0s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.2% | 3 | 36.2s | 47.5s | 48.6s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes package path; Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output includes package path; Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents consistently fail the `$run` route assertion. Claude also fails package path assertion in 2/3 runs. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 50.0% | 3 | 5 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 66.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 68.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/scaffold-claude-d3d43b7b/`
- Codex: `tests/benchmarks/runs/scaffold-codex-88bd13ca/`

## Next Route

Recommended next command: `$run`
