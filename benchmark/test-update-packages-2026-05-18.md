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
| claude | 100.0% (2/2) | 1 | 34.2%-100.0% | 93.2% | 1 | 53.9s | 54.7s | 54.8s | $0.25 | $0.75 | 0.924 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 77.2s | 87.2s | 88.1s | $0.25 | $0.75 | 0.910 | 0 |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 2 | 93.2% | 0 | 1 | `workflow-targeted-migration-routes` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | 2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Sessions

- Claude: `tests/benchmarks/runs/update-packages-claude-5d66f365/`
- Codex: `tests/benchmarks/runs/update-packages-codex-1ff2f8b0/`

## Recommendation

The benchmark produced evaluated runs for both agents and hard assertions passed, but Claude still had one deterministic output-quality critical failure on target-specific migration routing. Treat this as a benchmark failure needing triage rather than a subjective review-only handoff.

Recommended next skill: `$session-triage update-packages benchmark failure`
