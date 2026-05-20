# Benchmark Test: mono-plan

Date: 2026-05-20

Target skill: `mono-plan`

Command: `$benchmark-test-skill mono-plan`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `mono-plan`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 43.2% | 6 | 38.6s | 39.1s | 39.2s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 40.2% | 6 | 37.2s | 39.6s | 39.8s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes package boundaries; Output recommends $run |
| claude | #1 | 0 | Output includes package boundaries; Output includes safe lanes; Output recommends $run |
| claude | #2 | 0 | Output includes package boundaries; Output includes safe lanes; Output recommends $run |
| codex | #0 | 0 | Output includes safe lanes; Output recommends $run |
| codex | #1 | 0 | Output includes package boundaries; Output includes safe lanes; Output recommends $run |
| codex | #2 | 0 | Output includes package boundaries; Output includes safe lanes; Output recommends $run |

Both agents fail on multiple assertions: package boundaries, safe lanes, and route. Fixture prompt needs more context about monorepo structure.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 43.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 40.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 41.7%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/mono-plan-claude-79746e35/`
- Codex: `tests/benchmarks/runs/mono-plan-codex-058352cd/`

## Next Route

Recommended next command: `$run`
