# Benchmark Test: consolidate-variations

Date: 2026-05-19

Target skill: `consolidate-variations`

Command: `$benchmark-test-skill consolidate-variations`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.4s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `consolidate-variations`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/2) | 1 | 0.0%-65.8% | 72.7% | 2 | 162.4s | 167.8s | 168.3s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output includes next command handoff; Output recommends $research-roadmap --post-prototype |
| codex | #1 | 0 | Output includes next command handoff; Output recommends $research-roadmap --post-prototype |

All 3 Claude runs infrastructure-blocked (2 budget exceeded, 1 timeout at smoke $0.25). Codex runs fail the route assertion — fixture prompt needs explicit route guidance for `$research-roadmap --post-prototype`.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | -- | -- | -- | All runs infrastructure-blocked. |
| codex | 2 | 72.7% | 2 | 2 | `workflow-next-route` 0.0%; `workflow-artifact-reference` 50.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner budget exceeded |
| claude | #1 | agent runner timeout |
| claude | #2 | agent runner budget exceeded |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/consolidate-variations-claude-b5ffa772/`
- Codex: `tests/benchmarks/runs/consolidate-variations-codex-bd63b294/`

## Next Route

Recommended next command: `$run`
