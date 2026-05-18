# Benchmark Test: ship-end

Date: 2026-05-18

Target skill: `ship-end`

Command: `$benchmark-test-skill ship-end`

Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 10.5s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `ship-end`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 73.8% | 4 | 21.5s | 26.2s | 26.6s | $0.25 | $0.75 | 1.000 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 92.9% | 1 | 37.9s | 40.6s | 40.8s | $0.25 | $0.75 | 0.891 | 0 |

## Failed Assertions

| Agent | Run | Failed Assertions |
| --- | ---: | --- |
| claude | 0 | Output includes Step 1.2; Output recommends `$run` |
| claude | 1 | Output recommends `$run` |
| claude | 2 | Output includes Step 1.2; Output recommends `$run` |

Codex had no failed hard assertions.

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 73.8% | 2 | 4 | `actionable-next-route` 0.0%; `evidence-linked` 33.3%; `file-reference` 33.3%; `scope-control` 100.0%; `handoff-continuity` 100.0% |
| codex | 3 | 92.9% | 0 | 1 | `evidence-linked` 66.7%; `file-reference` 100.0%; `scope-control` 100.0%; `handoff-continuity` 100.0%; `validation-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/ship-end-claude-edad4640/`
- Codex: `tests/benchmarks/runs/ship-end-codex-558a21dc/`

## Recommendation

The benchmark produced three evaluated, non-blocked runs for both agents. Codex passed hard assertions, but Claude failed every evaluated run on required continuity and next-route behavior. Stop the broad benchmark batch and triage this failure before continuing with additional Phase 41.1 targets.

Recommended next skill: `$session-triage ship-end benchmark failure`
