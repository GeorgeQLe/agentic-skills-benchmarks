# Benchmark Test: create-agentic-skill

Date: 2026-05-19

Target skill: `create-agentic-skill`

Command: `$benchmark-test-skill create-agentic-skill`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `create-agentic-skill`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.2% | 3 | 42.3s | 47.4s | 47.8s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes next command handoff; Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |

Claude consistently fails the `$run` route assertion. All 3 Codex runs infrastructure-blocked by agent runner timeout at smoke budget ($0.25).

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 68.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 0 | -- | -- | -- | All runs infrastructure-blocked. |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #0 | agent runner timeout |
| codex | #1 | agent runner timeout |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/create-agentic-skill-claude-0730c5da/`
- Codex: `tests/benchmarks/runs/create-agentic-skill-codex-cc806349/`

## Next Route

Recommended next command: `$run`
