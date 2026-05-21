# Benchmark Test: provision-agentic-config

Date: 2026-05-21

Target skill: `provision-agentic-config`

Command: `pnpm bench --skill provision-agentic-config --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 53.8% | 4 | 45.0s | 50.5s | 51.0s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 56.8% | 4 | 46.3s | 67.2s | 69.0s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| claude | #1 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| claude | #2 | 0 | Output includes orchestration rules |
| codex | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| codex | #1 | 0 | Output includes orchestration rules |
| codex | #2 | 0 | Output includes orchestration rules; Output includes monorepo safety |

Route assertions now pass (100% both agents) after fixture remediation. Remaining failures are on content assertions (`orchestration rules`, `monorepo safety`) — the fixture prompt may need additional context to elicit these specific content patterns.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 53.8% | 3 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 58.3%; `no-generic-or-external-overreach` 66.7%; `workflow-next-route` 100.0% |
| codex | 3 | 56.8% | 3 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `no-generic-or-external-overreach` 66.7%; `workflow-actionability` 91.7%; `workflow-next-route` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-56ba7b62/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-b9e872bb/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0, 3 blocked) | 0.0% (0/3) | N/A (blocked) | 100% |
| codex | 0.0% (0/3) | 0.0% (0/3) | 0% | 100% |

Claude fully unblocked (all 3 runs were previously infrastructure-blocked at smoke budget). Route improved from 0% to 100% for both agents. Pass rates remain at 0% due to content assertions (`orchestration rules`, `monorepo safety`) that the fixture prompt does not yet elicit from either agent.

## Next Route

Recommended next command: `$run`
