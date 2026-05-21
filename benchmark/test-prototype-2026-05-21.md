# Benchmark Test: prototype

Date: 2026-05-21

Target skill: `prototype`

Command: `pnpm bench --skill prototype --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `prototype`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 37.9% | 6 | 84.6s | 117.7s | 120.7s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 47.7% | 5 | 117.9s | 186.2s | 192.3s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes hub page; Output includes fake data; Output includes next command handoff |
| claude | #1 | 0 | Output includes hub page; Output includes clickable; Output includes fake data; Output includes next command handoff |
| claude | #2 | 0 | Output includes hub page; Output includes fake data; Output includes next command handoff; Output recommends $uat --variant-evaluation |
| codex | #0 | 0 | Output includes hub page; Output includes clickable; Output includes fake data; Output includes next command handoff |
| codex | #1 | 0 | Output includes hub page; Output includes next command handoff |
| codex | #2 | 0 | Output includes hub page |

Both agents fail `hub page` assertion universally. Multiple content assertions (`fake data`, `clickable`, `next command handoff`) also fail. Route assertion partially improved for Codex (33.3%) but Claude route still 0%. The prototype skill has complex multi-artifact expectations that may need fixture prompt restructuring.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 37.9% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 16.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 47.7% | 3 | 5 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 33.3%; `workflow-actionability` 58.3%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/prototype-claude-75d7e000/`
- Codex: `tests/benchmarks/runs/prototype-codex-165dcdc0/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/2, 1 blocked) | 0.0% (0/3) | 0% | 0% |
| codex | 0.0% (0/3) | 0.0% (0/3) | 0% | 33.3% |

Claude unblocked (budget increased from smoke to standard). Codex route marginally improved (0% to 33.3%). Pass rates unchanged at 0% for both agents. The prototype skill has the most complex assertion set in this group — hub page, clickable, fake data, and next command handoff all require substantial fixture prompt enrichment.

## Next Route

Recommended next command: `$run`
