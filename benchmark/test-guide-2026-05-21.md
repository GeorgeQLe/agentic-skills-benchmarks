# Benchmark Test: guide

Date: 2026-05-21

Target skill: `guide`

Command: `pnpm --dir tests bench --skill guide --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.1s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `guide`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 66.7% (2/3) | 0 | 20.8%-93.9% | 63.6% | 1 | 3 | 50.9s | 52.6s | 52.7s | $1.00 | $3.00 | 0.807 | none |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 86.4% | 0 | 0 | 72.1s | 81.3s | 82.1s | $1.00 | $3.00 | 0.854 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #2 | 1 | Agent command exited successfully; manual-guide.md created in project root |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 63.6% | 1 | 3 | workflow-artifact-reference 0.0%; workflow-actionability 33.3%; workflow-fixture-facts 66.7%; workflow-next-route 66.7%; workflow-domain-specificity 66.7% |
| codex | 3 | 86.4% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 50.0%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/guide-claude-6173bc57/`
- Codex: `tests/benchmarks/runs/guide-codex-b5bccf11/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage guide benchmark failure`
