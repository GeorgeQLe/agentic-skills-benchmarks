# Benchmark Test: expert-review

Date: 2026-05-21

Target skill: `expert-review`

Command: `pnpm bench --skill expert-review --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `expert-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.8% | 0 | 44.6s | 44.8s | 44.8s | $1.00 | $3.00 | 0.830 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.9% | 0 | 25.3s | 27.1s | 27.3s | $1.00 | $3.00 | 0.812 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| -- | -- | -- | none |

Both agents passed all 3 runs with no assertion failures.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 84.8% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 87.9% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/expert-review-claude-f5a806b8/`
- Codex: `tests/benchmarks/runs/expert-review-codex-f5f227c5/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/1, 2 blocked) | 100.0% (3/3) | 0% | 100% |
| codex | 66.7% (2/3) | 100.0% (3/3) | 66.7% | 100% |

## Next Route

Recommended next command: `$run`
