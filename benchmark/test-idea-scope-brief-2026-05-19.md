# Benchmark Test: idea-scope-brief

Date: 2026-05-19

Target skill: `idea-scope-brief`

Command: `$benchmark-test-skill idea-scope-brief`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | Static harness-contract gate passed. Initial run showed transient 939.6s timeout; rerun passed in 3.2s. |
| layer2 | SKIP | -- | No layer2 tests matched `idea-scope-brief`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | -- | -- | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 66.7% | 3 | 42.5s | 51.8s | 52.6s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output recommends $spec-interview |
| codex | #1 | 0 | Output recommends $spec-interview |
| codex | #2 | 0 | Output recommends $spec-interview |

All 3 Claude runs were infrastructure-blocked by agent runner timeout at smoke budget ($0.25). Codex runs all fail the `$spec-interview` route assertion — the fixture prompt likely needs explicit route guidance.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | -- | -- | -- | All runs infrastructure-blocked. |
| codex | 3 | 66.7% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner timeout |
| claude | #1 | agent runner timeout |
| claude | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/idea-scope-brief-claude-b341068b/`
- Codex: `tests/benchmarks/runs/idea-scope-brief-codex-3c296f87/`

## Next Route

Recommended next command: `$run`
