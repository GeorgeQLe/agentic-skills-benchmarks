# Benchmark Test: icon-handler

Date: 2026-05-13
Workflow: `$benchmark-test-skill icon-handler`
Coverage: custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 8.7s | 12 files, 1351 tests passed |
| layer2 | SKIP | -- | No layer2 tests matched `icon-handler`; target-specific layer2 verification was skipped |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | p50 Latency | p95 Latency | p99 Latency | Cost / Run | Total Cost | Mean Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/2) | 1/3 | [0.0%, 65.8%] | 25.2s | 33.5s | 34.3s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/icon-handler-claude-34290a7e/` |
| codex | 100.0% (3/3) | 0/3 | [43.8%, 100.0%] | 61.2s | 67.1s | 67.7s | $0.25 | $0.75 | 0.903 | 0 | `tests/benchmarks/runs/icon-handler-codex-eff077f4/` |

Total estimated benchmark cost: $1.50.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output recommends `$icon-handler` |
| claude | #1 | 1 | Agent command exited successfully; `icon-audit.md` created in project root |
| codex | -- | -- | none |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a replacement for the hard assertion pass rate.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 42.0% | 2 | 4 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-actionability` 12.5%; `workflow-fixture-facts` 50.0%; `workflow-domain-specificity` 50.0% |
| codex | 3 | 84.8% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure-Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #2 | agent runner budget exceeded |
| codex | -- | none |

## Interpretation

`icon-handler` has custom benchmark coverage. Verification passed at layer1, while layer2 had no target-specific tests and was skipped. The benchmark produced mixed deterministic results: Codex passed all evaluated hard assertions, while Claude failed both evaluated runs and had one infrastructure-blocked run.

Because evaluated benchmark runs completed and Claude failed hard assertions plus quality thresholds, remediation planning should happen before treating this as a clean pass. Subjective output-quality review can use the persisted sessions above to determine whether the failures are skill-contract issues, runner-specific behavior, or benchmark rubric gaps.

Recommended next skill: `$session-triage icon-handler benchmark failure`
