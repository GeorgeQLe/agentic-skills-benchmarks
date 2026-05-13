# Benchmark Test: session-triage

Date: 2026-05-13
Run label: fresh rerun at 12:07 ET
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.9s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 29.7s | 31.8s | 31.9s | $0.25 | $0.75 | 0.884 | 0 | `tests/benchmarks/runs/session-triage-claude-865e8407/` |
| Codex | 2/3 (66.7%) | 0 | 20.8%-93.9% | Run #1: `session-triage-report.md created in project root` | 82.5% | 1 | 2 | 278.3s | 409.2s | 420.8s | $0.25 | $0.75 | 0.600 | 0 | `tests/benchmarks/runs/session-triage-codex-d417810e/` |

## Failed Assertions

| Agent | Run | Failed assertion |
| --- | ---: | --- |
| Codex | #1 | `session-triage-report.md created in project root` |

## Output Quality

The setup defines an output-quality evaluator. Output-quality scores are rubric scores in addition to the hard assertion pass rate, not statistical confidence measures.

Claude averaged 100.0% across 3 evaluated runs with 0 threshold failures and 0 critical failures. Lowest-scoring criteria:

- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

Codex averaged 82.5% across 3 evaluated runs with 1 threshold failure and 2 critical failures. Lowest-scoring criteria:

- `scope-control`: 66.7%
- `no-fabricated-facts`: 66.7%
- `no-over-remediation-route`: 66.7%
- `evidence-linked`: 100.0%
- `file-reference`: 100.0%

## Infrastructure Blocks

No infrastructure-blocked runs.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.884 with 0 outliers. Codex had mean pairwise similarity 0.600 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-865e8407/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-d417810e/report.json`

## Verdict

Verify passed, but the deterministic benchmark did not fully pass. Claude completed 3/3 evaluated hard assertions with 100.0% output quality and no infrastructure blocks. Codex completed all runs without infrastructure blocks but passed only 2/3 hard assertions because run #1 did not create `session-triage-report.md` in the project root. Codex also had 1 quality threshold failure and 2 critical quality failures around scope control, fabricated-fact control, and over-remediation routing. This should be triaged as a benchmark failure rather than routed directly to subjective agent review.

Recommended next command: `$session-triage session-triage benchmark failure`
