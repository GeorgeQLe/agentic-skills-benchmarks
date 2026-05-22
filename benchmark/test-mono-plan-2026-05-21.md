# Benchmark Test: mono-plan

Date: 2026-05-21

Target skill: `mono-plan`

Command: `pnpm --dir tests bench --skill mono-plan --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `mono-plan`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 18.2% | 3 | 9 | 4.1s | 4.5s | 4.5s | $1.00 | $3.00 | 1.000 | none |
| codex | 50.0% (1/2) | 1 | 9.5%-90.5% | 56.8% | 2 | 3 | 75.5s | 79.4s | 79.7s | $1.00 | $3.00 | 1.000 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 1 | Agent command exited successfully; mono-plan.md created in project root |
| claude | #1 | 1 | Agent command exited successfully; mono-plan.md created in project root |
| claude | #2 | 1 | Agent command exited successfully; mono-plan.md created in project root |
| codex | #0 | 0 | Output includes package boundaries |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 18.2% | 3 | 9 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-next-route 0.0%; workflow-domain-specificity 0.0%; workflow-actionability 0.0% |
| codex | 2 | 56.8% | 2 | 3 | workflow-artifact-reference 0.0%; no-generic-or-external-overreach 0.0%; workflow-fixture-facts 50.0%; workflow-actionability 75.0%; workflow-next-route 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/mono-plan-claude-94a7ddae/`
- Codex: `tests/benchmarks/runs/mono-plan-codex-306f6fce/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage mono-plan benchmark failure`
