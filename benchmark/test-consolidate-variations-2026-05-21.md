# Benchmark Test: consolidate-variations

Date: 2026-05-21

Target skill: `consolidate-variations`

Command: `pnpm bench --skill consolidate-variations --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `consolidate-variations`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.2% | 3 | 61.2s | 72.9s | 74.0s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 69.7% | 3 | 117.4s | 144.3s | 146.7s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes next command handoff |
| claude | #1 | 0 | Output includes next command handoff |
| claude | #2 | 0 | Output includes next command handoff |
| codex | #0 | 0 | Output includes next command handoff |
| codex | #1 | 0 | Output includes next command handoff |
| codex | #2 | 0 | Output includes next command handoff |

Route assertions (`workflow-next-route`) regressed to 0% for both agents despite fixture remediation. The `next command handoff` assertion may need fixture prompt adjustment — both agents produce output but fail to include the expected handoff string.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 68.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 69.7% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/consolidate-variations-claude-6e3cdb28/`
- Codex: `tests/benchmarks/runs/consolidate-variations-codex-d0205b3a/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0, 3 blocked) | 0.0% (0/3) | -- | 0% |
| codex | 0.0% (0/2, 1 blocked) | 0.0% (0/3) | 0% | 0% |

## Next Route

Recommended next command: `$run`
