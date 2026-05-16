# Triage: ship Benchmark Failure

**Date:** 2026-05-16
**Workflow:** `$session-triage ship benchmark failure`
**Target:** `ship` benchmark quality failure from `benchmark/test-ship-2026-05-16.md`

## Evidence Sources

- `benchmark/test-ship-2026-05-16.md`
- `tests/benchmarks/runs/ship-claude-422763ac/run-000.json`
- `tests/benchmarks/runs/ship-claude-422763ac/run-001.json`
- `tests/benchmarks/runs/ship-claude-422763ac/run-002.json`
- `tests/benchmarks/runs/ship-claude-422763ac/report.json`
- `tests/benchmarks/runs/ship-codex-2dbe4b8c/report.json`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`
- `tests/harness/bench-quality.ts`
- `global/codex/ship/SKILL.md`
- `global/claude/ship/SKILL.md`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill ship` run reported a deterministic `ship` benchmark quality failure. The benchmark report shows one Claude critical failure on the `evidence-linked` criterion.

## Verification Verdict

**Verified, but classified as a benchmark rubric false negative rather than a `ship` skill contract failure.**

The benchmark report shows all hard assertions passed and no runs were infrastructure-blocked:

- Claude: 3/3 hard assertions passed; quality 92.9%; one critical failure.
- Codex: 3/3 hard assertions passed; quality 100.0%; no critical failures.

The failing Claude artifact still included the required evidence semantically:

```md
- **Changed files:**
  - `tests/example.test.ts` (modified)
  - `tasks/todo.md` (modified)
- **Tests run:** None executed in this session -- fixture review notes validation already passed for the completed step.
```

The quality result for Claude run 2 failed only because `evidence-linked` reported:

```text
missing required fact: Validation passed
```

That is a literal wording miss, not missing validation evidence. The artifact says "validation already passed" and separately passes the `validation-specificity` criterion.

## Timeline

1. `$benchmark-test-skill ship` resolved `ship` as the benchmark target and ran custom coverage through `tests/layer4/setups/tier1-workflows.setup.ts`.
2. Verify passed: layer1 PASS in 3.9s; layer2 skipped because no target-specific layer2 tests matched `ship`.
3. Both-agent benchmark completed with no infrastructure blocks.
4. Claude and Codex each passed 3/3 hard assertions, including manifest creation, required sections, deploy status, and runner-native next route.
5. Claude runs 0 and 1 passed all quality criteria.
6. Claude run 2 failed the critical `evidence-linked` criterion because it wrote "validation already passed" instead of the contiguous fixture phrase "Validation passed."
7. Codex passed all quality criteria in all three runs.

## Root Cause

The `ship` quality evaluator overfits the validation evidence fact to one exact contiguous phrase:

```ts
evidenceFacts: ["Validation passed", "tests/example.test.ts", "tasks/todo.md"]
```

The shared `requiredFacts` assertion does case-insensitive substring matching, but it still requires the exact word sequence. It accepts "Validation passed" and rejects "validation already passed", even though that wording preserves the same fixture fact and the manifest names both changed files.

This is not mirrored skill drift. Both `global/codex/ship/SKILL.md` and `global/claude/ship/SKILL.md` require validation evidence in a manifest; neither requires quoting the exact phrase from `tasks/todo.md`.

## Responsible Contract Gap

**Responsible surface:** benchmark harness quality coverage for `ship`.

Exact owner files:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

The `ship` skill contracts are adequate for this specific incident.

## Recommended Fix

Route to a targeted benchmark-harness update. Do not change the mirrored `ship` skill contracts for this incident.

Update `tests/layer4/setups/tier1-workflows.setup.ts` so the `ship` evidence-linked criterion accepts validation evidence with flexible wording. The smallest durable fix is to stop using the exact phrase `Validation passed` as a required fact and add a validation evidence pattern such as:

```ts
/validation\b[\s\S]{0,80}\bpassed/i
```

or otherwise split the validation evidence into a criterion that accepts equivalent wording like "validation already passed" while still rejecting manifests that omit validation evidence.

Add or update layer1 coverage in `tests/layer1/bench-setups.test.ts` to prove:

- A `ship` manifest with `validation already passed` passes `evidence-linked` or the replacement validation-evidence criterion.
- A manifest that names changed files but omits validation evidence still fails quality.

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

Expected result: hard assertions remain green, and semantically valid validation evidence such as "validation already passed" no longer triggers a critical `evidence-linked` failure.

## Confidence And Evidence Gaps

**Confidence:** high.

The failure reason is directly visible in `run-002.json`, and the generated artifact includes the fixture facts semantically. No broad `$analyze-sessions` recurrence scan is needed.

Evidence gap: this triage did not implement or run the proposed harness change because this workflow is analysis-focused. The proposed validation commands should be run by the targeted fix workflow.

## Result

The fresh benchmark failure is verified as a deterministic quality-rubric false negative caused by exact phrase matching on `Validation passed`. The durable fix belongs in the `ship` benchmark setup and layer1 coverage, not in the mirrored `ship` skill contracts.

Recommended next skill: `$targeted-skill-builder ship benchmark validation evidence`
