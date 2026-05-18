# Triage: update-packages pnpm latest Reject Warning Failure - 2026-05-18

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Target skill: `update-packages`
- Curated benchmark report: `benchmark/test-update-packages-2026-05-18.md`
- Failed raw run: `tests/benchmarks/runs/update-packages-claude-dbd3972f/run-001.json`
- Raw session report: `tests/benchmarks/runs/update-packages-claude-dbd3972f/report.json`
- Benchmark setup and tests:
  - `tests/layer4/setups/tier23-global-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Skill contracts:
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
- Related lessons/reports: `tasks/lessons.md` and prior `benchmark/triage-update-packages-2026-05-18-*` reports.

## User-Identified Issue

The latest `$benchmark-test-skill update-packages` run failed and needs triage before deciding whether to change the skill, benchmark harness, or next route.

## Verification Verdict

**Verified as a benchmark harness false negative, not an `update-packages` skill-contract failure.**

The benchmark failure itself is real: Claude session `update-packages-claude-dbd3972f` completed 3 evaluated runs with 2/3 hard assertion pass rate, 0 infrastructure blocks, and one failed assertion in run #1: `Output avoids unqualified pnpm@latest`.

The failed generated artifact does not recommend or use unqualified `pnpm@latest`. It selects an explicit age-eligible pinned pnpm version and includes retained publish-time evidence:

- `packageManager`: `pnpm@10.11.0`
- `npm view pnpm@10.11.0 time.version`
- publish time `2026-05-01T12:00:00.000Z`
- statement that the version is 17 days old on 2026-05-18

The only unsafe-looking mention is explicit rejection language:

```text
Reject `pnpm@latest` — unqualified, unverifiable at lock time.
```

That sentence is semantically compliant with both mirrored `update-packages` contracts. The current helper in `tests/layer4/setups/tier23-global-workflows.setup.ts` accepts lines containing warning terms such as `do not use`, `not`, `no unqualified`, `avoid`, `never`, `rather than`, and `instead of`, but does not include `reject`. Therefore the artifact failed because the benchmark detector missed valid rejection wording.

## Timeline

1. `$benchmark-test-skill update-packages` ran after prior pnpm latest tolerance work.
2. Verify passed with layer1 PASS and layer2 SKIP.
3. Claude session `update-packages-claude-dbd3972f` completed 3 evaluated runs.
4. Claude run #1 wrote `package-update-plan.md`, selected `pnpm@10.11.0`, proved publish age, preserved age-gate semantics, and recommended `/run`.
5. The benchmark failed run #1 on `Output avoids unqualified pnpm@latest`.
6. Inspection showed `pnpm@latest` appears only in the line `Reject \`pnpm@latest\` — unqualified, unverifiable at lock time.`
7. The helper `lineOnlyWarnsAgainstPnpmLatest` does not treat `reject` as safe warning/rejection language.

## Root Cause

The responsible issue is a benchmark assertion wording gap. The intended behavior is to fail outputs that recommend, prepare, install, or set `packageManager` to unqualified `pnpm@latest`. The current implementation approximates that by checking every line containing `pnpm@latest` for a whitelist of warning phrases. That whitelist is still too narrow: it misses valid imperative rejection language.

This is not a mirrored skill drift issue. Both Codex and Claude skill contracts already say not to default to `pnpm@latest`, to use an existing repo/toolchain version or explicitly age-eligible pnpm version, and to document proof before recommending `packageManager`.

This is not infrastructure-only. There were 0 infrastructure-blocked Claude runs in this session.

## Responsible Contract Gap

- Responsible gap: `tests/layer4/setups/tier23-global-workflows.setup.ts` benchmark helper and matching focused layer1 coverage.
- No current change is justified in:
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
  - project instructions

The existing `tasks/lessons.md` lesson on update-packages age gates remains relevant. No new lesson is required because this is another instance of the already-identified benchmark-tolerance pattern around pnpm version proof and `pnpm@latest` warning language.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark pnpm latest reject-warning tolerance`.

Expected narrow implementation:

1. Update `lineOnlyWarnsAgainstPnpmLatest` in `tests/layer4/setups/tier23-global-workflows.setup.ts` so lines that explicitly reject `pnpm@latest` are treated as safe warning language.
2. Add focused layer1 coverage in `tests/layer1/bench-setups.test.ts` for the retained failed shape:
   - `Reject \`pnpm@latest\` — unqualified, unverifiable at lock time.`
3. Keep negative coverage that still fails real unqualified usage:
   - `Package-manager migration strategy: migrate to pnpm using pnpm@latest.`
   - `corepack prepare pnpm@latest --activate`
   - `Add packageManager: "pnpm@latest" to package.json.`
4. Do not broaden the assertion so far that generic mentions of `pnpm@latest` pass without clear rejection/negation language.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
rg -n "Reject.*pnpm@latest|lineOnlyWarnsAgainstPnpmLatest|Output avoids unqualified pnpm@latest" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts
git diff --check
```

Optional smoke after the harness update:

```bash
pnpm --dir tests bench --skill update-packages --agent claude --runs 1 --chunk-size 1 --pause 0
```

After the targeted fix, rerun `$benchmark-test-skill update-packages` for fresh both-agent evidence.

## Confidence And Evidence Gaps

Confidence: high. The failed raw artifact, benchmark report, mirrored skill contracts, current helper implementation, and existing focused coverage all point to a local benchmark false negative.

Evidence gap: no direct replay test was added in this triage step because session-triage is analysis-only by default. The recommended targeted-skill-builder step should add that replay as focused layer1 coverage.

No broad `$analyze-sessions` run is needed; recurrence evidence is already localized in the prior `update-packages` triage reports and the current failure is explained by one missing safe-word branch.

Recommended next skill: `$targeted-skill-builder update-packages benchmark pnpm latest reject-warning tolerance`
