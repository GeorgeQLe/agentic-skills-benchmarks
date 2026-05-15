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
| Claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 54.5s | 59.9s | 60.4s | $1.00 | $3.00 | 0.855 | 0 | `tests/benchmarks/runs/analyze-sessions-claude-b5357730/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 61.1s | 64.5s | 64.8s | $1.00 | $3.00 | 0.924 | 0 | `tests/benchmarks/runs/analyze-sessions-codex-8f7e860a/` |

Total benchmark cost: $6.00.

## Failed Assertions

None.

## Output-Quality Rubric

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 92.3% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0%; `workflow-remediation-ready-handoff` 100.0% |
| Codex | 92.3% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0%; `workflow-remediation-ready-handoff` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/analyze-sessions-claude-b5357730/report.json`
- Codex report: `tests/benchmarks/runs/analyze-sessions-codex-8f7e860a/report.json`

## Result

Verification passed, and the deterministic benchmark passed for both agents. Claude passed 3/3 evaluated hard assertion runs, and Codex passed 3/3. No infrastructure-blocked runs were recorded.

Recommended next skill: `$benchmark-agent-review analyze-sessions`
