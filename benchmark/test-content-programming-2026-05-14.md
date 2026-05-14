# Benchmark Test: content-programming

Date: 2026-05-14

## Command Resolution

`$benchmark-test-skill` was the active workflow. `content-programming` was treated as the benchmark target skill argument, not as a workflow to run directly.

## Eligibility

`content-programming` is known to the repository benchmark harness with `coverage=custom` using `tests/layer4/setups/packs/pack-workflows.setup.ts`.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.7s | 1,181 tests passed across 14 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `content-programming`; benchmark evidence is from the custom layer4 pack workflow setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 96.7% | 25.7s | 25.8s | 25.8s | $0.25 | $0.75 | 0.879 | 0 | `tests/benchmarks/runs/content-programming-claude-9f0c62c8/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 97.5% | 49.0s | 53.9s | 54.4s | $0.25 | $0.75 | 0.861 | 0 | `tests/benchmarks/runs/content-programming-codex-ff03c35c/` |

Total benchmark cost: $1.50.

## Failed Assertions

None. Claude and Codex both passed all evaluated hard assertion runs.

## Output-Quality Rubric

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 96.7% | 0 | 0 | `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |
| Codex | 97.5% | 0 | 0 | `pack-workflow-traits` 75.0%; `pack-skill-context` 100.0%; `pack-fixture-evidence` 100.0%; `pack-practical-risk-or-validation` 100.0%; `pack-next-route` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/content-programming-claude-9f0c62c8/report.json`
- Codex report: `tests/benchmarks/runs/content-programming-codex-ff03c35c/report.json`

## Result

Verification passed and both agents passed 3/3 evaluated hard assertion runs. No infrastructure-blocked runs, threshold failures, or critical quality failures were recorded. Subjective ergonomic review has not been performed in this deterministic benchmark step.

Recommended next skill: `$benchmark-agent-review content-programming`
