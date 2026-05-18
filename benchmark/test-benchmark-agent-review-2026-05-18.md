# Benchmark Test: benchmark-agent-review (2026-05-18)

## Summary

`benchmark-agent-review` is known to the benchmark harness with custom coverage via `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Verify passed. The both-agent benchmark completed with evaluated runs for both agents and no infrastructure-blocked runs. Both agents passed all hard assertions, but the Codex lane had configured output-quality threshold and critical failures for remediation specificity. Treat this as a benchmark quality failure requiring triage, not as an infrastructure block.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.5s | 1,210 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-agent-review`; skipped per harness workflow. |

## Benchmark Results

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Similarity | Outliers | Raw Session Path |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 86.7% | 0 | 0 | 51.4s | 51.5s | 51.5s | $0.25 | $0.75 | 0.863 | 0 | `tests/benchmarks/runs/benchmark-agent-review-claude-29400696/` |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 82.2% | 1 | 1 | 48.1s | 52.1s | 52.4s | $0.25 | $0.75 | 0.898 | 0 | `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/` |

## Failed Assertions

None.

## Output Quality Detail

| Agent | Lowest-Scoring Criteria |
|---|---|
| claude | `benchmark-agent-review-remediation-owner-target` 0.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| codex | `benchmark-agent-review-remediation-owner-target` 0.0%; `benchmark-agent-review-validation-specificity` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0% |

## Infrastructure Blocks

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-29400696/report.json`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/report.json`

## Next Route

The benchmark completed with evaluated passing hard assertions, but the configured output-quality evaluator reported Codex threshold and critical failures. The next step is to triage whether the quality failures reflect a skill-contract gap, benchmark rubric issue, or generated-output noncompliance.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`
