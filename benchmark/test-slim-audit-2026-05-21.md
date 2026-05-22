# Benchmark Test: slim-audit

Date: 2026-05-21

Target skill: `slim-audit`

Command: `pnpm bench --skill slim-audit --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | -- | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `slim-audit`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 61.4% | 3 | 35.3s | 38.9s | 39.2s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 79.5% | 1 | 49.3s | 57.1s | 57.8s | $1.00 | $3.00 | 0.794 | 0 |

## Failed Assertions

- Claude run #0: "Output includes simplification opportunities"
- Claude run #1: "Output includes simplification opportunities"
- Claude run #2: "Output includes simplification opportunities"
- Codex run #0: "Output includes simplification opportunities"

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 61.4% | 3 | 3 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 79.5% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 66.7%; `workflow-actionability` 75.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/slim-audit-claude-501dfc6b/`
- Codex: `tests/benchmarks/runs/slim-audit-codex-56c83ac8/`

## Comparison with Pre-Remediation (2026-05-20)

| Agent | Pass Rate Before | Pass Rate After | Quality Before | Quality After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0.0% (0/3) | 43.2% | 61.4% |
| codex | 0.0% (0/3) | 66.7% (2/3) | 52.3% | 79.5% |

## Next Route

Recommended next command: `$run`
