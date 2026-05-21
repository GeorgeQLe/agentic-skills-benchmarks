# Benchmark Test: reconcile-dev-docs

Date: 2026-05-20

Target skill: `reconcile-dev-docs`

Command: `$benchmark-test-skill reconcile-dev-docs`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.7s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `reconcile-dev-docs`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 61.4% | 4 | 33.6s | 34.7s | 34.8s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 70.5% | 3 | 40.3s | 48.9s | 49.7s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $ship |
| claude | #1 | 0 | Output recommends $ship |
| claude | #2 | 0 | Output includes stale docs; Output recommends $ship |
| codex | #0 | 0 | Output recommends $ship |
| codex | #1 | 0 | Output recommends $ship |
| codex | #2 | 0 | Output recommends $ship |

Both agents consistently fail the `$ship` route assertion. Fixture prompt needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 61.4% | 3 | 4 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 66.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 70.5% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/reconcile-dev-docs-claude-39cc2c1e/`
- Codex: `tests/benchmarks/runs/reconcile-dev-docs-codex-c33e4cc6/`

## Next Route

Recommended next command: `$run`
