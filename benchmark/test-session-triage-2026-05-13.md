# Benchmark Test: session-triage

Date: 2026-05-13
Run label: fresh rerun at 13:06 ET
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 11.8s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 37.1s | 39.7s | 39.9s | $0.25 | $0.75 | 0.869 | 0 | `tests/benchmarks/runs/session-triage-claude-69ca7dea/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 37.4s | 40.9s | 41.2s | $0.25 | $0.75 | 0.906 | 0 | `tests/benchmarks/runs/session-triage-codex-33b0cc9d/` |

## Failed Assertions

No failed assertions.

## Output Quality

The setup defines an output-quality evaluator. Output-quality scores are rubric scores in addition to the hard assertion pass rate, not statistical confidence measures.

Claude averaged 100.0% across 3 evaluated runs with 0 threshold failures and 0 critical failures. Lowest-scoring criteria:

- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

Codex averaged 100.0% across 3 evaluated runs with 0 threshold failures and 0 critical failures. Lowest-scoring criteria:

- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

## Infrastructure Blocks

No infrastructure-blocked runs.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.869 with 0 outliers. Codex had mean pairwise similarity 0.906 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-69ca7dea/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-33b0cc9d/report.json`

## Verdict

Verify passed and the deterministic benchmark passed for both runners. Claude and Codex each completed 3/3 evaluated hard assertions with 100.0% output-quality scores, no threshold failures, no critical failures, and no infrastructure-blocked runs. Because this benchmark produces deterministic evidence only, subjective ergonomic review remains a separate step if needed.

Recommended next skill: `$benchmark-agent-review session-triage`
