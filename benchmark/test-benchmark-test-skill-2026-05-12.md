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
| Claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 53.0s | 167.5s | 177.7s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 59.9s | 60.7s | 60.8s | $0.25 | $0.75 | 0.913 | 0 | `tests/benchmarks/runs/benchmark-test-skill-codex-6b3807bf/` |

Total estimated cost: $1.50.

## Failed Assertions

| Agent | Run | Failed Assertions |
| --- | ---: | --- |
| Claude | #0 | Output includes next command handoff |
| Claude | #1 | Agent command exited successfully; Output includes next command handoff |
| Claude | #2 | Output includes next command handoff |
| Codex | -- | none |

## Output-Quality Rubric

Quality score is an additional rubric score, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 89.8% | 0 | 0 | `actionable-next-route` 0.0%, `benchmark-evidence-reporting` 73.3%, `evidence-linked` 100.0%, `file-reference` 100.0%, `scope-control` 100.0% |
| Codex | 85.8% | 1 | 2 | `evidence-linked` 33.3%, `benchmark-evidence-reporting` 93.3%, `file-reference` 100.0%, `scope-control` 100.0%, `validation-specificity` 100.0% |

## Infrastructure-Blocked Runs

None.

## Raw Reports

- Claude: `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/report.json`
- Codex: `tests/benchmarks/runs/benchmark-test-skill-codex-6b3807bf/report.json`

## Result

The verify gate passed, with layer2 skipped because this skill has no target-specific layer2 tests. The benchmark completed with no infrastructure-blocked runs. Claude failed 0/3 hard assertions because all three runs omitted the required next-command handoff, and run #1 also exited with code 143. Codex passed 3/3 hard assertions, but the configured output-quality evaluator still recorded one threshold failure and two critical failures.

Recommended next skill: `$session-triage benchmark-test-skill benchmark failure`
