# Benchmark Test: update-packages

Date: 2026-05-18

Target skill: `update-packages`

Command: `$benchmark-test-skill update-packages`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.6s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `update-packages`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 33.3% (1/3) | 0 | 6.1%-79.2% | 43.9% | 16 | 268.9s | 4529.0s | 4907.7s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 63.6% | 12 | 971.6s | 1028.9s | 1034.0s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | 1 | 143 | Agent command exited successfully; `package-update-plan.md` created in project root |
| claude | 2 | 1 | Agent command exited successfully; `package-update-plan.md` created in project root |
| codex | 0 | 0 | `package-update-plan.md` created in project root |
| codex | 1 | 0 | `package-update-plan.md` created in project root |
| codex | 2 | 1 | Agent command exited successfully; `package-update-plan.md` created in project root |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 43.9% | 2 | 16 | `workflow-targeted-migration-routes` 0.0%; `workflow-fixture-facts` 33.3%; `workflow-output-includes-verification-command-evidence` 33.3%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 33.3%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 33.3% |
| codex | 3 | 63.6% | 3 | 12 | `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 0.0%; `workflow-next-route` 0.0%; `workflow-domain-specificity` 0.0%; `workflow-actionability` 0.0%; `workflow-targeted-migration-routes` 0.0% |

## Infrastructure Blocked Runs

- none

## Latency

| Agent | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| claude | 268.9s | 4529.0s | 4907.7s |
| codex | 971.6s | 1028.9s | 1034.0s |

## Cost

| Agent | Cost / Run | Total Cost |
| --- | ---: | ---: |
| claude | $1.00 | $3.00 |
| codex | $1.00 | $3.00 |

Total cost: $6.00

## Consistency

| Agent | Mean Pairwise Similarity | Outlier Count |
| --- | ---: | ---: |
| claude | 1.000 | 0 |
| codex | 1.000 | 0 |

## Raw Sessions

- Claude: `tests/benchmarks/runs/update-packages-claude-5adfd816/`
- Codex: `tests/benchmarks/runs/update-packages-codex-06adb3a6/`

## Recommendation

Both runners produced evaluated deterministic failures, and neither lane was infrastructure-blocked. Claude passed 1/3 hard-assertion runs while Codex passed 0/3. The common failure surface is that required `package-update-plan.md` artifacts were not detected in the benchmark project root, with additional command-exit failures in Claude run 1, Claude run 2, and Codex run 2. Both lanes also missed critical output-quality criteria.

Recommended next skill: `$session-triage update-packages benchmark failure`
