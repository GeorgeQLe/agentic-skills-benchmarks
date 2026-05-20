# Benchmark Test: bootstrap-repo

Date: 2026-05-19

Target skill: `bootstrap-repo`

Command: `$benchmark-test-skill bootstrap-repo`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `bootstrap-repo`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 40.9% | 6 | 35.6s | 39.1s | 39.5s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 43.2% | 6 | 34.0s | 38.1s | 38.4s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes project purpose; Output includes verification; Output recommends $run |
| claude | #1 | 0 | Output includes project purpose; Output includes verification; Output recommends $run |
| claude | #2 | 0 | Output includes project purpose; Output includes verification; Output recommends $run |
| codex | #0 | 0 | Output includes project purpose; Output recommends $run |
| codex | #1 | 0 | Output includes project purpose; Output recommends $run |
| codex | #2 | 0 | Output includes project purpose; Output includes Next command; Output includes next command handoff; Output recommends $run |

All runs completed without infrastructure blocks. Both agents consistently fail on `project purpose` and `$run` route assertions, suggesting the fixture prompt or assertion expectations need tightening.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 40.9% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 50.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 43.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-next-route` 0.0%; `workflow-artifact-reference` 33.3%; `workflow-actionability` 41.7%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/bootstrap-repo-claude-69d4f8a8/`
- Codex: `tests/benchmarks/runs/bootstrap-repo-codex-6b2ca661/`

## Next Route

Recommended next command: `$run`
