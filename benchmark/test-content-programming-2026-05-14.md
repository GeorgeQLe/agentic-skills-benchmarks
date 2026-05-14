# Benchmark Test: content-programming

Date: 2026-05-14

## Command Resolution

`$benchmark-test-skill` was the active workflow. `content-programming` was treated as the benchmark target skill argument, not as a workflow to run directly.

## Eligibility

`content-programming` is known to the repository benchmark harness with `coverage=custom` using `tests/layer4/setups/packs/pack-workflows.setup.ts`.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.5s | 1,179 tests passed across 14 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `content-programming`; benchmark evidence is from the custom layer4 pack workflow setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 85.8% | 29.9s | 35.4s | 35.9s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/content-programming-claude-20ea1edd/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 86.7% | 51.2s | 53.9s | 54.2s | $0.25 | $0.75 | 0.844 | 0 | `tests/benchmarks/runs/content-programming-codex-cb044e72/` |

Total benchmark cost: $1.50.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| Claude | 0 | 0 | Output includes next command handoff |
| Claude | 1 | 0 | Output includes next command handoff |
| Claude | 2 | 0 | Output includes next command handoff |

Codex had no failed hard assertions.

## Output-Quality Rubric

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 85.8% | 0 | 0 | `pack-next-route` 0.0%; `pack-workflow-traits` 58.3%; `pack-skill-context` 100.0% |
| Codex | 86.7% | 0 | 0 | `pack-next-route` 0.0%; `pack-workflow-traits` 66.7%; `pack-skill-context` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/content-programming-claude-20ea1edd/report.json`
- Codex report: `tests/benchmarks/runs/content-programming-codex-cb044e72/report.json`

## Result

Verification passed, but the benchmark failed because Claude passed 0/3 evaluated hard assertion runs. The failing assertion was the missing next-command handoff.

Recommended next skill: `$session-triage content-programming benchmark failure`
