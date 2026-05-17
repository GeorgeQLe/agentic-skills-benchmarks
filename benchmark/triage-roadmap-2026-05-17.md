# Triage: roadmap Benchmark Failure

**Date:** 2026-05-17
**Workflow:** `$session-triage roadmap benchmark failure`
**Target:** `roadmap` benchmark verify failure in the current repository

## Evidence Sources

- Active conversation: `$benchmark-test-skill roadmap` run on 2026-05-17
- Benchmark report: `benchmark/test-roadmap-2026-05-17.md`
- Failing test: `tests/layer1/benchmark-results-matrix.test.ts`
- Generated matrix: `docs/benchmark-results-matrix.md`
- Matrix generator: `scripts/generate-skills-showcase-data.mjs`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

`$benchmark-test-skill roadmap` failed verification and routed to triage as `roadmap benchmark failure`.

## Verification Verdict

Verified, with scope narrowed: the verify failure is real, but it is not evidence of a `roadmap` skill behavior failure.

`benchmark/test-roadmap-2026-05-17.md` records `pnpm verify --skill roadmap` failing at layer1 in 3.9s before any benchmark runs. The failed assertion is in `tests/layer1/benchmark-results-matrix.test.ts`, which expects:

```text
tests/benchmarks/runs/ship-codex-a2685d9f/report.json
```

The current generated matrix instead correctly points at the fresher reviewed `ship` Codex run:

```text
tests/benchmarks/runs/ship-codex-898663d6/report.json
```

`scripts/generate-skills-showcase-data.mjs` generates the matrix from persisted benchmark reports, curated benchmark reports, and subjective review files. `docs/benchmark-results-matrix.md` currently lists `ship-codex-898663d6`, matching the fresh `ship` benchmark and review evidence.

## Timeline

1. User invoked `$benchmark-test-skill roadmap`.
2. The benchmark workflow confirmed `roadmap` has custom coverage via `tests/layer4/setups/tier1-workflows.setup.ts`.
3. `pnpm verify --skill roadmap` ran the layer1 gate.
4. Layer1 failed in `benchmark-results-matrix.test.ts` because the test still pins the older `ship-codex-a2685d9f` raw report path.
5. The benchmark step was correctly skipped because verify failed.
6. `benchmark/test-roadmap-2026-05-17.md` recorded the verification-blocked run and routed to this triage.

## Root Cause

The layer1 matrix regression test uses a brittle fixture expectation for a generated, latest-run field. The generator is designed to select the latest evaluated report for each skill/agent pair; therefore hard-coding one historical latest report path makes the test stale whenever a newer benchmark supersedes it.

This is a benchmark harness regression-test defect, not a `roadmap` contract defect and not agent noncompliance.

## Responsible Contract Gap

Responsible surface: `tests/layer1/benchmark-results-matrix.test.ts`.

The test should validate the durable contract of the generated matrix:

- matrix is generated from the showcase-data generator
- coverage registry and benchmark results remain separated
- the `ship` Codex row exists
- the row points at a `tests/benchmarks/runs/ship-codex-*/report.json` report
- the row preserves reviewed status and key metrics

It should not pin the exact latest `ship` session id unless the test itself creates or controls that fixture.

## Recommended Fix

Update `tests/layer1/benchmark-results-matrix.test.ts` to replace the exact `ship-codex-a2685d9f` expectation with a durable row matcher. Proposed behavior:

```ts
expect(matrix).toMatch(
  /\| `ship` \| Codex \| `tests\/benchmarks\/runs\/ship-codex-[^/]+\/report\.json` \| 3 \| 100% \| 100\.0% \| `benchmark\/review-ship-2026-05-16\.md` \| graded \|/,
);
```

Keep the incomplete `affected` assertion exact because it is currently testing a specific known blocked fixture, not a moving latest evaluated report.

Do not change the `roadmap` skill contracts based on this evidence.

## Validation Plan

1. Run the focused layer1 test:

```bash
pnpm --dir tests exec vitest run --project layer1 benchmark-results-matrix
```

2. Run the original blocked verify command:

```bash
pnpm --dir tests verify --skill roadmap
```

3. Run freshness and whitespace checks:

```bash
scripts/validate-skills-showcase-data.sh
git diff --check
```

4. After the fix, rerun the deterministic benchmark workflow:

```bash
$benchmark-test-skill roadmap
```

## Confidence And Evidence Gaps

Confidence: high. The failing assertion, generated matrix row, and fresh `ship` report/review evidence all agree on the stale expected path.

Evidence gaps: none requiring `$analyze-sessions`. This is a narrow harness-maintenance issue already visible in the current repo state.

Recommended next skill: `$targeted-skill-builder benchmark-results-matrix stale latest-run assertion`
