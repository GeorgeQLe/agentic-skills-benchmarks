# Triage: roadmap Benchmark Quality Failure

**Date:** 2026-05-17
**Workflow:** `$session-triage roadmap benchmark failure`
**Target:** `roadmap`
**Fresh benchmark report:** `benchmark/test-roadmap-2026-05-17.md`
**Raw evidence:** `tests/benchmarks/runs/roadmap-codex-00c1a8a4/`, `tests/benchmarks/runs/roadmap-claude-578a7980/`

## User-Identified Issue

The fresh `$benchmark-test-skill roadmap` rerun is not clean because the Codex output-quality summary recorded one critical `evidence-linked` failure despite 100.0% hard assertion pass rate.

## Verification Verdict

**Verified benchmark quality failure; not verified as a `roadmap` skill contract failure.**

Evidence:

- `benchmark/test-roadmap-2026-05-17.md` reports `roadmap` verify passed and both agents passed evaluated hard assertions.
- Codex session `roadmap-codex-00c1a8a4` completed 3 evaluated runs with 3/3 hard assertion pass rate, 92.9% output-quality score, and 1 critical `evidence-linked` failure.
- The critical failure appears only in Codex run 0. `run-000.json` reports `missing required fact: benchmark coverage reporting`.
- Codex run 0 created `tasks/roadmap.md`, included phases, acceptance criteria, verification, and the exact `$plan-phase 1` next command.
- The generated roadmap used valid equivalent wording such as `Benchmark Coverage Model`, `benchmark coverage data model`, `benchmark coverage metadata`, `CLI Status Output`, and `Validation Gate`, but did not include the exact phrase `benchmark coverage reporting`.
- Claude's evaluated run and Codex runs 1 and 2 passed the same criterion, so this is not a systematic agent inability to satisfy the roadmap contract.

## Timeline

1. `$benchmark-test-skill roadmap` ran after the route-alignment fixture update.
2. `pnpm verify --skill roadmap` passed layer1 and skipped layer2 because no target-specific layer2 tests exist.
3. The both-agent benchmark ran with custom Tier 1 coverage from `tests/layer4/setups/tier1-workflows.setup.ts`.
4. Claude had 1 evaluated pass and 2 runner-budget infrastructure blocks.
5. Codex had 3 evaluated hard-assertion passes.
6. Codex run 0 failed the critical output-quality `evidence-linked` criterion because the rubric required the exact phrase `benchmark coverage reporting`.
7. The curated benchmark report routed the result to `$session-triage roadmap benchmark failure`.

## Root Cause

The Tier 1 roadmap benchmark quality rubric is too literal for the roadmap fixture.

The setup currently defines roadmap evidence facts as:

```ts
evidenceFacts: ["benchmark coverage reporting", "CLI status output"]
```

`requiredFactCoverageCriterion` delegates to `qualityAssertions.requiredFacts`, which checks folded substring inclusion. It does not accept semantic equivalents or partial concept coverage. In the failing run, the generated roadmap preserved the fixture's meaning and split the feature into benchmark coverage model, CLI status output, and validation phases, but it did not reproduce the exact phrase `benchmark coverage reporting`.

That makes the quality failure a benchmark harness false negative. The roadmap contract does not require verbatim phrase retention, and the hard assertions already verified the essential behavior: roadmap file creation, phase structure, acceptance criteria, verification language, benchmark/CLI topic coverage, and `$plan-phase 1` routing.

## Responsible Contract Gap

**Benchmark harness gap:** `tests/layer4/setups/tier1-workflows.setup.ts`.

No mirrored `roadmap` skill contract gap is verified. The Codex and Claude roadmap contracts both allow synthesized phase wording and do not require exact source-spec phrase reuse.

## Recommended Fix

Route to a narrow benchmark-rubric update:

**Recommended next skill:** `$targeted-skill-builder roadmap benchmark evidence rubric`

Proposed implementation:

- Update the `roadmap` fixture in `tests/layer4/setups/tier1-workflows.setup.ts`.
- Replace the exact evidence fact `benchmark coverage reporting` with a less brittle concept marker such as `benchmark coverage`, while preserving `CLI status output`.
- Optionally add a focused layer1 regression fixture or assertion proving roadmap output that says `benchmark coverage data model` satisfies the evidence-linked quality criterion.
- Keep the hard route expectation as `$plan-phase 1`; that route mismatch was already fixed and should remain covered.

Proposed wording for the rubric intent:

> For roadmap outputs, evidence-linked quality should require the generated roadmap to preserve the fixture's benchmark coverage and CLI status concepts, not the exact source-spec phrase `benchmark coverage reporting`.

## Validation Plan

After the targeted update:

1. `pnpm --dir tests exec vitest run --project layer1 bench-setups`
2. `pnpm --dir tests verify --skill roadmap`
3. `pnpm --dir tests bench --skill roadmap --agent codex --runs 1 --chunk-size 1 --pause 0`
4. `pnpm --dir tests bench:coverage`
5. `git diff --check`
6. Full rerun when ready: `$benchmark-test-skill roadmap`

If curated benchmark evidence changes during validation, also run:

1. `node scripts/generate-skills-showcase-data.mjs`
2. `node scripts/generate-skills-showcase-github-data.mjs`
3. `scripts/validate-skills-showcase-data.sh`

## Confidence And Evidence Gaps

**Confidence:** high.

The failed criterion names the missing exact phrase, and the retained generated artifact shows the underlying benchmark coverage concept was present. The only residual gap is that the triage did not execute the proposed fixture change; that belongs to the targeted builder step.

No `$analyze-sessions` recurrence analysis is needed for this narrow benchmark false negative.

Recommended next skill: `$targeted-skill-builder roadmap benchmark evidence rubric`
