# Benchmark Test: expert-review

Date: 2026-05-20

Target skill: `expert-review`

Command: `$benchmark-test-skill expert-review`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `expert-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/1) | 2 | 0.0%-79.3% | 65.9% | 1 | 51.2s | 51.2s | 51.2s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 79.5% | 1 | 36.7s | 43.6s | 44.3s | $0.25 | $0.75 | 0.840 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #2 | 0 | Output recommends $run |
| codex | #0 | 0 | Output recommends $run |

Claude budget-blocked on 2/3 runs. Codex achieves 66.7% pass rate — strongest result so far.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 1 | 65.9% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 79.5% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 41.7%; `workflow-next-route` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner budget exceeded |
| claude | #1 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/expert-review-claude-3504c2d1/`
- Codex: `tests/benchmarks/runs/expert-review-codex-1a5ca281/`

## Next Route

Recommended next command: `$run`
