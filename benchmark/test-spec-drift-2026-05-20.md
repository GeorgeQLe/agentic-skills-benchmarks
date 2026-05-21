# Benchmark Test: spec-drift

Date: 2026-05-20

Target skill: `spec-drift`

Command: `$benchmark-test-skill spec-drift`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `spec-drift`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 65.9% | 3 | 27.0s | 28.4s | 28.5s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.1% | 0 | 26.5s | 27.0s | 27.0s | $1.00 | $3.00 | 0.892 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |

Codex passes all 3 runs (100% pass rate). Claude fails on route assertion only.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 65.9% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 84.1% | 0 | 0 | `workflow-actionability` 50.0%; `workflow-artifact-reference` 50.0%; `workflow-next-route` 100.0%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/spec-drift-claude-49e68d7d/`
- Codex: `tests/benchmarks/runs/spec-drift-codex-9508ccce/`

## Next Route

Recommended next command: `$run`
