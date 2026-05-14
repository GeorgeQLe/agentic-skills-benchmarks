# Benchmark Test: icon-handler

**Date:** 2026-05-14  
**Workflow:** `$benchmark-test-skill icon-handler`  
**Target skill:** `icon-handler`  
**Coverage:** custom  
**Setup:** `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 12.3s | 1,446 tests passed across 13 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `icon-handler`. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 62.1% | 38.5s | 41.6s | 41.9s | $1.00 | $3.00 | 0.764 | 0 | `tests/benchmarks/runs/icon-handler-claude-86ed23d1/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.1% | 73.0s | 143.5s | 149.7s | $1.00 | $3.00 | 0.888 | 0 | `tests/benchmarks/runs/icon-handler-codex-35de8ee4/` |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
|---|---:|---:|---|
| Claude | #2 | 1 | `Agent command exited successfully`; `icon-audit.md created in project root` |
| Codex | -- | -- | none |

## Output-Quality Details

| Agent | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---|
| Claude | 62.1% | 1 | 3 | `workflow-artifact-reference` 0.0%, `workflow-actionability` 16.7%, `workflow-fixture-facts` 66.7%, `workflow-next-route` 66.7%, `workflow-domain-specificity` 66.7% |
| Codex | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%, `workflow-actionability` 25.0%, `workflow-fixture-facts` 100.0%, `workflow-next-route` 100.0%, `workflow-domain-specificity` 100.0% |

Output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

## Infrastructure Blocks

None. All 6 benchmark runs completed and were evaluated.

## Notes

- `icon-handler` remained on custom benchmark coverage through `tests/layer4/setups/tier23-global-workflows.setup.ts`.
- Verify passed before benchmarking. Layer2 was skipped only because no target-specific layer2 tests matched `icon-handler`.
- Claude run #2 failed before producing `icon-audit.md`; stdout was `API Error: 400 Could not process image`. The harness did not classify this run as infrastructure-blocked, so it is reported as an evaluated benchmark failure.
- Codex passed all hard assertions after the route-clarity fix, with no blocked runs and no quality threshold or critical failures.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/icon-handler-claude-86ed23d1/report.json`
- Claude Markdown: `tests/benchmarks/runs/icon-handler-claude-86ed23d1/report.md`
- Codex report: `tests/benchmarks/runs/icon-handler-codex-35de8ee4/report.json`
- Codex Markdown: `tests/benchmarks/runs/icon-handler-codex-35de8ee4/report.md`

## Result

Verify passed, Codex passed 3/3 hard assertions, and Claude passed 2/3 hard assertions with one evaluated failure. Treat this as a benchmark failure requiring triage rather than an infrastructure block.

Recommended next command: `$session-triage icon-handler benchmark failure`
