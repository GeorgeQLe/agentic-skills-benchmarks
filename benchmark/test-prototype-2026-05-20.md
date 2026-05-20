# Benchmark Test: prototype

Date: 2026-05-20

Target skill: `prototype`

Command: `$benchmark-test-skill prototype`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `prototype`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 36.4% | 6 | 40.6s | 46.4s | 46.9s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/2) | 1 | 0.0%-65.8% | 39.8% | 4 | 125.6s | 127.2s | 127.3s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes hub page; Output includes clickable; Output includes fake data; Output includes next command handoff; Output recommends $uat --variant-evaluation |
| claude | #1 | 0 | Output includes hub page; Output includes next command handoff; Output recommends $uat --variant-evaluation |
| claude | #2 | 0 | Output includes hub page; Output includes next command handoff; Output recommends $uat --variant-evaluation |
| codex | #1 | 0 | Output includes hub page; Output includes clickable; Output includes fake data; Output includes next command handoff; Output recommends $uat --variant-evaluation |
| codex | #2 | 0 | Output includes hub page; Output includes clickable; Output includes fake data; Output includes next command handoff; Output recommends $uat --variant-evaluation |

Both agents fail on all prototype-specific assertions (hub page, clickable, fake data, handoff, route). This is a newly added skill — fixture prompts need substantial enrichment.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 36.4% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 0.0%; `workflow-domain-specificity` 100.0% |
| codex | 2 | 39.8% | 2 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 37.5%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #0 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/prototype-claude-c56c5c73/`
- Codex: `tests/benchmarks/runs/prototype-codex-c084ed0c/`

## Next Route

Recommended next command: `$run`
