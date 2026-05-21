# Benchmark Test: handoff

Date: 2026-05-21

Target skill: `handoff`

Command: `pnpm bench --skill handoff --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `handoff`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 66.7% (2/3) | 0 | 20.8%-93.9% | 85.6% | 1 | 28.0s | 29.8s | 30.0s | $1.00 | $3.00 | 0.917 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 89.4% | 0 | 21.5s | 26.1s | 26.5s | $1.00 | $3.00 | 0.818 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #1 | 0 | Output includes current goal; Output includes completed work |

Claude failed 1 of 3 runs on content assertions. Codex passed all 3 runs.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.6% | 1 | 1 | `workflow-fixture-facts` 66.7%; `workflow-artifact-reference` 66.7%; `workflow-actionability` 75.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 89.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 83.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/handoff-claude-99183666/`
- Codex: `tests/benchmarks/runs/handoff-codex-4e881b9b/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 66.7% (2/3) | 0% | 100% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |

## Next Route

Recommended next command: `$run`
