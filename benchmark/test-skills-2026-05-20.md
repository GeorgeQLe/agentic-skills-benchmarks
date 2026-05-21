# Benchmark Test: skills

Date: 2026-05-20

Target skill: `skills`

Command: `$benchmark-test-skill skills`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | FAIL | 2.7s | Pre-existing `quiz-me` coverage gap (unrelated to `skills`). |
| layer2 | SKIP | -- | No layer2 tests matched `skills`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 65.9% | 3 | 36.6s | 38.2s | 38.3s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 33.3% (1/3) | 0 | 6.1%-79.2% | 72.0% | 2 | 52.1s | 69.5s | 71.1s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes next command handoff; Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output includes next command handoff; Output recommends $run |
| codex | #0 | 0 | Output includes next command handoff |
| codex | #1 | 0 | Output includes next command handoff |

Codex partially passes (1/3 pass rate, 33.3%). Claude fails on route assertion. Both agents have next command handoff assertion failures.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 65.9% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 66.7%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 72.0% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-next-route` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/skills-claude-045f209d/`
- Codex: `tests/benchmarks/runs/skills-codex-10817127/`

## Next Route

Recommended next command: `$run`
