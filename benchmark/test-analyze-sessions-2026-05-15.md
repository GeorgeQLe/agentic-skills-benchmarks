# Benchmark Test: analyze-sessions

Date: 2026-05-15

## Command Resolution

`$benchmark-test-skill` was the active workflow. `analyze-sessions` was treated as the benchmark target skill argument, not as a workflow to run directly.

## Eligibility

`analyze-sessions` is known to the repository benchmark harness with `coverage=custom` using `tests/layer4/setups/tier23-global-workflows.setup.ts`.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.8s | 1,195 tests passed across 15 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `analyze-sessions`; benchmark evidence is from the custom layer4 global workflow setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 71.2% | 34.1s | 35.1s | 35.2s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/analyze-sessions-claude-6b8dbd1e/` |
| Codex | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 80.3% | 80.2s | 307.9s | 328.2s | $0.25 | $0.75 | 0.873 | 0 | `tests/benchmarks/runs/analyze-sessions-codex-afaf2f22/` |

Total benchmark cost: $1.50.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| Claude | #0 | 0 | Output includes next command handoff; Output recommends `$targeted-skill-builder` |
| Claude | #1 | 0 | Output includes next command handoff; Output recommends `$targeted-skill-builder` |
| Claude | #2 | 0 | Output includes next command handoff; Output recommends `$targeted-skill-builder` |
| Codex | #1 | 0 | `session-analysis.md` created in project root |

## Output-Quality Rubric

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 71.2% | 3 | 3 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 83.3%; `workflow-fixture-facts` 100.0%; `workflow-domain-specificity` 100.0% |
| Codex | 80.3% | 1 | 2 | `workflow-artifact-reference` 33.3%; `workflow-next-route` 66.7%; `workflow-domain-specificity` 66.7%; `workflow-actionability` 83.3%; `workflow-fixture-facts` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/analyze-sessions-claude-6b8dbd1e/report.json`
- Codex report: `tests/benchmarks/runs/analyze-sessions-codex-afaf2f22/report.json`

## Result

Verification passed, but the deterministic benchmark failed. Claude passed 0/3 evaluated hard assertion runs, and Codex passed 2/3. No infrastructure-blocked runs were recorded, so this should be triaged as a benchmark or skill-output failure before subjective review.

Recommended next skill: `$session-triage analyze-sessions benchmark failure`
