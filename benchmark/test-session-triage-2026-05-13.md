# Benchmark Test: session-triage

Date: 2026-05-13
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.8s | 12 files, 1,350 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 45.9s | 53.8s | 54.5s | $0.25 | $0.75 | 0.903 | 0 | `tests/benchmarks/runs/session-triage-claude-4cfa1e99/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 55.5s | 59.6s | 59.9s | $0.25 | $0.75 | 0.861 | 0 | `tests/benchmarks/runs/session-triage-codex-f8e827fb/` |

## Failed Assertions

No failed hard assertions.

## Output Quality

The setup defines an output-quality evaluator. Both agents averaged 100.0% with no threshold failures and no critical failures.

Lowest-scoring criteria were all fully satisfied for both agents:

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

Claude had mean pairwise similarity 0.903 with 0 outliers. Codex had mean pairwise similarity 0.861 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-4cfa1e99/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-f8e827fb/report.json`

## Prior Run Comparison

| Run | Date | Agent | Pass rate | Quality | Notes |
| --- | --- | --- | ---: | ---: | --- |
| `49cd4515` | 2026-05-13 | Claude | 0/2 (0.0%) | 92.9% | 1 infra-blocked, 2 failed next-route assertion |
| `2717976e` | 2026-05-13 | Codex | 2/3 (66.7%) | 97.6% | 1 failed next-route assertion |
| `790af5f0` | 2026-05-13 | Claude | 0/2 (0.0%) | 82.1% | 1 infra-blocked, 2 failed next-route assertion |
| `1bc38d04` | 2026-05-13 | Codex | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |
| `4cfa1e99` | 2026-05-13 | Claude | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |
| `f8e827fb` | 2026-05-13 | Codex | 3/3 (100.0%) | 100.0% | Clean pass after fixture routing update |

## Verdict

Pass. The fresh benchmark rerun validates the `session-triage` fixture routing fix for both runners: Claude and Codex each completed 3 evaluated runs, passed every hard assertion, had no infrastructure-blocked runs, and scored 100.0% on the configured output-quality rubric.

Recommended next skill: `$benchmark-agent-review session-triage`
