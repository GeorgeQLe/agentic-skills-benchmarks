# Triage: ship Benchmark Failure

**Date:** 2026-05-16
**Workflow:** `$session-triage ship benchmark failure`
**Target:** `ship` benchmark quality failure from `benchmark/test-ship-2026-05-16.md`

## Evidence Sources

- `benchmark/test-ship-2026-05-16.md`
- `tests/benchmarks/runs/ship-claude-a11036e8/run-000.json`
- `tests/benchmarks/runs/ship-claude-a11036e8/report.json`
- `tests/benchmarks/runs/ship-codex-7e3f4bab/run-000.json`
- `tests/benchmarks/runs/ship-codex-7e3f4bab/report.json`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/harness/bench-quality.ts`
- `global/codex/ship/SKILL.md`
- `global/claude/ship/SKILL.md`
- `docs/quality-gate-contract.md`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill ship` run reported a `ship` benchmark failure because both Claude and Codex had deterministic output-quality critical failures on `evidence-linked`.

## Verification Verdict

**Verified, but classified as a benchmark harness defect rather than a `ship` skill contract failure.**

The benchmark report shows both runners passed all hard assertions and had no infrastructure-blocked runs:

- Claude: 3/3 evaluated hard assertions passed; quality 78.6%; 3 critical failures.
- Codex: 3/3 evaluated hard assertions passed; quality 78.6%; 3 critical failures.

The critical quality failure is repeatable across the evaluated artifacts. The quality criterion requires exact fixture facts `M tests/example.test.ts` and `M tasks/todo.md`, but generated manifests name the changed files as `tests/example.test.ts` and `tasks/todo.md` without the `M ` status prefix.

Example Codex artifact:

```md
## Changed files

- `tests/example.test.ts`
- `tasks/todo.md`
```

Example Claude artifact:

```md
## Changed files
- `tests/example.test.ts`
- `tasks/todo.md`
```

The mirrored `ship` contracts require an exact changed-file boundary, but do not require preserving `git diff --stat` or `git status --short` prefixes inside the manifest. `docs/quality-gate-contract.md` likewise says the manifest must include "Exact changed files in the shipping boundary," not raw status markers.

## Timeline

1. `$benchmark-test-skill ship` resolved `ship` as the benchmark target and ran custom coverage through `tests/layer4/setups/tier1-workflows.setup.ts`.
2. Verify passed: layer1 PASS in 4.5s; layer2 skipped because no target-specific layer2 tests matched.
3. Both-agent benchmark completed with no infrastructure blocks.
4. All hard assertions passed for both agents, including file creation, required manifest sections, deploy status, and runner-native next route.
5. The additional deterministic quality rubric failed critically for both agents on `evidence-linked`.
6. Raw run evidence shows the agents used the fixture facts semantically but normalized the status-prefixed diff summary into clean file names.

## Root Cause

The `ship` setup's `evidenceFacts` overfits to raw diff-summary line formatting:

```ts
evidenceFacts: ["Validation passed", "M tests/example.test.ts", "M tasks/todo.md"]
```

The shared `requiredFacts` assertion performs literal folded substring matching. Because `M tests/example.test.ts` is not present verbatim, artifacts that correctly cite `tests/example.test.ts` still fail the critical `evidence-linked` criterion.

This is not runner infrastructure and not mirrored skill drift. It is not one-off agent noncompliance either: all six evaluated artifacts included the changed file names and validation evidence, and the `file-reference` and `validation-specificity` criteria passed.

## Responsible Contract Gap

**Responsible surface:** benchmark harness coverage for `ship`.

Exact owner files:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

The mirrored skill contracts are adequate for this specific issue:

- `global/codex/ship/SKILL.md`
- `global/claude/ship/SKILL.md`

## Recommended Fix

Route to a targeted benchmark-harness update. Do not change the `ship` skill contracts for this incident.

Update `tests/layer4/setups/tier1-workflows.setup.ts` so the `ship` quality evaluator treats changed-file evidence as file names, not raw git-status lines. The smallest fix is to change:

```ts
evidenceFacts: ["Validation passed", "M tests/example.test.ts", "M tasks/todo.md"]
```

to:

```ts
evidenceFacts: ["Validation passed", "tests/example.test.ts", "tasks/todo.md"]
```

Keep `concreteFiles: ["tests/example.test.ts", "tasks/todo.md"]` as an independent file-reference check.

Add layer1 regression coverage proving a valid `ship` manifest that names clean changed-file paths passes the quality evaluator without requiring `M ` prefixes. If practical, also add a negative case that still fails when the changed files are omitted entirely.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests verify --skill ship
pnpm --dir tests bench --skill ship --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Optional stronger check after the targeted fix:

```bash
pnpm --dir tests bench --skill ship --agent both --runs 3 --chunk-size 3 --pause 0
```

Expected result: hard assertions remain green and the `evidence-linked` criterion no longer fails when the artifact names `tests/example.test.ts`, `tasks/todo.md`, and `Validation passed`.

## Confidence And Evidence Gaps

**Confidence:** high.

The failure reason is directly visible in every raw run's `qualityResult.notes`, and the generated artifacts show the expected semantic evidence. No broad `$analyze-sessions` history scan is needed.

Evidence gap: this triage did not run a modified benchmark setup because this workflow is analysis-only. The proposed validation commands should be run by the targeted fix workflow.

## Result

The fresh benchmark failure is verified as a deterministic quality-rubric false negative caused by exact matching on raw `M ` diff-status prefixes. The durable fix belongs in the `ship` benchmark setup and layer1 coverage, not in the mirrored `ship` skill contracts.

Recommended next skill: `$targeted-skill-builder ship benchmark evidence-linked file status prefix`
