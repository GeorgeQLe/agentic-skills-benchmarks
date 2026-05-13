# Benchmark Test Report: benchmark-test-skill

Date: 2026-05-13
Workflow: `$benchmark-test-skill benchmark-test-skill`
Coverage: custom (`tests/layer4/setups/tier1-workflows.setup.ts`)

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 10.3s | 1,311 tests passed |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `benchmark-test-skill` |

## Benchmark Summary

| Agent | Evaluated pass rate | Blocked runs | Wilson 95% CI | Failed assertions |
|---|---:|---:|---:|---|
| claude | 33.3% (1/3) | 0 | [6.1%, 79.2%] | Runs #0 and #2 failed `Output matches workflow expectation` |
| codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | none |

No infrastructure-blocked runs were reported for either agent.

## Output Quality Rubric

The quality score is an additional deterministic rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average quality score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| claude | 100.0% | 0 | 0 | `evidence-linked`, `file-reference`, `scope-control`, `benchmark-evidence-reporting`, `validation-specificity` all averaged 100.0% |
| codex | 100.0% | 0 | 0 | `evidence-linked`, `file-reference`, `scope-control`, `benchmark-evidence-reporting`, `validation-specificity` all averaged 100.0% |

## Latency

| Agent | p50 | p95 | p99 |
|---|---:|---:|---:|
| claude | 21.2s | 22.2s | 22.3s |
| codex | 26.0s | 32.8s | 33.4s |

## Cost

| Agent | Cost per run | Total cost |
|---|---:|---:|
| claude | $0.25 | $0.75 |
| codex | $0.25 | $0.75 |
| combined | $0.25 | $1.50 |

## Consistency

| Agent | Mean pairwise similarity | Outlier count |
|---|---:|---:|
| claude | 1.000 | 0 |
| codex | 0.833 | 0 |

## Raw Sessions

| Agent | Raw session path |
|---|---|
| claude | `tests/benchmarks/runs/benchmark-test-skill-claude-12cb3948/` |
| codex | `tests/benchmarks/runs/benchmark-test-skill-codex-bf331ec2/` |

## Result

`benchmark-test-skill` passed verify, but benchmark hard assertions did not pass for every evaluated runner. Claude completed all runs with no infrastructure blocks, but only 1 of 3 evaluated runs passed the hard workflow-expectation assertion. Codex completed all runs with no infrastructure blocks and passed 3 of 3 hard assertions.

Recommended next skill: `$session-triage benchmark-test-skill benchmark failure`
