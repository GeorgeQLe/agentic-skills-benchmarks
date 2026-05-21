# Benchmark Test: codebase-status

Date: 2026-05-21

Target skill: `codebase-status`

Command: `pnpm bench --skill codebase-status --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `codebase-status`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 56.1% | 4 | 28.8s | 34.5s | 35.0s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 90.2% | 0 | 25.8s | 32.6s | 33.2s | $1.00 | $3.00 | 0.775 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes what this repo is |
| claude | #1 | 0 | Output includes what this repo is |
| claude | #2 | 0 | Output includes what this repo is; Output recommends $run |

Claude fails on `what this repo is` content assertion despite route remediation improving `workflow-next-route` to 66.7%. Codex passes all assertions with 100% quality on fixture-facts and route criteria.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 56.1% | 3 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 66.7%; `workflow-actionability` 83.3%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 90.2% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 91.7%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/codebase-status-claude-6a202762/`
- Codex: `tests/benchmarks/runs/codebase-status-codex-57d24257/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0, 3 blocked) | 0.0% (0/3) | -- | 66.7% |
| codex | 33.3% (1/3) | 100.0% (3/3) | 33.3% | 100% |

## Next Route

Recommended next command: `$run`
