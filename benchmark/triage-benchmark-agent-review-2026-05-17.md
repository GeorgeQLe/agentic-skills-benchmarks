# Triage: benchmark-agent-review Benchmark Failure (2026-05-17)

## Target

- Scope: `$session-triage benchmark-agent-review benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under failure: `benchmark-agent-review`
- Source benchmark report: `benchmark/test-benchmark-agent-review-2026-05-17.md`
- Raw runs:
  - `tests/benchmarks/runs/benchmark-agent-review-claude-a4f7218d/`
  - `tests/benchmarks/runs/benchmark-agent-review-codex-f6a6014a/`
- Contracts inspected:
  - `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`
  - `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`
- Harness inspected:
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The user requested triage for the deterministic benchmark failure reported by `$benchmark-test-skill benchmark-agent-review`.

## Verification Verdict

Verified.

The benchmark completed with evaluated runs and no infrastructure blocks. The hard assertion failure is real: Claude failed 3/3 and Codex failed 1/3 on `Output recommends $targeted-skill-builder`.

The failure is not a runner-capacity issue. It is also not enough evidence to conclude that the `benchmark-agent-review` skill contract itself is broadly wrong. The stronger verified issue is a benchmark setup mismatch:

- The pack workflow definition for `benchmark-agent-review` uses `nextRoute: "$targeted-skill-builder"`, which is Codex-style only.
- `createPackWorkflowSetup` only adds route guidance to the prompt when `nextRoutes` is present. Because this setup uses `nextRoute`, the prompt did not tell either runner the expected concrete route.
- The mirrored skill contracts already include remediation-ready targeted-skill-builder handoffs, with Codex using `$targeted-skill-builder ...` and Claude using `/targeted-skill-builder ...`.
- The benchmark setup therefore fails Claude against a Codex route convention and leaves both runners underprompted on the exact expected remediation route.

## Timeline

1. `$benchmark-test-skill benchmark-agent-review` ran the pack workflow setup.
2. Eligibility and verify passed; layer2 was skipped because no target-specific layer2 tests matched.
3. The benchmark prompt asked for a final handoff label but did not include the exact expected route because `knownRoutes` is built only from `nextRoutes`.
4. The harness asserted `Output recommends $targeted-skill-builder`.
5. Claude outputs recommended `ship-end`, `expert-review`, or `benchmark-agent-review`, so all three failed.
6. Codex passed twice after producing `$targeted-skill-builder benchmark-agent-review ...`, but one run recommended `benchmark-agent-review`, so one Codex run failed.
7. The benchmark report correctly routed to this triage.

## Root Cause

Primary root cause: benchmark harness/setup defect.

The pack workflow setup has route expectation drift for `benchmark-agent-review`. It uses a single `nextRoute` value that is Codex-specific, while the mirrored skill contracts have runner-specific command conventions. The prompt also does not expose `nextRoute` values as known routes, so the hard assertion expects behavior that the prompt does not clearly require.

Secondary factor: agent noncompliance with the skill's intended remediation behavior.

Some generated outputs selected non-remediation routes such as `ship-end`, `expert-review`, or `benchmark-agent-review`, even though the `benchmark-agent-review` skill contract says material weaknesses should become remediation targets and usually route to targeted-skill-builder. That behavior is worth testing, but the current harness is too imprecise to distinguish contract noncompliance from prompt ambiguity and runner-route mismatch.

## Responsible Contract Gap

Responsible target: `tests/layer4/setups/packs/pack-workflows.setup.ts`.

The skill contracts are adequate enough to justify targeted-skill-builder as the intended remediation route. The benchmark setup needs to align with those contracts before using failures as skill-quality evidence.

## Recommended Fix

Update the `benchmark-agent-review` pack workflow definition in `tests/layer4/setups/packs/pack-workflows.setup.ts`:

1. Replace the single route with runner-specific routes:
   - Claude: `/targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap`
   - Codex: `$targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap`

2. Add prompt requirements that make the route expectation explicit:
   - Require a remediation-ready handoff when the reviewed artifact lacks residual-risk awareness.
   - Require the final handoff to use the runner-specific targeted-skill-builder route.

3. Add focused layer1 coverage in `tests/layer1/bench-setups.test.ts`:
   - Claude output with `/targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap` passes.
   - Codex output with `$targeted-skill-builder benchmark-agent-review residual-risk-awareness output-quality gap` passes.
   - Generic `$targeted-skill-builder` without the concrete gap fails if the assertion is tightened to an exact route.
   - Non-remediation routes such as `benchmark-agent-review`, `ship-end`, and `expert-review` fail.

4. Keep the `benchmark-agent-review` skill contracts unchanged unless the targeted update finds a concrete wording gap after harness alignment.

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality`
- `pnpm --dir tests verify --skill benchmark-agent-review`
- `pnpm --dir tests bench --skill benchmark-agent-review --agent codex --runs 1 --chunk-size 1 --pause 0`
- `pnpm --dir tests bench:coverage`
- Targeted search:
  - `rg -n "benchmark-agent-review|targeted-skill-builder|nextRoutes|residual-risk" tests/layer4/setups/packs/pack-workflows.setup.ts tests/layer1/bench-setups.test.ts`
- `git diff --check`

## Confidence And Evidence Gaps

Confidence: high for the harness/setup defect; medium for the secondary agent noncompliance classification.

Evidence gaps:

- This triage did not rerun a corrected benchmark setup, because the active workflow is analysis and the fix belongs in a targeted update.
- The full Claude stderr trace was not needed to verify the failure because the generated artifact snapshots in `run-*.json` were available and showed the wrong final routes.
- Broad recurrence analysis is not needed; existing lessons already cover runner-specific route conventions and separating deterministic benchmark failures from subjective agent review.

## Next Route

Recommended next skill: `$targeted-skill-builder benchmark-agent-review benchmark runner route and prompt alignment`
