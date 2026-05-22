# Benchmark Test: research-roadmap

Date: 2026-05-21

Target skill: `research-roadmap`

Command: `pnpm bench --skill research-roadmap --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `research-roadmap`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 78.0% | 1 | 27.2s | 30.8s | 31.1s | $1.00 | $3.00 | 0.870 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 87.1% | 0 | 42.5s | 43.1s | 43.2s | $1.00 | $3.00 | 0.856 | 0 |

## Failed Assertions

- Claude run #2: "Output includes priority queue"

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 78.0% | 1 | 1 | `workflow-actionability` 25.0%; `workflow-artifact-reference` 33.3%; `workflow-fixture-facts` 66.7%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 87.1% | 0 | 0 | `workflow-actionability` 25.0%; `workflow-artifact-reference` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/research-roadmap-claude-6e3b269e/`
- Codex: `tests/benchmarks/runs/research-roadmap-codex-3d00e7f3/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 66.7% (2/3) | 37.1% | 78.0% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 68.9% | 87.1% |

## Next Route

Recommended next command: `$run`
