# Benchmark Test: brainstorm

Date: 2026-05-21

Target skill: `brainstorm`

Command: `pnpm bench --skill brainstorm --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `brainstorm`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 89.4% | 0 | 51.2s | 52.1s | 52.2s | $1.00 | $3.00 | 0.862 | 0 |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 78.0% | 1 | 44.4s | 50.6s | 51.1s | $1.00 | $3.00 | 0.883 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #1 | 0 | Output includes tradeoffs |

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 89.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 83.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 78.0% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 66.7%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/brainstorm-claude-62a7262f/`
- Codex: `tests/benchmarks/runs/brainstorm-codex-a2ae5fb6/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0, 3 blocked) | 100.0% (3/3) | -- | 100% |
| codex | 50.0% (1/2, 1 blocked) | 66.7% (2/3) | 100% | 100% |

## Next Route

Recommended next command: `$run`
