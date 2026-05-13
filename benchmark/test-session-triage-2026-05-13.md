# Benchmark Test: session-triage

Date: 2026-05-13
Run label: latest rerun at 11:06 ET
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.5s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 2/2 (100.0%) | 1 | 34.2%-100.0% | None | 78.1% | 1 | 3 | 40.7s | 42.7s | 42.9s | $0.25 | $0.75 | 0.846 | 0 | `tests/benchmarks/runs/session-triage-claude-13f4872c/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 71.0s | 119.8s | 124.2s | $0.25 | $0.75 | 0.846 | 0 | `tests/benchmarks/runs/session-triage-codex-7cdefe10/` |

## Failed Assertions

No failed hard assertions.

## Output Quality

The setup defines an output-quality evaluator. Output-quality scores are rubric scores in addition to the hard assertion pass rate, not statistical confidence measures.

Claude averaged 78.1% across 2 evaluated runs with 1 threshold failure and 3 critical failures. Lowest-scoring criteria:

- `no-over-remediation-route`: 0.0%
- `evidence-linked`: 50.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%

Codex averaged 100.0% across 3 evaluated runs with 0 threshold failures and 0 critical failures. Lowest-scoring criteria:

- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | #2 | agent runner budget exceeded |

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.846 with 0 outliers. Codex had mean pairwise similarity 0.846 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-13f4872c/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-7cdefe10/report.json`

## Verdict

Pass on deterministic hard assertions for all evaluated runs. Claude had one infrastructure-blocked run from runner budget exhaustion and its configured output-quality rubric found threshold and critical failures, especially around over-remediation routing and evidence linkage. Codex completed all three evaluated runs with clean hard assertions and a 100.0% quality score. Because subjective output-quality judgment and remediation planning are separate from this deterministic benchmark, the next step remains an agent review.

Recommended next skill: `$benchmark-agent-review session-triage`
