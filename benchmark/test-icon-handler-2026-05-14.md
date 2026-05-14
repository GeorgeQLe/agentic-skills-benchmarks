# Benchmark Test: icon-handler

**Date:** 2026-05-14  
**Workflow:** `$benchmark-test-skill icon-handler`  
**Target skill:** `icon-handler`  
**Coverage:** custom  
**Setup:** `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 10.8s | 1,446 tests passed across 13 files. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `icon-handler`. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 78.0% | 40.5s | 44.2s | 44.5s | $1.00 | $3.00 | 0.790 | 0 | `tests/benchmarks/runs/icon-handler-claude-ba6ebaf0/` |
| Codex | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 81.1% | 65.0s | 7621.6s | 8293.3s | $1.00 | $3.00 | 0.898 | 0 | `tests/benchmarks/runs/icon-handler-codex-dc9c3d30/` |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
|---|---:|---:|---|
| Claude | #2 | 0 | `Output recommends /icon-handler` |
| Codex | #2 | 0 | `icon-audit.md created in project root` |

## Output-Quality Details

| Agent | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---|
| Claude | 78.0% | 1 | 1 | `workflow-artifact-reference` 0.0%, `workflow-actionability` 25.0%, `workflow-next-route` 66.7% |
| Codex | 81.1% | 1 | 1 | `workflow-actionability` 25.0%, `workflow-artifact-reference` 33.3%, `workflow-next-route` 66.7% |

Output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

## Infrastructure Blocks

None. All 6 benchmark runs completed and were evaluated.

## Notes

- The previous `icon-handler` benchmark fixture issue from 2026-05-13, where an ASCII placeholder named `calc-mascot-icon.png` could trigger image-processing failures, did not recur. The current failures are normal evaluated-output failures.
- Claude run #2 created `icon-audit.md` and identified the Next App Router icon issues, but its final handoff routed to `npx next build` instead of the expected `/icon-handler` route.
- Codex run #2 exited successfully but did not create `icon-audit.md` in the project root. Its stderr shows it began the task and then stopped after the initial response, with no audit artifact written.
- Codex run #2 duration was 8,461.2s, which drives the very high p95/p99 latency values.

## Raw Evidence

- Claude report: `tests/benchmarks/runs/icon-handler-claude-ba6ebaf0/report.json`
- Claude Markdown: `tests/benchmarks/runs/icon-handler-claude-ba6ebaf0/report.md`
- Codex report: `tests/benchmarks/runs/icon-handler-codex-dc9c3d30/report.json`
- Codex Markdown: `tests/benchmarks/runs/icon-handler-codex-dc9c3d30/report.md`

## Result

Verify passed, but both runners had one failed evaluated benchmark run. Treat this as a skill or harness behavior failure requiring triage rather than an infrastructure block.

Recommended next command: `$session-triage icon-handler benchmark failure`
