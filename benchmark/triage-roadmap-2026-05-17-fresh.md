# Triage: roadmap Benchmark Failure Fresh Rerun

**Date:** 2026-05-17
**Workflow:** `$session-triage roadmap benchmark failure`
**Target:** `$benchmark-test-skill roadmap` fresh rerun
**Primary report:** `benchmark/test-roadmap-2026-05-17.md`

## Target And Evidence Sources

- Fresh benchmark report: `benchmark/test-roadmap-2026-05-17.md`
- Raw reports: `tests/benchmarks/runs/roadmap-claude-ceadee35/report.json`, `tests/benchmarks/runs/roadmap-codex-43f41fa9/report.json`
- Raw Codex runs: `tests/benchmarks/runs/roadmap-codex-43f41fa9/run-000.json`, `run-001.json`, `run-002.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Routing helper: `tests/layer4/setup-helpers/routing.ts`
- Quality helper: `tests/layer4/setup-helpers/quality.ts`
- Skill contracts: `global/codex/roadmap/SKILL.md`, `global/claude/roadmap/SKILL.md`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The fresh `roadmap` benchmark failed after verify passed, so the benchmark failure needs triage before more benchmark/result-coverage work continues.

## Verification Verdict

**Verified, but not as a `roadmap` skill behavior failure.**

The fresh report shows:

- Verify passed: layer1 PASS in 3.6s; layer2 SKIP because no target-specific layer2 tests matched.
- Claude was infrastructure-blocked only: 3/3 runs blocked with `agent runner budget exceeded`, 0 evaluated runs.
- Codex produced 3 evaluated runs and every run failed the same hard assertion: `Output recommends $run`.

The raw Codex artifacts show each generated `tasks/roadmap.md` contains phases, acceptance criteria, verification, parallelization notes, and a final `## Next Command` block with:

```text
$plan-phase 1
```

That route is consistent with the roadmap skill contract for a newly created roadmap. The Codex contract says that after writing `tasks/roadmap.md`, the workflow should seed Phase 1 with `$plan-phase 1`, and it also says the final next command must be derived from project state rather than agent mode. The Claude contract mirrors this behavior with `/plan-phase 1`.

## Timeline

1. `$benchmark-test-skill roadmap` reran after the stale benchmark-results matrix assertion was fixed.
2. `pnpm verify --skill roadmap` passed layer1; layer2 skipped because there are no target-specific layer2 tests.
3. `pnpm bench --skill roadmap --agent both --runs 3 --chunk-size 3 --pause 0` launched live runner sessions.
4. Claude returned no evaluated skill evidence because all three runs were infrastructure-blocked by runner budget.
5. Codex generated valid-looking roadmap artifacts in all three evaluated runs and routed the next command to `$plan-phase 1`.
6. The benchmark setup failed all Codex runs because `tier1-workflows.setup.ts` expects `recommendedRoute: "$run"` for the `roadmap` fixture.

## Root Cause

The responsible issue is a benchmark harness setup defect: the `roadmap` fixture is internally inconsistent.

`tests/layer4/setups/tier1-workflows.setup.ts` asks the runner to:

```text
Convert specs/feature.md into tasks/roadmap.md with phases, acceptance criteria, verification, and Next command.
```

It asserts only that `tasks/roadmap.md` is created. It does not require `tasks/todo.md`, it does not require the Phase 1 plan to be generated, and it does not model the full roadmap workflow after the `$plan-phase 1` seed. Despite that, the fixture hard-codes:

```ts
nextRoute: "$run",
recommendedRoute: "$run",
```

For a roadmap-only fixture, `$plan-phase 1` is the correct next route. `$run` becomes appropriate only after the benchmark prompt and assertions require the runner to perform the explicit Phase 1 seed and produce `tasks/todo.md`.

There is a second harness-quality mismatch: the setup evaluates quality against the generated `tasks/roadmap.md` artifact while requiring the artifact body to mention `tasks/roadmap.md` as a concrete file reference. The raw run metadata already proves the artifact path, and the user-facing stdout references the created file; requiring the roadmap document to name itself is not part of the roadmap skill contract.

## Responsible Contract Gap

**Benchmark harness coverage:** `tests/layer4/setups/tier1-workflows.setup.ts`

No `global/codex/roadmap/SKILL.md` change is justified by this evidence. The Codex skill contract already points new-roadmap seeding to `$plan-phase 1`; the evaluated Codex outputs followed that route. The Claude contract mirrors the same concept with `/plan-phase 1`, but the fresh Claude runs were infrastructure-blocked and cannot be used to evaluate Claude behavior.

## Recommended Fix

Use `$targeted-skill-builder roadmap benchmark route alignment` to update the custom benchmark coverage with one of two coherent fixture designs:

1. **Roadmap-only fixture, smaller fix:** Keep the current prompt and `outputPath: "tasks/roadmap.md"`, but change the expected Codex route from `$run` to `$plan-phase 1`. Update the quality route to `$plan-phase 1` and remove or adjust the self-referential `tasks/roadmap.md` quality file-reference requirement.
2. **Full workflow fixture, broader fix:** Change the prompt and assertions so the runner must create both `tasks/roadmap.md` and `tasks/todo.md` by seeding Phase 1, then expect `$run` as the final route.

The smaller fix is preferable because it matches the current benchmark prompt and limits blast radius.

Proposed concrete change for the smaller fix:

- In `tests/layer4/setups/tier1-workflows.setup.ts`, for the `roadmap` definition:
  - change `nextRoute: "$run"` to `nextRoute: "$plan-phase 1"`
  - change `recommendedRoute: "$run"` to `recommendedRoute: "$plan-phase 1"`
  - either remove `tasks/roadmap.md` from `concreteFiles` for this quality evaluator or replace that criterion with a check on raw artifact paths outside the document body.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests verify --skill roadmap
pnpm --dir tests bench --skill roadmap --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Expected proof:

- Layer1 setup tests still pass.
- `pnpm verify --skill roadmap` still passes layer1 and skips layer2.
- A Codex smoke benchmark that generates `## Next Command` with `$plan-phase 1` passes the route assertion.
- Quality no longer fails solely because the generated roadmap does not mention its own output path.

## Confidence And Evidence Gaps

Confidence is high for the Codex classification because all three evaluated runs produced the same route and the generated artifacts align with the written Codex roadmap contract. Confidence is also high that Claude should not be classified because every Claude run was infrastructure-blocked.

Evidence gap: this triage did not run a fresh Claude evaluated benchmark because the latest Claude session exhausted runner budget. No broad `$analyze-sessions` scan is needed; this is a narrow fixture-contract mismatch.

Recommended next skill: `$targeted-skill-builder roadmap benchmark route alignment`
