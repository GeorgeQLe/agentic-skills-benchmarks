# Benchmark Test: reconcile-dev-docs

Date: 2026-05-21

Target skill: `reconcile-dev-docs`

Command: `pnpm bench --skill reconcile-dev-docs --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `reconcile-dev-docs`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 88.6% | 0 | 27.6s | 35.8s | 36.6s | $1.00 | $3.00 | 0.855 | 0 |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 91.7% | 0 | 46.2s | 56.3s | 57.2s | $1.00 | $3.00 | 0.832 | 0 |

## Failed Assertions

- none

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 88.6% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 91.7% | 0 | 0 | `workflow-artifact-reference` 33.3%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/reconcile-dev-docs-claude-d79945d0/`
- Codex: `tests/benchmarks/runs/reconcile-dev-docs-codex-ec29e993/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 61.4% | 88.6% |
| codex | 0.0% (0/3) | 100.0% (3/3) | 70.5% | 91.7% |

## Next Route

Recommended next command: `$ship`
