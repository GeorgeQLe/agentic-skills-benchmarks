# Benchmark Test: analyze-sessions

Date: 2026-05-15

## Command Resolution

`$benchmark-test-skill` was the active workflow. `analyze-sessions` was treated as the benchmark target skill argument, not as a workflow to run directly.

## Eligibility

`analyze-sessions` is known to the repository benchmark harness with `coverage=custom` using `tests/layer4/setups/tier23-global-workflows.setup.ts`.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | 1,198 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `analyze-sessions`; benchmark evidence is from the custom layer4 global workflow setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 82.1% | 55.3s | 55.5s | 55.5s | $1.00 | $3.00 | 0.845 | 0 | `tests/benchmarks/runs/analyze-sessions-claude-2fbe5bb3/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 49.5s | 62.4s | 63.6s | $1.00 | $3.00 | 0.906 | 0 | `tests/benchmarks/runs/analyze-sessions-codex-fbd564cc/` |

Total benchmark cost: $6.00.

## Failed Assertions

None.

## Output-Quality Rubric

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 82.1% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-remediation-ready-handoff` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| Codex | 92.3% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0%; `workflow-remediation-ready-handoff` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/analyze-sessions-claude-2fbe5bb3/report.json`
- Codex report: `tests/benchmarks/runs/analyze-sessions-codex-fbd564cc/report.json`

## Result

Verification passed, and the deterministic hard assertions passed for both agents. Claude passed 3/3 evaluated hard assertion runs, and Codex passed 3/3. No infrastructure-blocked runs were recorded. Claude had deterministic output-quality threshold and critical failures in the additional rubric, primarily around `workflow-artifact-reference` and `workflow-remediation-ready-handoff`; those quality failures should be reviewed separately from the hard assertion pass rate.

Recommended next skill: `$session-triage analyze-sessions benchmark failure`
