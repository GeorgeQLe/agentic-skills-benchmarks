# Benchmark Test: session-triage

Date: 2026-05-13
Run label: current rerun at 11:36 ET
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.4s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 68.4% | 3 | 4 | 41.1s | 42.6s | 42.7s | $0.25 | $0.75 | 0.846 | 0 | `tests/benchmarks/runs/session-triage-claude-7a8b6de9/` |
| Codex | 2/3 (66.7%) | 0 | 20.8%-93.9% | Run #0: `session-triage-report.md created in project root` | 73.7% | 2 | 3 | 54.3s | 167.5s | 177.5s | $0.25 | $0.75 | 0.871 | 0 | `tests/benchmarks/runs/session-triage-codex-fbec4404/` |

## Failed Assertions

| Agent | Run | Failed assertion |
| --- | ---: | --- |
| Codex | #0 | `session-triage-report.md created in project root` |

## Output Quality

The setup defines an output-quality evaluator. Output-quality scores are rubric scores in addition to the hard assertion pass rate, not statistical confidence measures.

Claude averaged 68.4% across 3 evaluated runs with 3 threshold failures and 4 critical failures. Lowest-scoring criteria:

- `no-over-remediation-route`: 0.0%
- `evidence-linked`: 66.7%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%

Codex averaged 73.7% across 3 evaluated runs with 2 threshold failures and 3 critical failures. Lowest-scoring criteria:

- `no-over-remediation-route`: 33.3%
- `scope-control`: 66.7%
- `no-fabricated-facts`: 66.7%
- `evidence-linked`: 100.0%
- `file-reference`: 100.0%

## Infrastructure Blocks

No infrastructure-blocked runs.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.846 with 0 outliers. Codex had mean pairwise similarity 0.871 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-7a8b6de9/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-fbec4404/report.json`

## Verdict

Verify passed, but the deterministic benchmark did not fully pass. Claude completed 3/3 evaluated hard assertions, but its configured output-quality rubric found threshold and critical failures, especially around over-remediation routing. Codex completed all runs without infrastructure blocks but passed only 2/3 hard assertions because run #0 did not create `session-triage-report.md` in the project root; its rubric also found over-remediation, scope-control, and fabricated-fact issues. This should be triaged as a benchmark failure rather than routed directly to subjective agent review.

Recommended next command: `$session-triage session-triage benchmark failure`
