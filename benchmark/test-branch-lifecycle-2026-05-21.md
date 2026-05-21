# Benchmark Test: branch-lifecycle

Date: 2026-05-21

Target skill: `branch-lifecycle`

Command: `pnpm bench --skill branch-lifecycle --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `branch-lifecycle`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.1% | 0 | 23.3s | 24.6s | 24.7s | $1.00 | $3.00 | 0.931 | 0 |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 75.8% | 1 | 27.3s | 32.9s | 33.4s | $1.00 | $3.00 | 0.873 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #2 | 0 | Output includes salvage |

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 75.8% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 66.7%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/branch-lifecycle-claude-c2381c3d/`
- Codex: `tests/benchmarks/runs/branch-lifecycle-codex-f92d87ec/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |
| codex | 0.0% (0/3) | 66.7% (2/3) | 0% | 100% |

## Next Route

Recommended next command: `$run`
