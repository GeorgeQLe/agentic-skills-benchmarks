# Benchmark Test: spec-drift

Date: 2026-05-21

Target skill: `spec-drift`

Command: `pnpm bench --skill spec-drift --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `spec-drift`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.1% | 0 | 20.6s | 22.1s | 22.2s | $1.00 | $3.00 | 0.910 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.8% | 0 | 38.0s | 64.2s | 66.5s | $1.00 | $3.00 | 0.838 | 0 |

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

- Claude: `tests/benchmarks/runs/spec-drift-claude-92fdaa58/`
- Codex: `tests/benchmarks/runs/spec-drift-codex-67abee59/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 65.9% | 84.1% |
| codex | 100.0% (3/3) | 100.0% (3/3) | 84.1% | 84.8% |

## Next Route

Recommended next command: `$run`
