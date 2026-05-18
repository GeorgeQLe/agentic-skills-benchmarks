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
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 23.6s | 26.7s | 26.9s | $0.25 | $0.75 | 0.966 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 33.8s | 34.9s | 35.0s | $0.25 | $0.75 | 0.845 | 0 |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `handoff-continuity` 100.0%; `validation-specificity` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `handoff-continuity` 100.0%; `validation-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/ship-end-claude-0190fdda/`
- Codex: `tests/benchmarks/runs/ship-end-codex-4fbde9d6/`

## Recommendation

The rerun after runner-specific route and fixture source-of-truth tightening produced three evaluated, non-blocked runs for both agents. Hard assertions passed and output-quality scoring was clean for both Claude and Codex.

Recommended next skill: `$benchmark-agent-review ship-end`
