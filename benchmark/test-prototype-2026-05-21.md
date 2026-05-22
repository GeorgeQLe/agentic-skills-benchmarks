# Benchmark Test: prototype

Date: 2026-05-21

Target skill: `prototype`

Command: `pnpm --dir tests bench --skill prototype --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.3s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `prototype`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Threshold Failures | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 18.2% | 3 | 9 | 4.0s | 4.0s | 4.0s | $1.00 | $3.00 | 1.000 | none |
| codex | 0.0% (0/1) | 2 | 0.0%-79.3% | 59.1% | 1 | 1 | 176.2s | 176.2s | 176.2s | $1.00 | $3.00 | 1.000 | none |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 1 | Agent command exited successfully; prototypes/dashboard/index.html created in project root |
| claude | #1 | 1 | Agent command exited successfully; prototypes/dashboard/index.html created in project root |
| claude | #2 | 1 | Agent command exited successfully; prototypes/dashboard/index.html created in project root |
| codex | #0 | 0 | Output includes hub page; Output includes fake data |

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 18.2% | 3 | 9 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-next-route 0.0%; workflow-domain-specificity 0.0%; workflow-actionability 0.0% |
| codex | 1 | 59.1% | 1 | 1 | workflow-fixture-facts 0.0%; workflow-artifact-reference 0.0%; workflow-actionability 50.0%; workflow-next-route 100.0%; workflow-domain-specificity 100.0% |

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| codex | #1 | agent runner timeout |
| codex | #2 | agent runner timeout |

## Raw Sessions

- Claude: `tests/benchmarks/runs/prototype-claude-0e2ae4e0/`
- Codex: `tests/benchmarks/runs/prototype-codex-989a24c4/`

## Recommendation

Both runners remain at 0% hard-assertion pass rate in this rerun, or had only infrastructure-blocked runs; route or artifact expectations still need targeted triage.

Recommended next command: `$session-triage prototype benchmark failure`
