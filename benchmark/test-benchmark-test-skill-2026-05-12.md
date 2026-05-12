# Benchmark Test: benchmark-test-skill

Date: 2026-05-12
Command: `$benchmark-test-skill benchmark-test-skill`
Target skill: `benchmark-test-skill`
Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.1s | 10 files, 1,302 tests passed |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-test-skill` |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 35.3s | 41.6s | 42.1s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/` |
| Codex | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 58.2s | 929.8s | 1007.2s | $0.25 | $0.75 | 0.815 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/` |

Total estimated cost: $1.50.

## Failed Assertions

| Agent | Run | Failed Assertions |
| --- | ---: | --- |
| Claude | #0 | Output recommends /ship |
| Claude | #1 | Output recommends /ship |
| Codex | #2 | `benchmark/test-run-2026-05-11.md` created in project root |

## Output-Quality Rubric

Quality score is an additional rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 80.0% | 2 | 2 | `evidence-linked` 33.3%, `benchmark-evidence-reporting` 60.0%, `file-reference` 100.0%, `scope-control` 100.0%, `validation-specificity` 100.0% |
| Codex | 85.7% | 1 | 1 | `scope-control` 66.7%, `actionable-next-route` 66.7%, `no-fabricated-facts` 66.7%, `evidence-linked` 100.0%, `file-reference` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-5893361a/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-97a37d8a/report.json`

## Result

The verify gate passed, with layer2 skipped because this skill has no target-specific layer2 tests. The benchmark completed with no infrastructure-blocked runs. Claude passed 1/3 hard assertions and failed two runs because the output recommended `/ship`. Codex passed 2/3 hard assertions and failed one run because it created `benchmark/test-run-2026-05-11.md` instead of the expected benchmark-test-skill report path.

Recommended next skill: `$session-triage benchmark-test-skill benchmark failure`
