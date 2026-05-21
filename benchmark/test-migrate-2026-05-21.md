# Benchmark Test: migrate

Date: 2026-05-21

Target skill: `migrate`

Command: `pnpm bench --skill migrate --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `migrate`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 88.6% | 0 | 33.5s | 39.9s | 40.5s | $1.00 | $3.00 | 0.924 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 70.5% | 2 | 44.2s | 59.6s | 61.0s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #1 | 0 | Output includes phases |
| codex | #2 | 0 | Output includes phases |

Claude passed all 3 runs. Codex failed 2 of 3 runs on the "Output includes phases" assertion.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 88.6% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 70.5% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-actionability` 75.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/migrate-claude-97b1a9ab/`
- Codex: `tests/benchmarks/runs/migrate-codex-07926985/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2, 1 blocked) | 100.0% (3/3) | 0% | 100% |
| codex | 0.0% (0/3) | 33.3% (1/3) | 0% | 100% |

## Next Route

Recommended next command: `$run`
