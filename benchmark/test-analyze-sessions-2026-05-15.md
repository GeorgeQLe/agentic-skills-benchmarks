# Benchmark Test: analyze-sessions

Date: 2026-05-15

## Command Resolution

`$benchmark-test-skill` was the active workflow. `analyze-sessions` was treated as the benchmark target skill argument, not as a workflow to run directly.

## Eligibility

`analyze-sessions` is known to the repository benchmark harness with `coverage=custom` using `tests/layer4/setups/tier23-global-workflows.setup.ts`.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.4s | 1,198 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `analyze-sessions`; benchmark evidence is from the custom layer4 global workflow setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 50.0s | 52.2s | 52.4s | $1.00 | $3.00 | 0.845 | 0 | `tests/benchmarks/runs/analyze-sessions-claude-fa3b696a/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 51.3s | 59.0s | 59.7s | $1.00 | $3.00 | 0.900 | 0 | `tests/benchmarks/runs/analyze-sessions-codex-e68803b1/` |

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

- Claude report: `tests/benchmarks/runs/analyze-sessions-claude-fa3b696a/report.json`
- Codex report: `tests/benchmarks/runs/analyze-sessions-codex-e68803b1/report.json`

## Result

Verification passed, and the deterministic hard assertions passed for both agents. Claude passed 3/3 evaluated hard assertion runs, and Codex passed 3/3. No infrastructure-blocked runs were recorded. Both agents scored 92.3% on the additional deterministic output-quality rubric with no threshold or critical failures. This remains deterministic harness evidence; subjective output-quality review should be performed as a separate step for the fresh generated artifacts.

Recommended next skill: `$benchmark-agent-review analyze-sessions`
