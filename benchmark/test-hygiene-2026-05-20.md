# Benchmark Test: hygiene

Date: 2026-05-20

Target skill: `hygiene`

Command: `$benchmark-test-skill hygiene`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `hygiene`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 40.2% | 6 | 36.2s | 38.6s | 38.8s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 50.8% | 5 | 33.5s | 39.5s | 40.0s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes convention violations; Output includes missing files; Output recommends $run |
| claude | #1 | 0 | Output includes convention violations; Output includes missing files; Output includes template drift; Output recommends $run |
| claude | #2 | 0 | Output includes convention violations; Output includes missing files; Output recommends $run |
| codex | #0 | 0 | Output includes convention violations; Output includes missing files; Output recommends $run |
| codex | #1 | 0 | Output includes convention violations; Output includes missing files; Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents fail on multiple assertions: convention violations, missing files, and route. Hygiene fixture prompts need more explicit expected-output guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 40.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 41.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 50.8% | 3 | 5 | `workflow-next-route` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 33.3%; `workflow-artifact-reference` 33.3%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/hygiene-claude-7d96d2f7/`
- Codex: `tests/benchmarks/runs/hygiene-codex-2a4064e3/`

## Next Route

Recommended next command: `$run`
