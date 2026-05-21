# Benchmark Test: provision-agentic-config

Date: 2026-05-20

Target skill: `provision-agentic-config`

Command: `$benchmark-test-skill provision-agentic-config`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 40.2% | 7 | 61.0s | 71.7s | 72.6s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety; Output recommends $run |
| codex | #1 | 0 | Output includes orchestration rules; Output includes monorepo safety; Output recommends $run |
| codex | #2 | 0 | Output includes orchestration rules; Output includes monorepo safety; Output recommends $run |

Claude all 3 runs infrastructure-blocked (budget exceeded at $0.25/run). Codex fails orchestration rules, monorepo safety, and route assertions.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | -- | -- | -- | All runs infrastructure-blocked. |
| codex | 3 | 40.2% | 3 | 7 | `workflow-fixture-facts` 0.0%; `workflow-next-route` 0.0%; `workflow-artifact-reference` 33.3%; `no-generic-or-external-overreach` 66.7%; `workflow-actionability` 75.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner budget exceeded |
| claude | #1 | agent runner budget exceeded |
| claude | #2 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-51d425e8/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-b214cc67/`

## Next Route

Recommended next command: `$run`
