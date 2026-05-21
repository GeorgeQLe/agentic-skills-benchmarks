# Benchmark Test: hygiene

Date: 2026-05-21

Target skill: `hygiene`

Command: `pnpm bench --skill hygiene --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `hygiene`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 56.8% | 3 | 33.7s | 35.2s | 35.3s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 66.7% | 2 | 35.9s | 37.2s | 37.3s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes convention violations; Output includes missing files |
| claude | #1 | 0 | Output includes convention violations; Output includes missing files |
| claude | #2 | 0 | Output includes convention violations; Output includes missing files |
| codex | #1 | 0 | Output includes convention violations |
| codex | #2 | 0 | Output includes convention violations; Output includes missing files |

Route assertions now pass (100% both agents) after fixture remediation. Remaining failures are on content assertions (`convention violations`, `missing files`) — the fixture prompt may need additional context to elicit these specific content patterns.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 56.8% | 3 | 3 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 66.7% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-actionability` 33.3%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/hygiene-claude-da03e5b2/`
- Codex: `tests/benchmarks/runs/hygiene-codex-572f4ed5/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0.0% (0/3) | 0% | 100% |
| codex | 0.0% (0/3) | 33.3% (1/3) | 0% | 100% |

Route improved from 0% to 100% for both agents. Codex gained one passing run. Content assertions (`convention violations`, `missing files`) remain the blocker for both agents.

## Next Route

Recommended next command: `$run`
