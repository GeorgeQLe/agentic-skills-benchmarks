# Benchmark Test: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-test-skill benchmark-test-skill`
Target skill: `benchmark-test-skill`
Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.1s | 12 files, 1,304 tests passed |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-test-skill` |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 26.3s | 51.5s | 53.8s | $0.25 | $0.75 | 0.935 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-babf5870/` |
| Codex | 100.0% (3/3 evaluated) | 0 | [43.8%, 100.0%] | 67.5s | 86.1s | 87.7s | $0.25 | $0.75 | 0.853 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-c4f58932/` |

Total estimated cost: $1.50.

## Failed Assertions

None.

## Output-Quality Rubric

Quality score is an additional rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 92.4% | 0 | 0 | `benchmark-evidence-reporting` 46.7%, `evidence-linked` 100.0%, `file-reference` 100.0%, `scope-control` 100.0%, `validation-specificity` 100.0% |
| Codex | 92.4% | 0 | 0 | `benchmark-evidence-reporting` 46.7%, `evidence-linked` 100.0%, `file-reference` 100.0%, `scope-control` 100.0%, `validation-specificity` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-babf5870/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-c4f58932/report.json`

## Result

The verify gate passed, with layer2 skipped because this skill has no target-specific layer2 tests. The both-agent benchmark completed with no infrastructure-blocked runs. Hard assertions passed for both agents: Claude passed 3/3 evaluated runs and Codex passed 3/3 evaluated runs. Output-quality rubric scores averaged 92.4% for both agents, with no threshold failures and no critical failures.

Recommended next skill: `$benchmark-agent-review benchmark-test-skill`
