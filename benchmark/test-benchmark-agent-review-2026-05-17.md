# Benchmark Test: benchmark-agent-review (2026-05-17)

## Summary

`benchmark-agent-review` is known to the benchmark harness with custom coverage via `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Verify passed. The both-agent benchmark completed with evaluated runs for both agents and no infrastructure-blocked runs. Hard assertions failed for both agents because at least one output did not recommend `$targeted-skill-builder`.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.4s | 1,206 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-agent-review`; skipped per harness workflow. |

## Benchmark Results

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Similarity | Outliers | Raw Session Path |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 89.2% | 0 | 0 | 33.4s | 34.2s | 34.3s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/benchmark-agent-review-claude-a4f7218d/` |
| codex | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 100.0% | 0 | 0 | 76.5s | 84.9s | 85.7s | $0.25 | $0.75 | 0.919 | 0 | `tests/benchmarks/runs/benchmark-agent-review-codex-f6a6014a/` |

## Failed Assertions

| Agent | Run | Failed Assertions |
|---|---:|---|
| claude | 0 | Output recommends `$targeted-skill-builder` |
| claude | 1 | Output recommends `$targeted-skill-builder` |
| claude | 2 | Output recommends `$targeted-skill-builder` |
| codex | 2 | Output recommends `$targeted-skill-builder` |

## Output Quality Detail

| Agent | Lowest-Scoring Criteria |
|---|---|
| claude | `pack-next-route` 0.0%; `pack-workflow-traits` 91.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |
| codex | `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0%; `agentic-skills-bench-context` 100.0% |

## Infrastructure Blocks

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-a4f7218d/report.json`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-f6a6014a/report.json`

## Next Route

The benchmark completed with evaluated runs and deterministic hard-assertion failures, so this should be triaged before subjective output review or shipping.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`
