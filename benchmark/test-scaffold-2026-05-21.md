# Benchmark Test: scaffold

Date: 2026-05-21

Target skill: `scaffold`

Command: `pnpm bench --skill scaffold --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `scaffold`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 86.4% | 0 | 50.4s | 65.3s | 66.6s | $1.00 | $3.00 | 0.856 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 90.2% | 0 | 53.1s | 66.7s | 67.9s | $1.00 | $3.00 | 0.855 | 0 |

## Failed Assertions

- none

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 86.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 90.2% | 0 | 0 | `workflow-artifact-reference` 33.3%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/scaffold-claude-fb01bf6c/`
- Codex: `tests/benchmarks/runs/scaffold-codex-877e9806/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 50.0% | 86.4% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 68.2% | 90.2% |

## Next Route

Recommended next command: `$run`
