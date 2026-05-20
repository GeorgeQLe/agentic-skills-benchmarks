# Benchmark Test: provision-agentic-config

Date: 2026-05-20

Target skill: `provision-agentic-config`

Command: `$benchmark-test-skill provision-agentic-config`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/1) | 2 | 0.0%-79.3% | 59.1% | 1 | 45.1s | 45.1s | 45.1s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 50.0% | 6 | 58.2s | 67.3s | 68.1s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| codex | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety; Output recommends $run |
| codex | #1 | 0 | Output includes orchestration rules; Output includes monorepo safety; Output recommends $run |
| codex | #2 | 0 | Output includes orchestration rules; Output recommends $run |

Claude budget-blocked on 2/3 runs. Both agents fail on orchestration-rules and monorepo-safety assertions — fixture prompt needs explicit expected-output guidance for these domain-specific checks.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 1 | 59.1% | 1 | 1 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 50.0% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-next-route` 0.0%; `workflow-artifact-reference` 66.7%; `workflow-actionability` 83.3%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #1 | agent runner budget exceeded |
| claude | #2 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-cb45ccab/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-908cbc74/`

## Next Route

Recommended next command: `$run`
