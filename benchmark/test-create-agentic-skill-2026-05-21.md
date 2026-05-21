# Benchmark Test: create-agentic-skill

Date: 2026-05-21

Target skill: `create-agentic-skill`

Command: `pnpm bench --skill create-agentic-skill --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `create-agentic-skill`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 100.0% (3/3) | 0 | 43.8%-100.0% | 87.1% | 0 | 38.7s | 38.8s | 38.8s | $1.00 | $3.00 | 0.887 | 0 |
| codex | 100.0% (3/3) | 0 | 43.8%-100.0% | 88.6% | 0 | 55.3s | 58.3s | 58.5s | $1.00 | $3.00 | 0.911 | 0 |

## Failed Assertions

- none

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 87.1% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 58.3%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 88.6% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/create-agentic-skill-claude-902cfd26/`
- Codex: `tests/benchmarks/runs/create-agentic-skill-codex-086796dd/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 100.0% (3/3) | 0% | 100% |
| codex | 0.0% (0/0, 3 blocked) | 100.0% (3/3) | -- | 100% |

## Next Route

Recommended next command: `$run`
