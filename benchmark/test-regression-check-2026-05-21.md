# Benchmark Test: regression-check

Date: 2026-05-21

Target skill: `regression-check`

Command: `pnpm bench --skill regression-check --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `regression-check`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 79.5% | 1 | 20.2s | 26.4s | 26.9s | $1.00 | $3.00 | 0.902 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 82.6% | 1 | 72.5s | 89.2s | 90.7s | $1.00 | $3.00 | 0.856 | 0 |

## Failed Assertions

- Claude run #0: "Output includes command results"

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 79.5% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-actionability` 75.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 82.6% | 1 | 1 | `workflow-artifact-reference` 0.0%; `no-generic-or-external-overreach` 66.7%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/regression-check-claude-a5aa3c80/`
- Codex: `tests/benchmarks/runs/regression-check-codex-368afb1b/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 66.7% (2/3) | 43.2% | 79.5% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 71.2% | 82.6% |

## Next Route

Recommended next command: `$ship`
