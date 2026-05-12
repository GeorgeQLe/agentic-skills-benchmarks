# Benchmark Test: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-test-skill benchmark-test-skill`
Target skill: `benchmark-test-skill`
Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.4s | 10 files, 1,256 tests passed |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-test-skill` |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 31.8s | 44.6s | 45.7s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 69.1s | 75.5s | 76.0s | $0.25 | $0.75 | 0.932 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/` |

Total estimated cost: $1.50.

## Failed Assertions

| Agent | Run | Failed Assertions |
| --- | ---: | --- |
| Claude | #0 | Output includes next command handoff |
| Claude | #1 | Output includes next command handoff |
| Claude | #2 | Output includes next command handoff |
| Codex | -- | none |

## Output-Quality Rubric

Quality score is an additional rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 63.1% | 3 | 6 | `evidence-linked` 0.0%, `file-reference` 0.0%, `actionable-next-route` 0.0%, `benchmark-evidence-reporting` 73.3%, `scope-control` 100.0% |
| Codex | 85.8% | 1 | 4 | `file-reference` 0.0%, `evidence-linked` 66.7%, `benchmark-evidence-reporting` 93.3%, `scope-control` 100.0%, `validation-specificity` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/report.json`

## Result

The verify gate passed, with layer2 skipped because this skill has no target-specific layer2 tests. The benchmark completed with no infrastructure-blocked runs. Claude failed 0/3 hard assertions because all three runs omitted the required next-command handoff. Codex passed 3/3 hard assertions, but the configured output-quality evaluator still recorded one threshold failure and four critical failures.

Recommended next skill: `$session-triage benchmark-test-skill benchmark failure`
