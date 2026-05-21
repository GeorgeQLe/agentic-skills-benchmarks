# Benchmark Test: debug

Date: 2026-05-21

Target skill: `debug`

Command: `pnpm bench --skill debug --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `debug`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.1% | 0 | 29.5s | 49.8s | 51.6s | $1.00 | $3.00 | 0.780 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 84.8% | 0 | 33.4s | 38.0s | 38.4s | $1.00 | $3.00 | 0.865 | 0 |

## Failed Assertions

- none

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 84.8% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/debug-claude-defe8c74/`
- Codex: `tests/benchmarks/runs/debug-codex-ea9b332d/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |

## Next Route

Recommended next command: `$run`
