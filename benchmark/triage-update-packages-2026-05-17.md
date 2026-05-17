# Triage: `update-packages` Benchmark Failure — 2026-05-17

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Target skill: `global/codex/update-packages/SKILL.md` and `global/claude/update-packages/SKILL.md`
- Benchmark report: `benchmark/test-update-packages-2026-05-17.md`
- Raw evidence:
  - `tests/benchmarks/runs/update-packages-claude-4f02cadc/report.json`
  - `tests/benchmarks/runs/update-packages-claude-4f02cadc/run-000.json`
  - `tests/benchmarks/runs/update-packages-claude-4f02cadc/run-001.json`
  - `tests/benchmarks/runs/update-packages-codex-febcb2db/report.json`
  - `tests/benchmarks/runs/update-packages-codex-febcb2db/run-002.json`
- Harness setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Relevant lessons: `tasks/lessons.md`

## User-Identified Issue

The user requested triage for the deterministic `$benchmark-test-skill update-packages` failure. The benchmark report showed both Claude and Codex at 0/3 hard assertion pass rate, with repeated `Output recommends $run` failures and one `Output includes older than 8 days` failure per agent.

## Verification Verdict

Verified.

Evidence:

- `benchmark/test-update-packages-2026-05-17.md` records custom benchmark coverage, verify layer1 PASS in 5.6s, layer2 SKIP, and no infrastructure-blocked runs.
- Claude report `update-packages-claude-4f02cadc/report.json` records 0/3 evaluated pass rate, 0 blocked runs, 39.4% average quality, 3 threshold failures, and 7 critical failures.
- Codex report `update-packages-codex-febcb2db/report.json` records 0/3 evaluated pass rate, 0 blocked runs, 38.6% average quality, 3 threshold failures, and 7 critical failures.
- Raw runs show each agent created `package-update-plan.md`, included `pnpm`, included verification commands, matched the domain workflow pattern, and included a next-command handoff, but did not recommend the harness-expected `$run` route.
- One Claude run and one Codex run used phrasing such as `>8d old` or `more than 8 full days`, which expresses the intended age gate but missed the exact expected literal `older than 8 days`.
- The raw Codex run read `global/codex/update-packages/SKILL.md` version 0.1.0 during execution. The current repository contract is version 0.2.0 and now includes explicit `.npmrc`, `min-release-age=8`, and `minimum-release-age=11520` requirements.

## Timeline

1. `$benchmark-test-skill update-packages` was run on 2026-05-17.
2. Verify passed layer1 and skipped layer2 because no target-specific layer2 tests matched `update-packages`.
3. The benchmark ran both agents for three evaluated runs each.
4. All six runs wrote `package-update-plan.md`, but all six final responses recommended concrete shell/package-manager commands rather than `$run`.
5. The quality evaluator also marked `package-lock.json` as fabricated or forbidden, even though the fixture file `package-lock-note.md` explicitly states that the source project has `package-lock.json`.
6. The repository was subsequently updated to `update-packages` contract version 0.2.0, adding installer age-gate requirements that the failed raw Codex run did not have available at runtime.

## Root Cause

The failure is a mixed benchmark coverage defect, not a pure `update-packages` skill-contract failure.

Primary root cause: the benchmark setup expects a global workflow handoff route of `$run`, but the prompt asks agents to write `package-update-plan.md` with a generic "Next command". The `update-packages` skill output contract allows "another exact follow-up command", so both runners reasonably emitted concrete package-manager commands. The harness then failed them for not recommending `$run`.

Secondary root cause: the shared global workflow quality evaluator forbids the literal `package-lock.json` for every tier23 global workflow. That is too broad for this fixture because `package-lock-note.md` intentionally says the source project has `package-lock.json` and no `pnpm-lock.yaml`. This creates a false positive under `no-generic-or-external-overreach`.

Tertiary root cause: the failed raw run used the older `update-packages` contract that did not yet include installer age-gate output requirements. Current mirrored contracts are now version 0.2.0, so the benchmark result is stale relative to current skill behavior for `.npmrc`, `min-release-age=8`, and `minimum-release-age=11520`.

## Responsible Contract Gap

- Responsible gap: benchmark setup and quality rubric for `update-packages`.
- Not responsible: GitHub Actions, external infrastructure, or runner capacity.
- Mirrored contract drift: none observed in the current repo for the new age-gate requirements. Codex uses `$migrate`; Claude uses `/migrate`, which is expected runner-specific routing.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark route and fixture rubric alignment`.

Proposed narrow changes:

1. In `tests/layer4/setups/tier23-global-workflows.setup.ts`, make the `update-packages` benchmark prompt require a literal final route label, for example:

   ```text
   End the response with `Recommended next command: $run` after the plan artifact is written; put package-manager shell commands inside package-update-plan.md, not as the final assistant handoff.
   ```

2. Add an `update-packages`-specific exemption or setup-local forbidden list so `package-lock.json` is allowed when it is part of the fixture evidence. Do not remove the generic fabrication guard for unrelated workflows.

3. Add layer1 coverage proving:
   - `update-packages` benchmark assertions accept a final `Recommended next command: $run`.
   - concrete package-manager shell commands inside `package-update-plan.md` do not satisfy the final route by themselves.
   - mentioning fixture-backed `package-lock.json` is not penalized as fabrication for this setup.
   - current age-gate facts `.npmrc`, `min-release-age=8`, and `minimum-release-age=11520` remain required.

4. After the targeted benchmark fix, rerun `pnpm verify --skill update-packages`, then rerun `$benchmark-test-skill update-packages` so the benchmark uses the current version 0.2.0 skill contracts.

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
rg -n "update-packages|package-lock.json|Recommended next command: \\$run|min-release-age|minimum-release-age|11520" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts
rg -n "min-release-age=8|minimum-release-age=11520|minimumReleaseAge: 11520" global/codex/update-packages/SKILL.md global/claude/update-packages/SKILL.md
```

## Confidence And Evidence Gaps

Confidence: high that the immediate benchmark failure is real and high that the next durable fix belongs in benchmark coverage, not the mirrored skill contract.

Evidence gaps:

- The failed run did not exercise the current version 0.2.0 `update-packages` contract, so a fresh benchmark is needed after rubric alignment.
- This triage did not inspect all six full run artifacts line by line because the sampled failed runs plus aggregate reports were sufficient to verify the failure pattern.
- `$analyze-sessions` is not needed for recurrence analysis; this is a narrow fixture/rubric alignment issue.

Recommended next skill: `$targeted-skill-builder update-packages benchmark route and fixture rubric alignment`
