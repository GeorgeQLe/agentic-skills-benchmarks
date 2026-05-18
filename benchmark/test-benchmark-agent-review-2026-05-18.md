# Benchmark Test: benchmark-agent-review (2026-05-18)

## Summary

`benchmark-agent-review` is known to the benchmark harness with custom coverage via `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Verify passed. The both-agent benchmark completed with evaluated runs for both agents and no infrastructure-blocked runs. Both agents passed all hard assertions. The Claude lane had configured output-quality threshold and critical failures for remediation owner target and validation specificity. Treat this as a benchmark quality failure requiring triage, not as an infrastructure block.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.7s | 1,210 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-agent-review`; skipped per harness workflow. |

## Benchmark Results

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Similarity | Outliers | Raw Session Path |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 81.7% | 2 | 2 | 45.4s | 55.5s | 56.4s | $0.25 | $0.75 | 0.867 | 0 | `tests/benchmarks/runs/benchmark-agent-review-claude-f72e03c7/` |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 98.9% | 0 | 0 | 59.1s | 68.8s | 69.7s | $0.25 | $0.75 | 0.864 | 0 | `tests/benchmarks/runs/benchmark-agent-review-codex-089d4f4f/` |

## Failed Assertions

None.

## Output Quality Detail

| Agent | Lowest-Scoring Criteria |
|---|---|
| claude | `benchmark-agent-review-remediation-owner-target` 33.3%; `benchmark-agent-review-validation-specificity` 33.3%; `pack-workflow-traits` 91.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0% |
| codex | `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure Blocks

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-f72e03c7/report.json`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-089d4f4f/report.json`

## Next Route

The benchmark completed with evaluated passing hard assertions, but the configured output-quality evaluator reported Claude threshold and critical failures. The next step is to triage whether the quality failures reflect a skill-contract gap, benchmark rubric issue, or generated-output noncompliance.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`
