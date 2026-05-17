# Benchmark Test: roadmap

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill roadmap`
**Target skill:** `roadmap`
**Coverage:** custom
**Setup:** `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.6s | 15 files, 1202 tests passed. |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `roadmap`; benchmark evidence is from the custom layer4 setup. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | 0.0% (0/0 evaluated) | 3 | [0.0%, 0.0%] | not scored | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/roadmap-claude-ceadee35/` |
| Codex | 0.0% (0/3 evaluated) | 0 | [0.0%, 56.2%] | 78.6% | 44.3s | 70.5s | 72.9s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/roadmap-codex-43f41fa9/` |

## Failed Assertions

Codex completed three evaluated runs. Each run failed one hard assertion:

| Agent | Run | Failed Assertion |
|---|---:|---|
| Codex | 0 | `Output recommends $run` |
| Codex | 1 | `Output recommends $run` |
| Codex | 2 | `Output recommends $run` |

Claude had no evaluated hard assertions because all three runs were infrastructure-blocked.

## Output-Quality Details

Output-quality scoring is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
|---|---:|---:|---:|---:|---|
| Claude | 0 | not scored | 0 | 0 | none |
| Codex | 3 | 78.6% | 1 | 4 | `file-reference` 0.0%, `actionable-next-route` 0.0%, `evidence-linked` 66.7%, `scope-control` 100.0%, `roadmap-phase-structure` 100.0% |

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
|---|---:|---|
| Claude | 3 | agent runner budget exceeded |
| Codex | 0 | none |

The Claude result is infrastructure-blocked, not an evaluated skill failure. The Codex result is an evaluated benchmark failure.

## Raw Evidence

- Verify command: `pnpm verify --skill roadmap`
- Benchmark command: `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0`
- Claude report: `tests/benchmarks/runs/roadmap-claude-ceadee35/report.json`
- Codex report: `tests/benchmarks/runs/roadmap-codex-43f41fa9/report.json`

## Result

`roadmap` is eligible and verified successfully, but the deterministic benchmark did not pass. Claude was fully infrastructure-blocked by runner budget. Codex completed three evaluated runs with 0/3 hard assertion pass rate because each output missed the expected `$run` recommendation assertion, with a 78.6% output-quality score and critical failures in next-route/file-reference criteria.

Recommended next skill: `$session-triage roadmap benchmark failure`
