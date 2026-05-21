# Benchmark Test: decommission

Date: 2026-05-21

Target skill: `decommission`

Command: `$benchmark-test-skill decommission`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `decommission`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 86.4% | 0 | 31.2s | 33.2s | 33.4s | $1.00 | $3.00 | 0.908 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 86.4% | 0 | 31.0s | 32.0s | 32.1s | $1.00 | $3.00 | 0.963 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 86.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 86.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

Route guidance and fixture-facts both improved from 0% (2026-05-20) to 100% for both agents.

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/decommission-claude-11f31edb/`
- Codex: `tests/benchmarks/runs/decommission-codex-98016876/`

## Next Route

Recommended next command: `$run`
