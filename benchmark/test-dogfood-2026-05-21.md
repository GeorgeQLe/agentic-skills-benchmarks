# Benchmark Test: dogfood

Date: 2026-05-21

Target skill: `dogfood`

Command: `pnpm --dir tests bench --skill dogfood --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `dogfood`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 59.1% | 3 | 3 | 45.1s | 48.2s | 48.5s | $1.00 | $3.00 | 1.000 | none |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 88.6% | 0 | 0 | 48.1s | 51.1s | 51.4s | $1.00 | $3.00 | 0.938 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes owner scenarios |
| claude | #1 | 0 | Output includes owner scenarios |
| claude | #2 | 0 | Output includes owner scenarios; Output includes manual checks |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 59.1% | 3 | 3 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-actionability 50.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |
| codex | 3 | 88.6% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 75.0%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/dogfood-claude-e5370f06/`
- Codex: `tests/benchmarks/runs/dogfood-codex-0dbf9b4e/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage dogfood benchmark failure`
