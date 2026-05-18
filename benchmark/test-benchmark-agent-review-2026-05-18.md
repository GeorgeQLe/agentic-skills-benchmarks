# Benchmark Test: benchmark-agent-review (2026-05-18)

## Summary

`benchmark-agent-review` is known to the benchmark harness with custom coverage via `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Verify passed. The both-agent benchmark completed with evaluated runs for both agents. Claude had one infrastructure-blocked run due to agent runner budget, while its evaluated runs passed all hard assertions and output-quality checks. Codex passed all hard assertions but had configured output-quality threshold and critical failures for remediation owner target and validation specificity. Treat this as a benchmark quality failure requiring triage, not as an infrastructure-only block.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.4s | 1,211 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-agent-review`; skipped per harness workflow. |

## Benchmark Results

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Similarity | Outliers | Raw Session Path |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| claude | 100.0% (2/2) | 1 | [34.2%, 100.0%] | 100.0% | 0 | 0 | 44.6s | 46.7s | 46.9s | $0.25 | $0.75 | 0.842 | 0 | `tests/benchmarks/runs/benchmark-agent-review-claude-a06b0e93/` |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 81.1% | 2 | 2 | 69.2s | 72.7s | 73.1s | $0.25 | $0.75 | 0.875 | 0 | `tests/benchmarks/runs/benchmark-agent-review-codex-9c6219ef/` |

## Failed Assertions

None.

## Output Quality Detail

| Agent | Lowest-Scoring Criteria |
|---|---|
| claude | `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0%; `agentic-skills-bench-context` 100.0% |
| codex | `benchmark-agent-review-remediation-owner-target` 33.3%; `benchmark-agent-review-validation-specificity` 33.3%; `pack-workflow-traits` 83.3%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| claude | #1 | agent runner budget exceeded |

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-agent-review-claude-a06b0e93/report.json`
- Codex: `tests/benchmarks/runs/benchmark-agent-review-codex-9c6219ef/report.json`

## Next Route

The benchmark completed with evaluated passing hard assertions, but the configured output-quality evaluator reported Codex threshold and critical failures. The next step is to triage whether the quality failures reflect a skill-contract gap, benchmark rubric issue, or generated-output noncompliance. The single Claude budget block should be reported separately and does not erase the evaluated evidence.

Recommended next skill: `$session-triage benchmark-agent-review benchmark failure`
