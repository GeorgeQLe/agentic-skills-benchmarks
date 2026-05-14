# Benchmark Test: icon-handler

**Date:** 2026-05-14  
**Workflow:** `$benchmark-test-skill icon-handler`  
**Target skill:** `icon-handler`  
**Coverage:** custom  
**Setup:** `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 8.9s | 1,447 tests passed across 13 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `icon-handler`. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.1% | 37.1s | 49.5s | 50.6s | $1.00 | $3.00 | 0.850 | 0 | `tests/benchmarks/runs/icon-handler-claude-bccbdf8a/` |
| Codex | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 84.8% | 61.5s | 82.8s | 84.7s | $1.00 | $3.00 | 0.888 | 0 | `tests/benchmarks/runs/icon-handler-codex-68b180e6/` |

## Failed Assertions

None. All evaluated Claude and Codex runs passed the hard assertions.

## Output-Quality Details

| Agent | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---|
| Claude | 84.1% | 0 | 0 | `workflow-artifact-reference` 0.0%, `workflow-actionability` 25.0%, `workflow-fixture-facts` 100.0%, `workflow-next-route` 100.0%, `workflow-domain-specificity` 100.0% |
| Codex | 84.8% | 0 | 0 | `workflow-artifact-reference` 0.0%, `workflow-actionability` 33.3%, `workflow-fixture-facts` 100.0%, `workflow-next-route` 100.0%, `workflow-domain-specificity` 100.0% |

Output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

## Infrastructure Blocks

None. All 6 benchmark runs completed and were evaluated.

## Notes

- `icon-handler` remained on custom benchmark coverage through `tests/layer4/setups/tier23-global-workflows.setup.ts`.
- Verify passed before benchmarking. Layer2 was skipped only because no target-specific layer2 tests matched `icon-handler`.
- The previous Claude image-processing runner failure did not recur in this evaluated run set.
- Both agents passed the final next-route and domain-specific fixture checks in all evaluated runs.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/icon-handler-claude-bccbdf8a/report.json`
- Claude Markdown: `tests/benchmarks/runs/icon-handler-claude-bccbdf8a/report.md`
- Codex report: `tests/benchmarks/runs/icon-handler-codex-68b180e6/report.json`
- Codex Markdown: `tests/benchmarks/runs/icon-handler-codex-68b180e6/report.md`

## Result

Verify passed, Claude passed 3/3 hard assertions, Codex passed 3/3 hard assertions, and there were no infrastructure-blocked runs. Subjective output-quality review has not yet been performed for these generated outputs.

Recommended next skill: `$benchmark-agent-review icon-handler`
