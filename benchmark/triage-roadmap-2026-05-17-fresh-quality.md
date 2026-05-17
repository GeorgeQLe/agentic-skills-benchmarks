# Triage: roadmap Fresh Benchmark Quality Failure

**Date:** 2026-05-17
**Workflow:** `$session-triage roadmap benchmark failure`
**Target:** `roadmap`
**Fresh benchmark report:** `benchmark/test-roadmap-2026-05-17.md`
**Raw evidence:** `tests/benchmarks/runs/roadmap-codex-3f01cb21/`, `tests/benchmarks/runs/roadmap-claude-511af1ee/`

## User-Identified Issue

The latest `$benchmark-test-skill roadmap` rerun is still not clean. Codex passed hard assertions but the output-quality summary recorded one critical `evidence-linked` failure, and Claude produced no evaluated evidence because all three runs were infrastructure-blocked by runner budget.

## Verification Verdict

**Verified benchmark quality failure; not verified as a `roadmap` skill contract failure.**

Evidence:

- `benchmark/test-roadmap-2026-05-17.md` reports `roadmap` verify passed, Claude had 3 infrastructure-blocked runs, and Codex completed 3 evaluated runs with 3/3 hard assertions passed.
- Codex session `roadmap-codex-3f01cb21` reports 100.0% hard assertion pass rate, 92.9% output quality, and 1 critical `evidence-linked` failure.
- The only failing evaluated run is `run-000.json`; its `qualityResult` notes `missing required fact: CLI status output`.
- `run-000.json` created `tasks/roadmap.md`, named `specs/feature.md`, included phases, acceptance criteria, verification, benchmark coverage, validation, and the exact `$plan-phase 1` next command.
- The generated roadmap preserved the CLI-status concept with wording such as `Add a CLI command that reads benchmark coverage data and prints status output`, but it did not include the exact phrase `CLI status output`.
- Codex `run-001.json` and `run-002.json` passed `evidence-linked` because they used exact or closer wording, including `CLI Status Output` or `CLI status output`.

## Timeline

1. `$benchmark-test-skill roadmap` ran against the current harness.
2. `pnpm verify --skill roadmap` passed layer1 and skipped layer2 because no target-specific layer2 tests matched.
3. The both-agent benchmark ran with custom coverage from `tests/layer4/setups/tier1-workflows.setup.ts`.
4. Claude session `roadmap-claude-511af1ee` was fully infrastructure-blocked by `agent runner budget exceeded`.
5. Codex session `roadmap-codex-3f01cb21` completed 3 evaluated runs and passed all hard assertions.
6. Codex run 0 failed the critical `evidence-linked` quality criterion because the rubric required the exact phrase `CLI status output`.
7. The curated benchmark report routed the result to `$session-triage roadmap benchmark failure`.

## Root Cause

The Tier 1 roadmap benchmark quality rubric is still too literal for the roadmap fixture.

The previous roadmap quality triage correctly relaxed the benchmark coverage fact from `benchmark coverage reporting` to `benchmark coverage`. The current setup now uses:

```ts
evidenceFacts: ["benchmark coverage", "CLI status output"]
```

That fixed the benchmark-coverage wording false negative, but the remaining `CLI status output` fact is still checked by folded substring inclusion through the shared required-facts quality helper. In the fresh failing run, the roadmap preserved the fixture meaning with `CLI command` plus `status output`, but the words were not adjacent as the exact required fact.

This is a benchmark harness false negative. The mirrored `roadmap` contracts require roadmap synthesis, phase structure, validation planning, and next routing; they do not require verbatim source-spec phrase retention. Hard assertions already verified the essential behavior.

## Responsible Contract Gap

**Benchmark harness gap:** `tests/layer4/setups/tier1-workflows.setup.ts` and focused coverage in `tests/layer1/bench-setups.test.ts`.

No mirrored `roadmap` skill contract gap is verified. The Codex and Claude skill contracts allow synthesized roadmap wording.

## Recommended Fix

Route to a narrow benchmark-rubric update:

**Recommended next skill:** `$targeted-skill-builder roadmap benchmark CLI evidence rubric`

Proposed implementation:

- Update the `roadmap` quality fixture in `tests/layer4/setups/tier1-workflows.setup.ts` so `evidence-linked` requires preservation of the CLI/status-output concept without requiring the exact contiguous phrase `CLI status output`.
- Keep `benchmark coverage` as a required concept.
- Add focused layer1 coverage proving that output containing `Add a CLI command that reads benchmark coverage data and prints status output` passes `evidence-linked`.
- Preserve the existing negative case so generic `status output` without benchmark coverage or CLI context still fails.
- Keep the hard next-route expectation as `$plan-phase 1`.

Proposed rubric intent:

> For roadmap outputs, evidence-linked quality should require the generated roadmap to preserve the benchmark coverage and CLI status-output concepts from the fixture, without requiring exact source-spec phrase reuse.

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

The failing run names the exact missing fact, and the retained artifact shows the underlying CLI/status-output concept was present. Claude produced no evaluated evidence in the fresh run because of runner budget, but that is an infrastructure block and not evidence of a roadmap contract defect.

No `$analyze-sessions` recurrence analysis is needed for this narrow benchmark false negative.

Recommended next skill: `$targeted-skill-builder roadmap benchmark CLI evidence rubric`
