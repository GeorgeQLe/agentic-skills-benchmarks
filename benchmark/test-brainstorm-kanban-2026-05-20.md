# Benchmark Test: brainstorm-kanban

Date: 2026-05-20

Target skill: `brainstorm-kanban`

Command: `$benchmark-test-skill brainstorm-kanban`

Coverage: custom, `tests/layer4/setups/packs/pack-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `brainstorm-kanban`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 90.8% | 1 | 29.7s | 33.6s | 33.9s | $1.00 | $3.00 | 0.822 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 81.7% | 2 | 48.5s | 51.9s | 52.2s | $1.00 | $3.00 | 0.927 | 0 |

## Failed Assertions

None — all hard assertions passed.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 90.8% | 0 | 1 | `pack-fixture-evidence` 66.7%; `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | 3 | 81.7% | 0 | 2 | `pack-fixture-evidence` 33.3%; `pack-workflow-traits` 50.0%; `pack-skill-context` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocked Runs

None.

## Raw Sessions

- Claude: `tests/benchmarks/runs/brainstorm-kanban-claude-664c7766/`
- Codex: `tests/benchmarks/runs/brainstorm-kanban-codex-9fc01465/`

## Next Route

Recommended next command: `$run`
