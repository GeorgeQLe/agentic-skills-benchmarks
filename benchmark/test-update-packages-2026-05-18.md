# Benchmark Test: update-packages

Date: 2026-05-18

Target skill: `update-packages`

Command: `$benchmark-test-skill update-packages`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `update-packages`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (2/2) | 1 | 34.2%-100.0% | 90.9% | 2 | 52.3s | 54.2s | 54.4s | $0.25 | $0.75 | 0.856 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 79.8s | 80.5s | 80.5s | $0.25 | $0.75 | 0.911 | 0 |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 90.9% | 0 | 2 | `workflow-actionability` 0.0%; `workflow-targeted-migration-routes` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | 0 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Sessions

- Claude: `tests/benchmarks/runs/update-packages-claude-59fa8392/`
- Codex: `tests/benchmarks/runs/update-packages-codex-2621e339/`

## Recommendation

The benchmark produced evaluated runs for both agents and hard assertions passed, but Claude had deterministic output-quality critical failures. Treat this as a benchmark failure needing triage rather than a subjective review-only handoff.

Recommended next skill: `$session-triage update-packages benchmark failure`
