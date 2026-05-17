# Benchmark Test: roadmap

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill roadmap`
**Target skill:** `roadmap`
**Coverage:** custom
**Setup:** `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | FAIL | 3.9s | `layer1/benchmark-results-matrix.test.ts` expected the older `ship-codex-a2685d9f` raw report row, while the generated benchmark matrix now points at `ship-codex-898663d6`. |
| layer2 | SKIP | -- | Verification stopped after layer1 failure; no target-specific layer2 tests ran for `roadmap`. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | not run | 0 | not available | not scored | not available | not available | not available | $0.00 | $0.00 | not available | not available | none: verify failed before benchmark execution |
| Codex | not run | 0 | not available | not scored | not available | not available | not available | $0.00 | $0.00 | not available | not available | none: verify failed before benchmark execution |

## Failed Assertions

- `layer1/benchmark-results-matrix.test.ts` failed because its expected `ship` Codex row is stale:
  - Expected raw report: `tests/benchmarks/runs/ship-codex-a2685d9f/report.json`
  - Current matrix raw report: `tests/benchmarks/runs/ship-codex-898663d6/report.json`

No `roadmap` benchmark hard assertions were evaluated.

## Output-Quality Details

No output-quality evaluator ran. Output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

## Infrastructure Blocks

None reported. The run is verification-blocked by a layer1 harness assertion failure, not by runner capacity, quota, or rate limits.

## Notes

- `roadmap` is known to the benchmark harness with custom coverage through `tests/layer4/setups/tier1-workflows.setup.ts`.
- `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0` was intentionally not run because `pnpm verify --skill roadmap` failed.
- The observed failure is a benchmark-results matrix maintenance issue, not evidence that the `roadmap` skill failed its benchmark behavior.

## Raw Evidence

- Verify command: `pnpm verify --skill roadmap`
- Raw benchmark session path: none, because verification failed before benchmark execution.

## Result

Verify failed at layer1, so no Claude or Codex benchmark runs were executed. There are no pass-rate, latency, consistency, or benchmark cost metrics for `roadmap` from this invocation.

Recommended next skill: `$session-triage roadmap benchmark failure`
