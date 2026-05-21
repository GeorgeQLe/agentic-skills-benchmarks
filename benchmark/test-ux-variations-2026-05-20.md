# Benchmark Test: ux-variations

Date: 2026-05-20

Target skill: `ux-variations`

Command: `$benchmark-test-skill ux-variations`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `ux-variations`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 50.8% | 5 | 78.5s | 114.8s | 118.0s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 50.8% | 6 | 53.6s | 62.3s | 63.1s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes layout variations; Output includes alternatives; Output recommends $ui-interview |
| claude | #1 | 0 | Output includes layout variations; Output includes alternatives; Output includes next command handoff; Output recommends $ui-interview |
| claude | #2 | 0 | Output includes next command handoff; Output recommends $ui-interview |
| codex | #0 | 0 | Output includes layout variations; Output includes variant evaluation; Output recommends $ui-interview |
| codex | #1 | 0 | Output includes layout variations; Output recommends $ui-interview |
| codex | #2 | 0 | Output includes layout variations; Output recommends $ui-interview |

Both agents fail the route assertion (`$ui-interview`) and layout variations assertion. Most assertion failures beyond route in this batch — domain-specific assertions are harder for both agents here.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 50.8% | 3 | 5 | `workflow-next-route` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 33.3%; `workflow-artifact-reference` 33.3%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 50.8% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 58.3%; `workflow-artifact-reference` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/ux-variations-claude-64f893c9/`
- Codex: `tests/benchmarks/runs/ux-variations-codex-a7940fe5/`

## Next Route

Recommended next command: `$run`
