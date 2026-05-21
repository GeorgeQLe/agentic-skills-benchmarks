# Benchmark Report: desk-flip

**Date**: 2026-05-20
**Skill**: desk-flip
**Coverage**: custom (tier23-global-workflows.setup.ts)

## Verify

| Layer | Status | Time |
|-------|--------|------|
| layer1 | PASS | 3.0s |
| layer2 | SKIP | -- |

## Benchmark Results

### Claude (session 6d95553a)

| Metric | Value |
|--------|-------|
| Evaluated pass rate | **100.0%** (3/3) |
| Wilson 95% CI | [43.8%, 100.0%] |
| Infrastructure blocked | 0 |
| Latency p50 / p95 / p99 | 47.4s / 51.8s / 52.2s |
| Cost per run | $0.25 |
| Total cost | $0.75 |
| Mean pairwise similarity | 0.826 |
| Outliers | 0 |

**Output quality score: 84.1%**

| Criterion | Score |
|-----------|-------|
| workflow-fixture-facts | 100.0% |
| workflow-next-route | 100.0% |
| workflow-domain-specificity | 100.0% |
| workflow-actionability | 25.0% |
| workflow-artifact-reference | 0.0% |

Threshold failures: 0 | Critical failures: 0

### Codex (session 2b6d7e15)

| Metric | Value |
|--------|-------|
| Evaluated pass rate | **100.0%** (3/3) |
| Wilson 95% CI | [43.8%, 100.0%] |
| Infrastructure blocked | 0 |
| Latency p50 / p95 / p99 | 62.3s / 64.7s / 64.9s |
| Cost per run | $0.25 |
| Total cost | $0.75 |
| Mean pairwise similarity | 0.899 |
| Outliers | 0 |

**Output quality score: 88.6%**

| Criterion | Score |
|-----------|-------|
| workflow-fixture-facts | 100.0% |
| workflow-next-route | 100.0% |
| workflow-domain-specificity | 100.0% |
| workflow-actionability | 75.0% |
| workflow-artifact-reference | 0.0% |

Threshold failures: 0 | Critical failures: 0

## Failed Assertions

None.

## Infrastructure Blocked Runs

None (in final run).

## Raw Session Paths

- Claude: `tests/benchmarks/runs/desk-flip-claude-6d95553a/`
- Codex: `tests/benchmarks/runs/desk-flip-codex-2b6d7e15/`

## Notes

- The `workflow-artifact-reference` criterion scores 0% for both agents because the generated `desk-flip-report.md` does not contain a self-referencing filename string. The file is correctly created and referenced in agent stdout. This is a setup calibration gap, not a skill defect.
- The benchmark setup was added in this session — the desk-flip skill was listed as `coverage=custom` in the coverage matrix but had no entry in `GLOBAL_WORKFLOW_SETUPS`, causing a `perRunBudgetUsd` TypeError on the initial run. The setup entry was created and the route convention was fixed (single `/bootstrap-repo` route since no Codex-specific skill contract exists).
- Layer2 has no target-specific tests for desk-flip.

**Next work:** Calibrate `workflow-artifact-reference` criterion or add `artifactReferencePattern` to the desk-flip setup definition to match stdout references.
**Recommended next command:** /benchmark-agent-review desk-flip
