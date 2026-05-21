# Benchmark Test: concept-exploration

Date: 2026-05-21

Target skill: `concept-exploration`

Command: `pnpm bench --skill concept-exploration --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `concept-exploration`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 66.7% (2/3) | 0 | 20.8%-93.9% | 78.0% | 1 | 40.8s | 44.1s | 44.4s | $1.00 | $3.00 | 0.842 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.1% | 0 | 34.0s | 36.2s | 36.4s | $1.00 | $3.00 | 0.969 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $spec-interview |

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 78.0% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-next-route` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/concept-exploration-claude-6ec70f41/`
- Codex: `tests/benchmarks/runs/concept-exploration-codex-aebc7790/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0, 3 blocked) | 66.7% (2/3) | -- | 66.7% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |

## Next Route

Recommended next command: `$run`
