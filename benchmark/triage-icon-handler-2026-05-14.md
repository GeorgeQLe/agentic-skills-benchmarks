# Triage: icon-handler Benchmark Failure

**Date:** 2026-05-14  
**Command:** `$session-triage icon-handler benchmark failure`  
**Repository:** `/Users/georgele/projects/tools/agentic-skills`

## Target

- Scope: fresh `$benchmark-test-skill icon-handler` failure from `benchmark/test-icon-handler-2026-05-14.md`.
- Skill under test: `global/claude/icon-handler/SKILL.md` and `global/codex/icon-handler/SKILL.md`.
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`.
- Layer1 coverage: `tests/layer1/bench-setups.test.ts`.
- Persisted run evidence:
  - `tests/benchmarks/runs/icon-handler-claude-ba6ebaf0/`
  - `tests/benchmarks/runs/icon-handler-codex-dc9c3d30/`
- Prior related triage: `benchmark/triage-icon-handler-2026-05-13.md`.
- Relevant lessons: runner-specific route conventions and benchmark-result separation in `tasks/lessons.md`.

## User-Identified Issue

The fresh `icon-handler` benchmark failed after the valid-source-asset fixture fix and needs focused triage.

## Verification Verdict

Verified.

The benchmark report shows verify passed, all 6 benchmark runs completed, and no runs were classified as infrastructure-blocked. Both runners passed 2/3 evaluated hard-assertion runs:

- Claude run #2 failed `Output recommends /icon-handler`.
- Codex run #2 failed `icon-audit.md created in project root`.

The previous image-processing failure from the invalid `.png` fixture did not recur. The current fixture creates `calc-mascot-icon.png` from `TINY_PNG`, and layer1 now asserts that the source asset has a PNG signature and is not the old `fixture-png-placeholder` text.

## Timeline

1. `$benchmark-test-skill icon-handler` ran after the valid-source-asset fixture fix.
2. `pnpm verify --skill icon-handler` passed layer1 in 10.8s; layer2 skipped because no target-specific tests matched.
3. Claude runs #0 and #1 wrote `icon-audit.md` and recommended `/icon-handler fix calc-mascot-icon.png`; both passed.
4. Claude run #2 wrote `icon-audit.md` and identified the correct Next App Router icon issues, but its final handoff was `npx next build`; it failed the runner-specific route assertion.
5. Codex runs #0 and #1 wrote `icon-audit.md`; both passed hard assertions. Run #1 still ended its artifact with `Next command: npm run build`, but it also included `Recommended approval command: $icon-handler fix calc-mascot-icon.png`, so the existing assertion passed.
6. Codex run #2 exited 0 after only a status update, did not write `icon-audit.md`, and took 8,461.2s.

## Root Cause

There are two verified failure modes.

First, the benchmark fixture has a route-clarity gap. The fixture prompt asks for "verification commands, and Next command" while the skill contract says the default next step after audit findings is approval of the fix route:

- Claude: `/icon-handler fix <asset>`
- Codex: `$icon-handler fix <asset>`

That wording leaves enough room for a runner to treat `npx next build` or `npm run build` as the "Next command" even though build is only a post-fix verification command. The skill contracts are already clear in their `Default Shipping Contract`, and the layer1 test already covers runner-specific route assertions. The missing piece is a fixture/rubric distinction between:

- the required recommended next route, which is the approval/fix command; and
- verification commands, which may include build commands after an approved fix.

Second, Codex run #2 is agent noncompliance or runner noncompletion with an adequate contract. The run only produced a short status update, did not inspect files, did not write `icon-audit.md`, and did not reach the skill workflow. That is not evidence of a skill contract gap.

## Responsible Contract Gap

Primary gap: benchmark fixture and quality rubric clarity in `tests/layer4/setups/tier23-global-workflows.setup.ts`, with regression coverage in `tests/layer1/bench-setups.test.ts`.

No change is justified in:

- `global/claude/icon-handler/SKILL.md`
- `global/codex/icon-handler/SKILL.md`

The mirrored skill contracts already require audit-first behavior, approval before writes, local format inspection, verification commands, and runner-specific recommended fix routes.

## Recommended Fix

Use `$targeted-skill-builder icon-handler benchmark route clarity` to update only the benchmark fixture/rubric and layer1 coverage.

Concrete changes:

1. In `tests/layer4/setups/tier23-global-workflows.setup.ts`, update the `icon-handler` benchmark prompt so it explicitly requires:
   - writing `icon-audit.md` before final response;
   - putting build commands under verification commands only; and
   - using the skill's approval/fix route as the final recommended next command.

Suggested prompt addition:

```text
The final recommended next command must be the icon-handler fix approval route for this runner (`/icon-handler fix calc-mascot-icon.png` for Claude, `$icon-handler fix calc-mascot-icon.png` for Codex). Build commands belong only under verification commands after an approved fix.
```

2. Tighten the `workflow-next-route` quality criterion for `icon-handler` so a report that ends with `Next command: npm run build` or `Next command: npx next build` does not pass merely because it mentions the fix route elsewhere as an approval command. The required final next-route label should point to `/icon-handler fix calc-mascot-icon.png` or `$icon-handler fix calc-mascot-icon.png`.

3. Add layer1 regression coverage that fails a report shaped like the observed failures:
   - Claude-style artifact with `Next command: npx next build` and no `/icon-handler` final route should fail.
   - Codex-style artifact with `Recommended approval command: $icon-handler fix ...` but final `Next command: npm run build` should fail the stricter next-route criterion.
   - Correct runner-specific final routes should still pass.

Do not route this to a skill-contract update unless the targeted benchmark fix reveals that the skill contracts cannot express the intended handoff. Current evidence says they can.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill icon-handler
pnpm --dir tests bench --skill icon-handler --agent claude --runs 1 --chunk-size 1 --pause 0
pnpm --dir tests bench --skill icon-handler --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Expected validation evidence:

- Layer1 proves build commands are verification commands, not accepted final handoffs.
- Verify still passes.
- Fresh smoke runs produce `icon-audit.md` and runner-specific final routes.
- No `API Error: 400 Could not process image` recurs.

## Confidence And Evidence Gaps

Confidence: high for the route-clarity fixture gap and high for not changing the mirrored `icon-handler` contracts.

Evidence gap: Codex run #2's 8,461.2s duration and no-artifact exit is a runner noncompletion incident. A benchmark fixture can reduce ambiguity, but it cannot fully prevent a runner from stopping after a status update. If no-artifact exits recur after the route-clarity fix, triage the benchmark runner timeout/completion behavior separately.

No `$analyze-sessions` pass is needed. This is a narrow benchmark fixture issue plus one observed no-artifact runner failure.

Recommended next skill: `$targeted-skill-builder icon-handler benchmark route clarity`
