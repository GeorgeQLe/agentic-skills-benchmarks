# Triage: ship Benchmark Failure

**Date:** 2026-05-16
**Command:** `$session-triage ship benchmark failure`
**Target:** `ship` deterministic benchmark failure from `benchmark/test-ship-2026-05-16.md`
**Verdict:** verified benchmark harness false negative

## Evidence Sources

- Fresh benchmark report: `benchmark/test-ship-2026-05-16.md`
- Raw Claude run evidence: `tests/benchmarks/runs/ship-claude-d6121a8f/run-002.json`
- Raw Claude summary: `tests/benchmarks/runs/ship-claude-d6121a8f/report.json`
- Raw Codex summary: `tests/benchmarks/runs/ship-codex-a2685d9f/report.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Focused layer1 coverage: `tests/layer1/bench-setups.test.ts`
- Mirrored skill contracts: `global/codex/ship/SKILL.md`, `global/claude/ship/SKILL.md`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The user invoked `$session-triage ship benchmark failure` after `$benchmark-test-skill ship` reported a Claude output-quality critical failure in `ship-goal-specificity`.

## Verification Verdict

Verified. The benchmark report shows Claude passed 3/3 hard assertions with no infrastructure blocks, but scored 94.7% output quality with 1 critical `ship-goal-specificity` failure. Codex passed 3/3 hard assertions and scored 100.0%.

The failing Claude run `run-002.json` wrote a `ship-manifest.md` artifact with a bullet-style field:

- `- **User goal:** Wrap up the completed fixture step and prepare it for shipping.`
- Changed files: `tests/example.test.ts`, `tasks/todo.md`
- Tests run: fixture validation passed
- Next command: `/run`

That output is semantically aligned with the benchmark intent and the Claude `ship` route convention. The failure note was `missing User goal section text`, not a finding that the user goal was meta, vague, or disconnected from completed work.

## Timeline

1. `$benchmark-test-skill ship` ran verify and both-agent benchmarks.
2. Verify passed: layer1 PASS in 3.8s; layer2 SKIP because no target-specific layer2 tests matched.
3. Claude session `d6121a8f` completed 3/3 evaluated hard assertions with no infrastructure blocks.
4. Claude run 2 emitted a valid bullet-style ship manifest field for `User goal`.
5. The `ship-goal-specificity` quality criterion failed only that run because its extractor expects a heading-style `User goal` section.
6. The curated benchmark report correctly routed to `$session-triage ship benchmark failure`.

## Root Cause

The `ship-goal-specificity` benchmark quality criterion is too narrow. It extracts only heading-style sections:

```text
## User goal
...
## Changed files
```

It does not extract valid manifest fields formatted as bold bullets:

```text
- **User goal:** Wrap up the completed fixture step and prepare it for shipping.
```

The mirrored `ship` contracts require the manifest to include a `User goal` field, but they do not require heading-only Markdown. The same run passed `shipping-manifest-completeness`, which means the setup already recognized the bullet-style manifest as containing required manifest fields. The specificity criterion should use a field extractor consistent with the manifest-completeness criterion.

## Classification

Benchmark harness defect. This is not a `ship` skill contract gap, not a runner infrastructure issue, and not proven agent noncompliance.

## Responsible Contract Gap

Responsible file: `tests/layer4/setups/tier1-workflows.setup.ts`

Responsible criterion: `shipGoalSpecificityCriterion`

Related focused coverage: `tests/layer1/bench-setups.test.ts`

No mirrored `ship` skill contract change is justified by this evidence.

## Recommended Fix

Update the `ship-goal-specificity` evaluator to parse both heading-style and field-style manifest formats before applying the existing specificity checks.

Suggested behavior:

- Extract `User goal` from heading sections such as `## User goal`.
- Also extract `User goal` from bullet or bold field formats such as `- **User goal:** ...` and `**User goal:** ...`.
- Preserve the existing rejection of meta manifest goals such as `Record the completed fixture shipping summary...`.
- Keep the criterion critical because it catches a real output-quality issue when the field is present but frames the user goal as writing a manifest instead of shipping completed work.

Suggested next implementation target:

- `tests/layer4/setups/tier1-workflows.setup.ts`: broaden `shipGoalSpecificityCriterion` field extraction.
- `tests/layer1/bench-setups.test.ts`: add a regression case using the failing Claude bullet manifest and retain the current meta-goal rejection case.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests verify --skill ship
pnpm --dir tests bench --skill ship --agent claude --runs 1 --chunk-size 1 --pause 0
rg -n "ship-goal-specificity|User goal" tests/layer4/setups/tier1-workflows.setup.ts tests/layer1/bench-setups.test.ts
git diff --check
```

If the fix changes only benchmark harness code and not curated benchmark/review reports, Skills Showcase generated data should not need refresh.

## Confidence And Evidence Gaps

Confidence is high. The raw failed run shows a valid completed-work `User goal` field, and the failure note identifies extraction rather than semantic mismatch.

Evidence gaps are narrow: this triage did not inspect all historical `ship` benchmark runs because the current failure is directly explained by the fresh raw artifact and current rubric implementation. `$analyze-sessions` is not needed for recurrence analysis.

Recommended next skill: `$targeted-skill-builder ship benchmark goal field extraction`
