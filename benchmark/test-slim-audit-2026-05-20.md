# Benchmark Test: slim-audit

Date: 2026-05-20

Target skill: `slim-audit`

Command: `$benchmark-test-skill slim-audit`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `slim-audit`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 43.2% | 6 | 38.8s | 41.1s | 41.3s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 52.3% | 5 | 37.5s | 40.0s | 40.2s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes simplification opportunities; Output includes preserved behavior; Output recommends $run |
| claude | #1 | 0 | Output includes simplification opportunities; Output includes preserved behavior; Output recommends $run |
| claude | #2 | 0 | Output includes simplification opportunities; Output recommends $run |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output includes simplification opportunities; Output recommends $run |
| codex | #2 | 0 | Output includes simplification opportunities; Output recommends $run |

Both agents fail on route assertion and domain-specific assertions (simplification opportunities, preserved behavior).

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 43.2% | 3 | 6 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 75.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 52.3% | 3 | 5 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-actionability` 83.3%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/slim-audit-claude-16e34ce3/`
- Codex: `tests/benchmarks/runs/slim-audit-codex-877456eb/`

## Next Route

Recommended next command: `$run`
