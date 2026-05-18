# Benchmark Test: update-packages

Date: 2026-05-18

Target skill: `update-packages`

Command: `$benchmark-test-skill update-packages`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 14.9s | Static harness-contract gate passed after the batch-label actionability tolerance update. |
| layer2 | SKIP | -- | No layer2 tests matched `update-packages`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 93.9% | 1 | 66.6s | 68.9s | 69.1s | $1.00 | $3.00 | 0.861 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 100.0% | 0 | 74.2s | 83.7s | 84.6s | $1.00 | $3.00 | 0.876 | 0 |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 93.9% | 0 | 1 | `workflow-targeted-migration-routes` 0.0%; `workflow-actionability` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| codex | 3 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/update-packages-claude-fee787f2/`
- Codex: `tests/benchmarks/runs/update-packages-codex-ddecf851/`

## Recommendation

The batch-label tolerance update removed one Claude actionability critical failure pattern, and both agents passed 3/3 hard assertions with no infrastructure-blocked runs. Claude still has a deterministic output-quality critical failure because all evaluated runs missed target-specific migrate routes, so the result should be triaged before routing to subjective review or ship.

Recommended next skill: `$session-triage update-packages benchmark failure`
