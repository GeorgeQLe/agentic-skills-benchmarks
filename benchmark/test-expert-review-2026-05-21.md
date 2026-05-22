# Benchmark Test: expert-review

Date: 2026-05-21

Target skill: `expert-review`

Command: `pnpm --dir tests bench --skill expert-review --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.5s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `expert-review`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 85.6% | 0 | 0 | 41.5s | 44.0s | 44.2s | $1.00 | $3.00 | 0.819 | none |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 88.6% | 0 | 0 | 29.4s | 39.8s | 40.7s | $1.00 | $3.00 | 0.852 | none |

## Failed Assertions

- none

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 85.6% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 41.7%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |
| codex | 3 | 88.6% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 75.0%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/expert-review-claude-492519ae/`
- Codex: `tests/benchmarks/runs/expert-review-codex-11d14fb2/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage expert-review benchmark failure`
