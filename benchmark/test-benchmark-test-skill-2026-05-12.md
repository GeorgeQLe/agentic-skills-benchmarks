# Benchmark Test: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-test-skill benchmark-test-skill`
Target skill: `benchmark-test-skill`
Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.2s | 11 files, 1,303 tests passed |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-test-skill` |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 100.0% (2/2 evaluated) | 1 | [34.2%, 100.0%] | 75.5s | 108.6s | 111.6s | $0.25 | $0.75 | 0.785 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-d0075f7e/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 47.0s | 49.1s | 49.3s | $0.25 | $0.75 | 0.950 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-76616c00/` |

Total estimated cost: $1.50.

## Failed Assertions

None.

## Output-Quality Rubric

Quality score is an additional rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 72.9% | 2 | 2 | `evidence-linked` 0.0%, `benchmark-evidence-reporting` 60.0%, `file-reference` 100.0%, `scope-control` 100.0%, `validation-specificity` 100.0% |
| Codex | 85.7% | 0 | 2 | `evidence-linked` 33.3%, `file-reference` 100.0%, `scope-control` 100.0%, `benchmark-evidence-reporting` 100.0%, `validation-specificity` 100.0% |

## Infrastructure-Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | #0 | agent runner budget exceeded |

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-d0075f7e/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-76616c00/report.json`

## Result

The verify gate passed, with layer2 skipped because this skill has no target-specific layer2 tests. The benchmark completed with one Claude infrastructure-blocked run due to agent runner budget. Evaluated hard assertions passed for both agents: Claude passed 2/2 evaluated runs and Codex passed 3/3 evaluated runs. Both agents still had output-quality critical failures on evidence linkage, and Claude had two quality threshold failures.

Recommended next skill: `$benchmark-agent-review benchmark-test-skill`
