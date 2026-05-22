# Benchmark Test: skills

Date: 2026-05-21

Target skill: `skills`

Command: `pnpm bench --skill skills --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `skills`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.1% | 0 | 16.9s | 17.0s | 17.0s | $1.00 | $3.00 | 0.965 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 86.4% | 0 | 48.4s | 62.3s | 63.5s | $1.00 | $3.00 | 0.860 | 0 |

## Failed Assertions

- none

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 86.4% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/skills-claude-0056c272/`
- Codex: `tests/benchmarks/runs/skills-codex-2fc0514b/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 65.9% | 84.1% |
| codex | 33.3% (1/3) | 100.0% (3/3) | 72.0% | 86.4% |

## Next Route

Recommended next command: `$run`
