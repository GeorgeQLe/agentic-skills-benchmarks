# Benchmark Test: benchmark-test-skill

Date: 2026-05-13
Target skill: `benchmark-test-skill`
Active workflow: `$benchmark-test-skill benchmark-test-skill`
Coverage: `custom`
Setup: `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.5s | 12 files, 1,312 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `benchmark-test-skill`; target-specific layer2 verification skipped |

## Benchmark Metrics

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions | Output-quality score | Threshold failures | Critical failures | Latency p50 | Latency p95 | Latency p99 | Cost per run | Total cost | Mean similarity | Outliers | Raw session path |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 17.8s | 21.0s | 21.3s | $0.25 | $0.75 | 0.880 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-46f32ef6/` |
| Codex | 3/3 (100.0%) | 0 | 43.8%-100.0% | None | 100.0% | 0 | 0 | 30.5s | 33.2s | 33.4s | $0.25 | $0.75 | 0.812 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-e4c6aef6/` |

## Failed Assertions

No failed hard assertions were reported for either agent.

## Output Quality

The setup defines an output-quality evaluator. Claude and Codex both averaged 100.0% with no threshold failures and no critical failures.

Lowest-scoring criteria were all at 100.0% for both agents:

- `evidence-linked`
- `file-reference`
- `metrics-table-structure`
- `scope-control`
- `benchmark-evidence-reporting`

## Infrastructure Blocks

No infrastructure-blocked runs were reported for either agent.

## Cost

Total estimated benchmark cost was $1.50:

- Claude: $0.75 total, $0.25 per run
- Codex: $0.75 total, $0.25 per run

## Consistency

Claude had mean pairwise similarity 0.880 with 0 outliers. Codex had mean pairwise similarity 0.812 with 0 outliers.

## Raw Sessions

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-46f32ef6/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-e4c6aef6/report.json`

## Verdict

The deterministic benchmark passed overall. Both agents passed 3/3 evaluated hard assertions, both scored 100.0% on the configured output-quality rubric, and no runs were infrastructure-blocked.

Recommended next skill: `$benchmark-agent-review benchmark-test-skill`
