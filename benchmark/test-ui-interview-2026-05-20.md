# Benchmark Test: ui-interview

Date: 2026-05-20

Target skill: `ui-interview`

Command: `$benchmark-test-skill ui-interview`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `ui-interview`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 71.1% | 5 | 117.7s | 124.1s | 124.7s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 83.8% | 4 | 84.0s | 97.2s | 98.4s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes controls; Output names calibration or promotion evidence before infrastructure; Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |
| codex | #0 | 0 | Output names calibration or promotion evidence before infrastructure; Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

Both agents fail on route assertion. Additional domain-specific assertion failures on calibration/promotion evidence.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 71.1% | 1 | 5 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-output-names-calibration-or-promotion-evidence-before-infrastructure` 66.7%; `workflow-actionability` 75.0% |
| codex | 3 | 83.8% | 1 | 4 | `workflow-next-route` 0.0%; `workflow-output-names-calibration-or-promotion-evidence-before-infrastructure` 66.7%; `workflow-actionability` 91.7%; `workflow-fixture-facts` 100.0%; `workflow-output-defines-fake-or-fixture-data-for-the-prototype` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/ui-interview-claude-7a0ec189/`
- Codex: `tests/benchmarks/runs/ui-interview-codex-94bba050/`

## Next Route

Recommended next command: `$run`
