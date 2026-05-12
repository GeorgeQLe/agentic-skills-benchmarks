# Benchmark Test: spec-interview

Date: 2026-05-12
Command: `$benchmark-test-skill spec-interview`
Coverage: custom (`tests/layer4/setups/tier1-workflows.setup.ts`)

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 7.9s | 10 files, 1,255 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `spec-interview`; target-specific layer2 verification was skipped |

## Benchmark

Command: `pnpm bench --skill spec-interview --agent both --runs 3 --chunk-size 3 --pause 0`

| Agent | Evaluated Pass Rate | Evaluated Runs | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% | 0 | 3 | [0.0%, 0.0%] | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/spec-interview-claude-b83d0caa/` |
| codex | 0.0% | 3 | 0 | [0.0%, 56.2%] | 97.5s | 125.5s | 128.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/spec-interview-codex-fbecbbfe/` |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | -- | -- | none evaluated; runs were infrastructure-blocked |
| codex | 0 | 0 | Output recommends `$plan-phase` |
| codex | 1 | 0 | Output recommends `$plan-phase` |
| codex | 2 | 0 | Output recommends `$plan-phase` |

## Output Quality

The Codex setup includes an additional output-quality rubric. This is not a substitute for hard assertion pass rate.

| Agent | Evaluated Runs | Average Quality Score | Threshold Failures | Critical Failures |
| --- | ---: | ---: | ---: | ---: |
| claude | 0 | n/a | n/a | n/a |
| codex | 3 | 85.7% | 0 | 3 |

Lowest-scoring Codex criteria:

| Criterion | Average Score |
| --- | ---: |
| file-reference | 0.0% |
| actionable-next-route | 0.0% |
| evidence-linked | 100.0% |
| scope-control | 100.0% |
| spec-completeness | 100.0% |

## Infrastructure-Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | 0 | agent runner budget exceeded |
| claude | 1 | agent runner budget exceeded |
| claude | 2 | agent runner budget exceeded |
| codex | -- | none |

## Result

Verification passed with target-specific layer2 skipped. The Claude benchmark produced no evaluated runs because all three runs were infrastructure-blocked by the agent runner budget. The Codex benchmark completed 3 evaluated runs, but hard assertions failed 0/3 because every run omitted the expected `$plan-phase` recommendation. Codex output quality averaged 85.7%, with no threshold failures but 3 critical failures tied to missing file references and next-route behavior.

Recommended next command: `$session-triage spec-interview benchmark failure`
