# Triage: update-packages Benchmark Failure - pnpm latest Parenthetical Negation

Date: 2026-05-18

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Skill under investigation: `update-packages`
- Benchmark report: `benchmark/test-update-packages-2026-05-18.md`
- Raw failed run: `tests/benchmarks/runs/update-packages-claude-c663452c/run-001.json`
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Focused coverage: `tests/layer1/bench-setups.test.ts`
- Skill contracts: `global/codex/update-packages/SKILL.md`, `global/claude/update-packages/SKILL.md`
- Lessons checked: `tasks/lessons.md`

## User-Identified Issue

The latest `$benchmark-test-skill update-packages` run failed and needs triage before rerunning or reviewing.

## Verification Verdict

Verified as a benchmark harness false negative, not an `update-packages` skill-contract failure.

Evidence:

- The curated benchmark report records Claude session `update-packages-claude-c663452c` with 1/2 evaluated hard assertions, one infrastructure-blocked run, and one failed assertion: `Output avoids unqualified pnpm@latest`.
- The failed raw run created `package-update-plan.md`, exited successfully, recommended `/run`, and passed all other hard assertions, including selected pnpm toolchain age proof and age-gate semantics.
- The retained artifact selected `pnpm@10.11.0`, cited `npm view pnpm@10.11.0 time.version` returning `2026-05-01T12:00:00.000Z`, stated that date clears the 8-day gate, skipped `pnpm@10.22.0` as too new, and set `packageManager` to `pnpm@10.11.0`.
- The only `pnpm@latest` mentions in the failed output are negated warning/context forms:
  - stdout: `pnpm@10.11.0 pinned with npm view evidence (not pnpm@latest)`
  - artifact heading: `pnpm version selection (no unqualified pnpm@latest)`
- The mirrored Codex and Claude `update-packages` contracts already require avoiding default `pnpm@latest`, using a repo-pinned or age-eligible pnpm version, and documenting proof before recommending `packageManager`.
- Existing focused layer1 coverage accepts several negated forms, including `do not use unqualified pnpm@latest`, `rather than pnpm@latest`, `Never default to pnpm@latest`, and `not pnpm@latest`, but it does not cover parenthetical `(not pnpm@latest)`, headings like `no unqualified pnpm@latest`, or backticked parenthetical forms.

## Timeline

1. `$benchmark-test-skill update-packages` ran verify and both-agent benchmarks.
2. Verify passed: layer1 PASS in 3.5s; layer2 skipped because no target-specific layer2 tests matched.
3. Claude session `c663452c` produced two evaluated runs and one infrastructure block.
4. Claude run #1 generated an otherwise complete `package-update-plan.md` and selected age-proven `pnpm@10.11.0`.
5. The setup failed run #1 on `Output avoids unqualified pnpm@latest` because negated/contextual `pnpm@latest` wording did not match the current safe-language detector.
6. Codex session `ebca44af` passed 3/3 hard assertions with 100.0% output quality.

## Root Cause

The root cause is a brittle benchmark assertion pattern in `tests/layer4/setups/tier23-global-workflows.setup.ts`.

`UPDATE_PACKAGES_NO_UNQUALIFIED_PNPM_LATEST_PATTERN` is intended to reject actual use of unqualified `pnpm@latest` while allowing warning language that says not to use it. It already accepts some negated forms, but misses valid Markdown/parenthetical forms where:

- `pnpm@latest` is backticked after `not`, as in `(not `pnpm@latest`)`;
- the negation uses `no unqualified`, as in `no unqualified `pnpm@latest``;
- the warning appears in a heading or parenthetical context rather than a plain sentence.

The generated output behavior matches the skill contract. The benchmark detector is too syntax-sensitive for the valid artifact shape.

## Responsible Contract Gap

- Responsible gap: benchmark harness coverage and assertion tolerance.
- File: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Test coverage gap: `tests/layer1/bench-setups.test.ts`
- Skill contract gap: none verified.
- Project instruction gap: none verified.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark pnpm latest parenthetical-negation tolerance`.

Implement the smallest benchmark-only change:

1. Update `UPDATE_PACKAGES_NO_UNQUALIFIED_PNPM_LATEST_PATTERN` or replace it with a small helper that classifies each line containing `pnpm@latest`.
2. Preserve failures for actual recommendations such as:
   - `migrate to pnpm using pnpm@latest`
   - `corepack prepare pnpm@latest --activate`
   - `packageManager: "pnpm@latest"`
3. Add accepted cases for:
   - `pnpm@10.11.0 pinned with npm view evidence (not pnpm@latest)`
   - `pnpm@10.11.0 pinned with npm view evidence (not `pnpm@latest`)`
   - `### pnpm version selection (no unqualified pnpm@latest)`
   - `### pnpm version selection (no unqualified `pnpm@latest`)`
4. Add a focused layer1 regression using the exact failed retained shape from `run-001.json`.

Do not change `global/codex/update-packages/SKILL.md` or `global/claude/update-packages/SKILL.md` unless new evidence shows agents are actually recommending unqualified `pnpm@latest`.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Also run targeted searches:

```bash
rg -n "pnpm@latest|UPDATE_PACKAGES_NO_UNQUALIFIED_PNPM_LATEST_PATTERN|parenthetical" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts
rg -n "Do not default to `pnpm@latest`|packageManager.*pnpm" global/codex/update-packages/SKILL.md global/claude/update-packages/SKILL.md
```

## Confidence And Evidence Gaps

Confidence: high.

The failed raw artifact, benchmark report, mirrored skill contracts, and current detector all point to a benchmark false negative. No broad `$analyze-sessions` run is needed because this is a single deterministic benchmark failure with local raw artifacts.

Evidence gaps:

- The full Claude runner transcript beyond retained stdout/artifact was not needed because the benchmark evaluated the persisted `package-update-plan.md` artifact and stored the failed assertion reason.
- One Claude run was infrastructure-blocked, but that does not affect the diagnosis of the evaluated failed run.

Recommended next skill: `$targeted-skill-builder update-packages benchmark pnpm latest parenthetical-negation tolerance`
