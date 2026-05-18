# Benchmark Test: update-packages

Date: 2026-05-18

Target skill: `update-packages`

Command: `$benchmark-test-skill update-packages`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.1s | Static harness-contract gate passed after expanding the per-run budget and broadening retained-evidence matchers. |
| layer2 | SKIP | -- | No layer2 tests matched `update-packages`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 93.9% | 2 | 54.1s | 72.6s | 74.3s | $1.00 | $3.00 | 0.853 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 84.1s | 88.0s | 88.4s | $1.00 | $3.00 | 0.914 | 0 |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 93.9% | 0 | 2 | `workflow-actionability` 33.3%; `workflow-targeted-migration-routes` 33.3%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/update-packages-claude-391a34fd/`
- Codex: `tests/benchmarks/runs/update-packages-codex-3784a689/`

## Recommendation

The expanded-budget benchmark produced three evaluated, non-blocked runs for both agents and hard assertions passed. Claude still had deterministic output-quality critical failures on actionability and target-specific migration routing, so keep the next route as triage rather than subjective review-only handoff.

Recommended next skill: `$session-triage update-packages benchmark failure`
