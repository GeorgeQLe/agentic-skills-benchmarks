# Benchmark Test: provision-agentic-config

Date: 2026-05-21

Target skill: `provision-agentic-config`

Command: `pnpm --dir tests bench --skill provision-agentic-config --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 1.9s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `provision-agentic-config`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 46.2% | 3 | 6 | 43.8s | 104.0s | 109.4s | $1.00 | $3.00 | 1.000 | none |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 55.3% | 3 | 4 | 58.0s | 59.1s | 59.2s | $1.00 | $3.00 | 1.000 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| claude | #1 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| claude | #2 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| codex | #0 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| codex | #1 | 0 | Output includes orchestration rules; Output includes monorepo safety |
| codex | #2 | 0 | Output includes orchestration rules |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 46.2% | 3 | 6 | workflow-fixture-facts 0.0%; no-generic-or-external-overreach 0.0%; workflow-artifact-reference 33.3%; workflow-actionability 75.0%; workflow-next-route 100.0% |
| codex | 3 | 55.3% | 3 | 4 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; no-generic-or-external-overreach 66.7%; workflow-actionability 75.0%; workflow-next-route 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/provision-agentic-config-claude-5b8c49e8/`
- Codex: `tests/benchmarks/runs/provision-agentic-config-codex-982f6b9d/`

## Recommendation

Both runners remain at 0% hard-assertion pass rate in this rerun, or had only infrastructure-blocked runs; route or artifact expectations still need targeted triage.

Recommended next command: `$session-triage provision-agentic-config benchmark failure`
