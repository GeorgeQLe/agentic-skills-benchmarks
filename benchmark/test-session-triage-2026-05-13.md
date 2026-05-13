# Benchmark Test: session-triage

Date: 2026-05-13
Target skill: `session-triage`
Active workflow: `$benchmark-test-skill session-triage`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.8s | 12 files, 1,349 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `session-triage`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0/2 (0.0%) | 1 | 0.0%-65.8% | Output recommends $targeted-skill-builder | 82.1% | 1 | 1 | 52.3s | 53.1s | 53.2s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/session-triage-claude-790af5f0/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 58.7s | 60.4s | 60.6s | $0.25 | $0.75 | 0.874 | 0 | `tests/benchmarks/runs/session-triage-codex-1bc38d04/` |

## Failed Assertions

Claude failed the hard assertion "Output recommends $targeted-skill-builder" on both evaluated runs (#0 and #2). Run #1 was infrastructure-blocked (agent runner budget exceeded).

Codex had no failed hard assertions.

## Output Quality

The setup defines an output-quality evaluator. Claude averaged 82.1% with 1 threshold failure and 1 critical failure. Codex averaged 100.0% with no threshold or critical failures.

Claude per-criterion averages:

- `actionable-next-route`: 0.0%
- `evidence-linked`: 50.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%

Codex per-criterion averages:

- `evidence-linked`: 100.0%
- `file-reference`: 100.0%
- `scope-control`: 100.0%
- `incident-triage-specificity`: 100.0%
- `validation-specificity`: 100.0%

## Infrastructure Blocks

Claude had 1 infrastructure-blocked run (#1): agent runner budget exceeded.

Codex had no infrastructure-blocked runs.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 1.000 with 0 outliers. Codex had mean pairwise similarity 0.874 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/session-triage-claude-790af5f0/report.json`
- Codex: `tests/benchmarks/runs/session-triage-codex-1bc38d04/report.json`

## Prior Run Comparison

| Run | Date | Agent | Pass rate | Quality | Notes |
| --- | --- | --- | ---: | ---: | --- |
| `49cd4515` | 2026-05-13 | Claude | 0/2 (0.0%) | 92.9% | 1 infra-blocked, 2 failed next-route assertion |
| `2717976e` | 2026-05-13 | Codex | 2/3 (66.7%) | 97.6% | 1 failed next-route assertion |
| `790af5f0` | 2026-05-13 | Claude | 0/2 (0.0%) | 82.1% | 1 infra-blocked, 2 failed next-route assertion |
| `1bc38d04` | 2026-05-13 | Codex | 3/3 (100.0%) | 100.0% | Clean pass |

## Verdict

Mixed results. Codex improved from 66.7% to 100.0% pass rate and 100.0% output quality — a clean pass with no infrastructure blocks. Claude remains at 0% evaluated pass rate across both benchmark sessions, consistently failing the "Output recommends $targeted-skill-builder" hard assertion. The `actionable-next-route` criterion scored 0.0% for Claude, confirming the triage output did not route to the expected next skill.

Recommended next skill: `$session-triage session-triage benchmark failure`
