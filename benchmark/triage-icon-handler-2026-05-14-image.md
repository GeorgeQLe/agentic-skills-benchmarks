# Triage: icon-handler Benchmark Image Failure

**Date:** 2026-05-14  
**Command:** `$session-triage icon-handler benchmark failure`  
**Repository:** `/Users/georgele/projects/tools/agentic-skills`

## Target

- Scope: latest `$benchmark-test-skill icon-handler` failure from `benchmark/test-icon-handler-2026-05-14.md`.
- Skill under test: `global/claude/icon-handler/SKILL.md` and `global/codex/icon-handler/SKILL.md`.
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`.
- Benchmark runner classification: `tests/harness/bench-runner.ts`.
- Persisted failed run: `tests/benchmarks/runs/icon-handler-claude-86ed23d1/run-002.json`.
- Adjacent passing evidence: `tests/benchmarks/runs/icon-handler-claude-86ed23d1/run-000.json` and Codex session `tests/benchmarks/runs/icon-handler-codex-35de8ee4/`.
- Prior related triage: `benchmark/triage-icon-handler-2026-05-13.md` and `benchmark/triage-icon-handler-2026-05-14.md`.
- Relevant lessons: benchmark infrastructure blocks must be separated from evaluated skill failures in `tasks/lessons.md`.

## User-Identified Issue

The latest `icon-handler` benchmark failed after the route-clarity fix and needs focused triage.

## Verification Verdict

Verified.

The benchmark report shows verify passed, Codex passed 3/3 evaluated hard assertions, and Claude passed 2/3. Claude run #2 exited with code 1 before producing `icon-audit.md`:

```text
API Error: 400 Could not process image
```

The failed run's file list contains the current fixture files, including `calc-mascot-icon.svg`, `src/app/favicon.ico`, `src/app/icon.png`, and `src/app/layout.tsx`. The run did not create `icon-audit.md`, so the skill workflow did not reach the audit-report step. The harness did not classify this error as infrastructure-blocked, so it counted the run as an evaluated assertion failure.

This differs from the earlier route-clarity failure in `benchmark/triage-icon-handler-2026-05-14.md`: the current fixture already uses `calc-mascot-icon.svg`, layer1 asserts no `calc-mascot-icon.png` is created, and Codex passed all hard assertions with the current fixture.

## Timeline

1. `$benchmark-test-skill icon-handler` ran after the route-clarity benchmark fix.
2. `pnpm verify --skill icon-handler` passed layer1 in 12.3s; layer2 skipped because no target-specific tests matched.
3. Claude run #0 completed normally, created `icon-audit.md`, identified the Next App Router icon surfaces, and recommended `/icon-handler fix calc-mascot-icon.svg`.
4. Claude run #2 exited after 16.2s with `API Error: 400 Could not process image`, created no audit artifact, and failed both `Agent command exited successfully` and `icon-audit.md created in project root`.
5. Codex session `35de8ee4` passed 3/3 hard assertions with no blocked runs.
6. The report treated Claude run #2 as an evaluated skill failure because `classifyInfrastructureBlock` currently recognizes rate limits, quota errors, and budget exhaustion, but not agent-runner image-processing API errors.

## Root Cause

The verified root cause is a benchmark harness classification gap for a runner/API transport failure.

The mirrored `icon-handler` skill contracts are adequate for the behavior under test. They require audit-first execution, local inspection, approval before writes, and runner-specific fix routes. The benchmark fixture also now avoids the previous invalid PNG placeholder by using `calc-mascot-icon.svg` and by instructing the runner not to call external image generation or image-analysis services.

The failed run did not ignore a skill instruction or produce a bad audit. It failed before the skill workflow executed. Because this exact error is emitted by the Claude runner/API layer, it should be reported as an infrastructure-blocked run, not as an evaluated skill failure. Counting it against hard assertion pass rate makes the benchmark result misleading: the skill was not evaluated in that run.

## Responsible Contract Gap

Responsible gap: benchmark runner infrastructure classification in `tests/harness/bench-runner.ts`, with regression coverage in `tests/layer1/runner.test.ts`.

No change is justified in:

- `global/claude/icon-handler/SKILL.md`
- `global/codex/icon-handler/SKILL.md`
- `tests/layer4/setups/tier23-global-workflows.setup.ts`

The current fixture and skill contracts are clear enough for evaluated runs. The issue is how the harness classifies a non-evaluating runner/API image-processing failure.

## Recommended Fix

Use `$targeted-skill-builder icon-handler benchmark image-error classification` to update the benchmark harness narrowly.

Concrete change:

1. In `tests/harness/bench-runner.ts`, extend `classifyInfrastructureBlock` so non-zero runner output containing `could not process image` or `api error: 400 could not process image` returns an infrastructure reason such as `agent runner image processing error`.
2. In `tests/layer1/runner.test.ts`, add a regression proving a non-zero run with `API Error: 400 Could not process image` is marked `infrastructureBlocked: true`, has assertions skipped, and does not count as a passed evaluated run.
3. Keep the existing rate-limit and budget classifications unchanged.

Do not route this to a skill-contract update unless a future evaluated run creates `icon-audit.md` and violates the `icon-handler` contract.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 runner
pnpm --dir tests verify --skill icon-handler
pnpm --dir tests bench --skill icon-handler --agent claude --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Expected validation evidence:

- Layer1 proves image-processing API errors are infrastructure-blocked.
- Verify still passes for `icon-handler`.
- A fresh Claude smoke benchmark either evaluates normally or reports the same image-processing error as blocked rather than as an assertion failure.
- No mirrored `icon-handler` skill contract changes are needed.

## Confidence And Evidence Gaps

Confidence: high that the latest failed run is not an evaluated skill failure, because the only substantive output is an API-level image-processing error and no audit artifact was produced.

Evidence gap: the raw Claude CLI output does not identify which fixture file triggered image processing. The current evidence is still sufficient for harness classification because the run failed before skill execution. A broader `$analyze-sessions` pass is not needed.

Recommended next skill: `$targeted-skill-builder icon-handler benchmark image-error classification`
