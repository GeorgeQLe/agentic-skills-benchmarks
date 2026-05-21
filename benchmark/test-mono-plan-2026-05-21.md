# Benchmark Test: mono-plan

Date: 2026-05-21

Target skill: `mono-plan`

Command: `pnpm bench --skill mono-plan --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `mono-plan`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 61.4% | 4 | 36.7s | 38.3s | 38.4s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 66.7% (2/3) | 0 | 20.8%-93.9% | 72.7% | 2 | 45.7s | 60.2s | 61.4s | $1.00 | $3.00 | 0.928 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes package boundaries; Output recommends $run |
| claude | #1 | 0 | Output recommends $run |
| claude | #2 | 0 | Output recommends $run |
| codex | #1 | 0 | Output includes package boundaries; Output includes safe lanes |

Claude fails route assertion (`$run`) in all 3 runs despite fixture remediation. Codex route improved to 100% but still has content assertion gaps on 1/3 runs.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 61.4% | 3 | 4 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-actionability` 75.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 72.7% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-actionability` 66.7%; `no-generic-or-external-overreach` 66.7%; `workflow-next-route` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/mono-plan-claude-6e21c688/`
- Codex: `tests/benchmarks/runs/mono-plan-codex-ab8081a7/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0.0% (0/3) | 0% | 0% |
| codex | 0.0% (0/3) | 66.7% (2/3) | 0% | 100% |

Codex substantially improved: pass rate up from 0% to 66.7%, route up from 0% to 100%. Claude route assertion still failing — may need additional prompt reinforcement for Claude-specific routing behavior.

## Next Route

Recommended next command: `$run`
