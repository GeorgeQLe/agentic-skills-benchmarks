# Benchmark Test: benchmark-test-skill

Date: 2026-05-13
Target skill: `benchmark-test-skill`
Active workflow: `$benchmark-test-skill benchmark-test-skill`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.2s | 12 files, 1,312 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `benchmark-test-skill`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0/3 (0.0%) | 0 | 0.0%-56.2% | `Output matches workflow expectation` on runs 0, 1, 2 | 80.0% | 3 | 3 | 18.7s | 21.0s | 21.2s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-92d5d568/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 32.7s | 36.3s | 36.6s | $0.25 | $0.75 | 0.862 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-234ee94c/` |

## Failed Assertions

Claude failed the hard workflow expectation in all three evaluated runs:

- run 0: `Output matches workflow expectation`
- run 1: `Output matches workflow expectation`
- run 2: `Output matches workflow expectation`

Codex had no failed hard assertions.

## Output Quality

The setup defines an output-quality evaluator. Claude averaged 80.0% with 3 threshold failures and 3 critical failures. The lowest-scoring criterion was `metrics-table-structure` at 0.0 average score; all other listed criteria averaged 1.0.

Codex averaged 100.0% with no threshold failures and no critical failures. Its listed criteria all averaged 1.0.

## Infrastructure Blocks

No infrastructure-blocked runs were reported for either agent.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 1.000 with 0 outliers. Codex had mean pairwise similarity 0.862 with 0 outliers.

## Verdict

The deterministic benchmark did not pass overall because Claude failed 0/3 evaluated hard assertions and hit the critical `metrics-table-structure` quality criterion in all runs. Codex passed 3/3 evaluated hard assertions with 100.0% output quality.

Recommended next command: `$session-triage benchmark-test-skill benchmark failure`
