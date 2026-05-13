# Benchmark Test: session-triage

Date: 2026-05-13
Run label: fresh rerun at 10:40 ET
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.6s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 93.8% | 0 | 1 | 44.1s | 44.8s | 44.9s | $0.25 | $0.75 | 0.845 | 0 | `tests/benchmarks/runs/session-triage-claude-e5f0772b/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 95.8% | 0 | 1 | 64.1s | 72.5s | 73.3s | $0.25 | $0.75 | 0.879 | 0 | `tests/benchmarks/runs/session-triage-codex-374ad6f0/` |

## Failed Assertions

No failed hard assertions.

## Output Quality

The setup defines an output-quality evaluator. Output-quality scores are rubric scores in addition to the hard assertion pass rate, not statistical confidence measures.

Claude averaged 93.8% with 0 threshold failures and 1 critical failure. Lowest-scoring criteria:

- `evidence-linked`: 66.7%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

Codex averaged 95.8% with 0 threshold failures and 1 critical failure. Lowest-scoring criteria:

- `no-over-remediation-route`: 66.7%
- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%

## Infrastructure Blocks

No infrastructure-blocked runs.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.845 with 0 outliers. Codex had mean pairwise similarity 0.879 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-e5f0772b/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-374ad6f0/report.json`

## Prior Run Comparison

| Run | Date | Agent | Pass rate | Quality | Notes |
| --- | --- | --- | ---: | ---: | --- |
| `49cd4515` | 2026-05-13 | Claude | 0/2 (0.0%) | 92.9% | 1 infra-blocked, 2 failed next-route assertion |
| `2717976e` | 2026-05-13 | Codex | 2/3 (66.7%) | 97.6% | 1 failed next-route assertion |
| `790af5f0` | 2026-05-13 | Claude | 0/2 (0.0%) | 82.1% | 1 infra-blocked, 2 failed next-route assertion |
| `1bc38d04` | 2026-05-13 | Codex | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |
| `4cfa1e99` | 2026-05-13 | Claude | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |
| `f8e827fb` | 2026-05-13 | Codex | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |
| `e5f0772b` | 2026-05-13 | Claude | 3/3 (100.0%) | 93.8% | Fresh rerun after over-remediation rubric fix; 1 critical quality failure |
| `374ad6f0` | 2026-05-13 | Codex | 3/3 (100.0%) | 95.8% | Fresh rerun after over-remediation rubric fix; 1 critical quality failure |

## Verdict

Pass on hard assertions. The fresh benchmark rerun validates that `session-triage` still passes all deterministic hard assertions for both runners after the over-remediation rubric fix: Claude and Codex each completed 3 evaluated runs with no infrastructure-blocked runs. The configured output-quality rubric still surfaced one critical failure per runner, so subjective output-quality review and remediation planning remain useful.

Recommended next skill: `$benchmark-agent-review session-triage`
