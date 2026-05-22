# Benchmark Test: handoff

Date: 2026-05-21

Target skill: `handoff`

Command: `pnpm --dir tests bench --skill handoff --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `handoff`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 18.2% | 3 | 9 | 4.1s | 4.3s | 4.3s | $1.00 | $3.00 | 1.000 | none |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 89.4% | 0 | 0 | 26.1s | 65.4s | 68.9s | $1.00 | $3.00 | 0.759 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 1 | Agent command exited successfully; HANDOFF.md created in project root |
| claude | #1 | 1 | Agent command exited successfully; HANDOFF.md created in project root |
| claude | #2 | 1 | Agent command exited successfully; HANDOFF.md created in project root |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 18.2% | 3 | 9 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-next-route 0.0%; workflow-domain-specificity 0.0%; workflow-actionability 0.0% |
| codex | 3 | 89.4% | 0 | 0 | workflow-artifact-reference 0.0%; workflow-actionability 83.3%; workflow-fixture-facts 100.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/handoff-claude-39666313/`
- Codex: `tests/benchmarks/runs/handoff-codex-399355a0/`

## Recommendation

At least one runner improved above the near-zero pre-remediation baseline; remaining failures should be triaged from the failed assertion and infrastructure rows below.

Recommended next command: `$session-triage handoff benchmark failure`
