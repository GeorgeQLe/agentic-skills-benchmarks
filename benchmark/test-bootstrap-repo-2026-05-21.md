# Benchmark Test: bootstrap-repo

Date: 2026-05-21

Target skill: `bootstrap-repo`

Command: `pnpm bench --skill bootstrap-repo --agent both --runs 3 --chunk-size 3 --pause 0`

Coverage: custom, `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `bootstrap-repo`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0 | 0.0%-56.2% | 59.1% | 3 | 33.8s | 38.9s | 39.4s | $1.00 | $3.00 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 52.3% | 4 | 30.8s | 54.2s | 56.2s | $1.00 | $3.00 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| claude | #0 | 0 | Output includes project purpose |
| claude | #1 | 0 | Output includes project purpose |
| claude | #2 | 0 | Output includes project purpose |
| codex | #0 | 0 | Output includes project purpose |
| codex | #1 | 0 | Output includes project purpose |
| codex | #2 | 0 | Output includes project purpose; Output includes Next command; Output includes next command handoff; Output recommends $run |

Route assertions improved from 0% to 100% (Claude) and 66.7% (Codex) after fixture remediation. Remaining failures are on `project purpose` content assertions — the fixture prompt grounding for bootstrap-repo may need additional project-context enrichment.

## Output Quality

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 3 | 59.1% | 3 | 3 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| codex | 3 | 52.3% | 3 | 4 | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 41.7%; `workflow-next-route` 66.7%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocked Runs

- none

## Raw Sessions

- Claude: `tests/benchmarks/runs/bootstrap-repo-claude-46e8d59b/`
- Codex: `tests/benchmarks/runs/bootstrap-repo-codex-cbac0773/`

## Comparison with Pre-Remediation (2026-05-19)

| Agent | Pass Rate Before | Pass Rate After | Route Before | Route After |
| --- | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/3) | 0.0% (0/3) | 0% | 100% |
| codex | 0.0% (0/3) | 0.0% (0/3) | 0% | 66.7% |

## Next Route

Recommended next command: `$run`
