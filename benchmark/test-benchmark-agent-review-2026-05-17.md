# Benchmark Test: benchmark-agent-review (2026-05-17)

## Summary

`benchmark-agent-review` is known to the benchmark harness with custom coverage via `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Verify passed. The both-agent benchmark completed with evaluated runs for both agents and no infrastructure-blocked runs. Both agents passed all hard assertions after the route prompt alignment fix.

Recommended next skill: `$benchmark-agent-review benchmark-agent-review`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.2s | 1,210 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-agent-review`; skipped per harness workflow. |

## Benchmark Results

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Similarity | Outliers | Raw Session Path |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 99.2% | 0 | 0 | 48.2s | 52.7s | 53.1s | $0.25 | $0.75 | 0.832 | 0 | `tests/benchmarks/runs/benchmark-agent-review-claude-3378af86/` |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 99.2% | 0 | 0 | 56.1s | 59.6s | 59.9s | $0.25 | $0.75 | 0.929 | 0 | `tests/benchmarks/runs/benchmark-agent-review-codex-0ceac781/` |

## Failed Assertions

None.

## Output Quality Detail

| Agent | Lowest-Scoring Criteria |
|---|---|
| claude | `pack-workflow-traits` 91.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | `pack-workflow-traits` 91.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocks

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-3378af86/report.json`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-0ceac781/report.json`

## Next Route

The benchmark completed with evaluated passing runs. Subjective output-quality review for these fresh outputs has not yet been performed as a separate step.

Recommended next skill: `$benchmark-agent-review benchmark-agent-review`
