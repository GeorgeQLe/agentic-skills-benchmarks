# Benchmark Test: benchmark-agent-review

Date: 2026-05-20

Target skill: `benchmark-agent-review`

Command: `$benchmark-test-skill benchmark-agent-review`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.4s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `benchmark-agent-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 98.9% | 0 | 48.6s | 49.4s | 49.5s | $1.00 | $3.00 | 0.884 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 55.6s | 64.4s | 65.2s | $1.00 | $3.00 | 0.857 | 0 |

## Failed Assertions

None.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 98.9% | 0 | 0 | `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0%; `agentic-skills-bench-context` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-d82f2fd2/`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-3fd8c7f9/`

## Next Route

Recommended next command: `$run`
