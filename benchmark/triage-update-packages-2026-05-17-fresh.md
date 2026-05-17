# Triage: `update-packages` Fresh Benchmark Failure - 2026-05-17

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Target skill: `global/codex/update-packages/SKILL.md` and `global/claude/update-packages/SKILL.md`
- Benchmark report: `benchmark/test-update-packages-2026-05-17.md`
- Raw evidence:
  - `tests/benchmarks/runs/update-packages-claude-c99f0776/report.json`
  - `tests/benchmarks/runs/update-packages-claude-c99f0776/run-000.json`
  - `tests/benchmarks/runs/update-packages-claude-c99f0776/run-001.json`
  - `tests/benchmarks/runs/update-packages-claude-c99f0776/run-002.json`
  - `tests/benchmarks/runs/update-packages-codex-e51e553b/report.json`
- Harness setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The user requested triage for the latest deterministic `$benchmark-test-skill update-packages` failure. The fresh benchmark report records a mixed result: Claude passed 2/3 hard assertion runs and Codex passed 3/3, but Claude run #1 failed `Output includes verification commands` and the Claude quality evaluator recorded one threshold failure plus one critical failure.

## Verification Verdict

Verified.

Evidence:

- `benchmark/test-update-packages-2026-05-17.md` records custom benchmark coverage, verify layer1 PASS in 3.3s, layer2 SKIP, and no infrastructure-blocked runs.
- `tests/benchmarks/runs/update-packages-claude-c99f0776/report.json` records 3 evaluated Claude runs, 0 blocked runs, 66.7% hard assertion pass rate, 75.0% average quality, 1 threshold failure, and 1 critical failure.
- `tests/benchmarks/runs/update-packages-claude-c99f0776/run-001.json` records a single failed hard assertion: `Output includes verification commands`.
- The failed run's generated `package-update-plan.md` includes a `## Verification` section with command blocks for `pnpm install --frozen-lockfile`, `pnpm run build`, `pnpm run test`, and `pnpm outdated`.
- The benchmark setup requires `expectedIncludes: ["pnpm", "older than 8 days", "verification commands", ".npmrc", "min-release-age"]`, so the run failed because the artifact expressed the verification requirement without the exact phrase `verification commands`.
- Current mirrored `update-packages` contracts are aligned at version 0.2.0. Both require verification after updates, but neither requires the literal phrase `verification commands`.

## Timeline

1. `$benchmark-test-skill update-packages` was rerun after the prior route and fixture-rubric alignment.
2. Verify passed layer1 and skipped layer2 because no target-specific layer2 tests matched `update-packages`.
3. The benchmark ran three Claude iterations and three Codex iterations.
4. Codex passed all hard assertions and quality thresholds.
5. Claude runs #0 and #2 passed hard assertions; Claude run #1 wrote `package-update-plan.md` but used `## Verification` rather than the exact phrase `verification commands`.
6. The harness marked Claude run #1 failed and routed to `$session-triage update-packages benchmark failure`.

## Root Cause

The immediate failure is a benchmark setup false negative caused by an overly literal expected fact.

`update-packages` needs the artifact to include verification evidence and commands. The failed artifact did include that behavior under `## Verification`, with concrete command blocks. The benchmark setup instead checks for the exact phrase `verification commands`, even though the prompt only asks the agent to write a plan "with ... verification commands" and the mirrored skill output contract labels the required output as `Verification`.

The quality failure is downstream of the same issue. `requiredFactCoverageCriterion` also treats the same exact string as a critical required fact, so a behaviorally valid verification section can fail quality scoring because it omits one brittle phrase.

This is not a runner-capacity problem, not a GitHub Actions issue, and not mirrored skill drift. It is also not strong evidence that the `update-packages` skill contract needs another behavioral change.

## Responsible Contract Gap

- Responsible gap: `tests/layer4/setups/tier23-global-workflows.setup.ts` for the `update-packages` benchmark setup.
- Secondary gap: layer1 benchmark setup coverage does not yet prove that a `## Verification` section with command blocks satisfies the update-packages verification expectation.
- Not responsible: `global/codex/update-packages/SKILL.md` or `global/claude/update-packages/SKILL.md`; both already require verification commands in substance.
- Mirrored contract drift: none found for the current version 0.2.0 contracts. Runner-specific route differences are expected: Codex uses `$migrate`, Claude uses `/migrate`.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark verification phrase tolerance`.

Proposed narrow changes:

1. In `tests/layer4/setups/tier23-global-workflows.setup.ts`, replace the exact expected include `verification commands` for `update-packages` with a setup-specific assertion that accepts either:
   - the literal phrase `verification commands`, or
   - a verification section heading plus at least one relevant command such as `pnpm install --frozen-lockfile`, `pnpm run build`, `pnpm run test`, `pnpm test`, or `pnpm outdated`.

2. Keep the hard assertion meaningful by requiring real command evidence. Do not reduce the requirement to just the word `verification`.

3. Update the quality rubric for this setup so the required-fact coverage criterion uses behavior-level verification evidence rather than the brittle exact phrase. A small setup-local quality criterion is preferable to weakening the shared global workflow rubric.

4. Add focused layer1 coverage in `tests/layer1/bench-setups.test.ts` proving:
   - `## Verification` plus concrete command blocks passes the update-packages setup.
   - an artifact with no verification section and no command evidence still fails.
   - existing route checks still require `/run` for Claude and `$run` for Codex.
   - `.npmrc`, `min-release-age=8`, and package-manager age-gate facts remain required.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
git diff --check
```

Targeted static checks:

```bash
rg -n "update-packages|verification commands|Verification|pnpm install --frozen-lockfile|Recommended next command" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts
rg -n "Verification|verify after updates|min-release-age=8|minimum-release-age=11520" global/codex/update-packages/SKILL.md global/claude/update-packages/SKILL.md
```

## Confidence And Evidence Gaps

Confidence: high that the immediate benchmark failure is real and high that the smallest durable fix belongs in benchmark coverage rather than the mirrored skill contract.

Evidence gaps:

- This triage inspected the failing Claude run in detail and checked aggregate Claude/Codex reports. It did not line-review every Codex artifact because Codex passed all hard assertions and quality thresholds.
- This triage did not run a post-fix benchmark because it is analysis-only and the fix has not been implemented yet.
- `$analyze-sessions` is not needed for recurrence analysis; this is a narrow benchmark fixture/rubric issue already localized to one setup.

Recommended next skill: `$targeted-skill-builder update-packages benchmark verification phrase tolerance`
