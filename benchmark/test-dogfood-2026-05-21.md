# Benchmark Test: dogfood

Date: 2026-05-21

Target skill: `dogfood`

Command: `pnpm bench --skill dogfood --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `dogfood`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 59.1% | 3 | 49.7s | 64.5s | 65.8s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 71.2% | 2 | 59.4s | 59.5s | 59.5s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes owner scenarios |
| claude | #1 | 0 | Output includes owner scenarios |
| claude | #2 | 0 | Output includes owner scenarios |
| codex | #1 | 0 | Output includes owner scenarios |
| codex | #2 | 0 | Output includes owner scenarios |

Route assertions now pass (100% both agents) after fixture remediation. Remaining failures are on `owner scenarios` content assertion — the fixture prompt may need additional scenario-context enrichment.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 59.1% | 3 | 3 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 71.2% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-actionability` 83.3%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/dogfood-claude-6497e7a4/`
- Codex: `tests/benchmarks/runs/dogfood-codex-dab8e72c/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2, 1 blocked) | 0.0% (0/3) | 0% | 100% |
| codex | 33.3% (1/3) | 33.3% (1/3) | 33.3% | 100% |

Claude unblocked (budget increased from smoke to standard). Route improved from partial to 100% for both agents. Content assertion (`owner scenarios`) remains the blocker.

## Next Route

Recommended next command: `$run`
