# Benchmark Test: hygiene

Date: 2026-05-21

Target skill: `hygiene`

Command: `pnpm --dir tests bench --skill hygiene --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 2.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `hygiene`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 18.2% | 3 | 9 | 4.0s | 4.0s | 4.0s | $1.00 | $3.00 | 1.000 | none |
| codex | 100.0% (1/1) | 2 | 20.7%-100.0% | 86.4% | 0 | 0 | 38.7s | 38.7s | 38.7s | $1.00 | $3.00 | 1.000 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 1 | Agent command exited successfully; hygiene-report.md created in project root |
| claude | #1 | 1 | Agent command exited successfully; hygiene-report.md created in project root |
| claude | #2 | 1 | Agent command exited successfully; hygiene-report.md created in project root |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 18.2% | 3 | 9 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-next-route 0.0%; workflow-domain-specificity 0.0%; workflow-actionability 0.0% |
| codex | 1 | 86.4% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 50.0%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #0 | agent runner timeout |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/hygiene-claude-4e4c29f3/`
- Codex: `tests/benchmarks/runs/hygiene-codex-f3fa3e6f/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage hygiene benchmark failure`
