# Benchmark Test: research-roadmap

Date: 2026-05-20

Target skill: `research-roadmap`

Command: `$benchmark-test-skill research-roadmap`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `research-roadmap`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 37.1% | 6 | 40.8s | 41.3s | 41.4s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 68.9% | 3 | 40.4s | 55.3s | 56.6s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes priority queue; Output recommends $run |
| claude | #1 | 0 | Output includes priority queue; Output includes next command handoff; Output recommends $run |
| claude | #2 | 0 | Output includes priority queue; Output includes next command handoff; Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents fail the `$run` route assertion. Claude also fails priority queue and next command handoff assertions.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 37.1% | 3 | 6 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 8.3%; `workflow-fixture-facts` 33.3%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 68.9% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 41.7%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/research-roadmap-claude-77445a77/`
- Codex: `tests/benchmarks/runs/research-roadmap-codex-b21f37d4/`

## Next Route

Recommended next command: `$run`
