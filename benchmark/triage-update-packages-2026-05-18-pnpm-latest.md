# Session Triage: update-packages Benchmark Failure - 2026-05-18

## Target

- Scope: `$session-triage update-packages benchmark failure`.
- Repository: `/Users/georgele/projects/tools/agentic-skills`.
- Target skill: `update-packages`.
- Evidence sources:
  - `benchmark/test-update-packages-2026-05-17.md`
  - `tests/benchmarks/runs/update-packages-claude-e7c523af/report.json`
  - `tests/benchmarks/runs/update-packages-claude-e7c523af/run-001.json`
  - `tests/benchmarks/runs/update-packages-claude-e7c523af/run-002.json`
  - `tests/benchmarks/runs/update-packages-codex-c8dbd66e/report.json`
  - `tests/benchmarks/runs/update-packages-codex-c8dbd66e/run-002.json`
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
  - `tests/layer4/setups/tier23-global-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill update-packages` run failed on `Output avoids unqualified pnpm@latest`.

## Verification Verdict

Verified as a benchmark harness/setup false negative, not as a proven `update-packages` skill-contract failure.

The curated benchmark report records evaluated failures with no infrastructure blocks:

- Claude `update-packages-claude-e7c523af`: 1/3 hard assertions passed; runs #1 and #2 failed `Output avoids unqualified pnpm@latest`.
- Codex `update-packages-codex-c8dbd66e`: 2/3 hard assertions passed; run #2 failed `Output avoids unqualified pnpm@latest`.

The failed generated artifacts did not recommend unqualified `pnpm@latest`:

- Claude run #1 selected `pnpm@9.12.0` and wrote: `We do not use unqualified pnpm@latest`.
- Claude run #2 selected `pnpm@9.15.4` and wrote: `do not use pnpm@latest`, with a concrete age-eligible pinned version.
- Codex run #2 selected the existing local toolchain `pnpm@10.22.0` and wrote: `do not use unqualified pnpm@latest`.

The setup assertion currently uses a broad negative-lookahead regex:

```ts
/^(?![\s\S]*pnpm@latest(?![\s\S]*(already-approved|approved stable|existing repo|existing toolchain|age-eligible|published older than 8 days|violates local policy|choose the newest already-installed)))[\s\S]*$/i
```

This fails valid negated text when the explanatory safe phrase is absent, differently worded, or appears before `pnpm@latest`. The Codex failure is especially diagnostic: `existing local toolchain` appears before the `pnpm@latest` warning, but the regex only looks after the token.

## Timeline

1. `$benchmark-test-skill update-packages` ran after the major-upgrade risk-handling update.
2. Verify passed: layer1 PASS in 3.3s; layer2 skipped because no target-specific layer2 tests matched.
3. Both-agent benchmark completed six evaluated runs with no infrastructure blocks.
4. Three runs failed the hard assertion `Output avoids unqualified pnpm@latest`.
5. The persisted artifacts show the agents chose pinned pnpm versions and warned against `pnpm@latest`.
6. The harness regex classified those warnings as failures because its allowed-context language and ordering are too brittle.

## Root Cause

Benchmark assertion semantics are too string-fragile for the intended behavior.

The intended behavior is: fail when the output recommends or uses unqualified `pnpm@latest` as a package-manager selection. The current assertion instead fails many textual mentions of `pnpm@latest`, including explicit warnings not to use it, unless one of a small set of allowed phrases appears after the token.

Secondary note: the same failed Claude runs also had an output-quality penalty for missing the literal `package-update-plan.md` in the retained artifact body. That is a separate quality-rubric issue, but it was not the hard assertion that made the deterministic benchmark fail.

## Responsible Contract Gap

Responsible gap: `tests/layer4/setups/tier23-global-workflows.setup.ts` and supporting layer1 coverage in `tests/layer1/bench-setups.test.ts`.

Not responsible based on current evidence:

- `global/codex/update-packages/SKILL.md`
- `global/claude/update-packages/SKILL.md`

The mirrored skill contracts already require: do not default to `pnpm@latest`; use an existing repo/toolchain pnpm version or an explicitly age-eligible pnpm version; document the choice.

## Recommended Fix

Update the benchmark setup so `Output avoids unqualified pnpm@latest` detects recommendation/use, not any mention.

Exact files:

- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

Suggested behavior:

- Accept negated warning language near `pnpm@latest`, such as:
  - `do not use pnpm@latest`
  - `do not use unqualified pnpm@latest`
  - `not pnpm@latest`
  - `avoid pnpm@latest`
  - `never default to pnpm@latest`
- Accept pinned-version choices when the artifact selects `pnpm@<number>` and mentions `pnpm@latest` only as a warning.
- Continue rejecting affirmative use/recommendation language such as:
  - `migrate to pnpm using pnpm@latest`
  - `corepack prepare pnpm@latest --activate`
  - `packageManager: "pnpm@latest"`
  - `use pnpm@latest`

Concrete implementation option:

- Replace the single negative-lookahead regex with a small helper that scans lines containing `pnpm@latest`.
- Pass if every such line is clearly negated or policy-warning language.
- Fail if any line combines `pnpm@latest` with use/recommend/install/prepare/packageManager language without a nearby negation.

Add layer1 fixtures that prove:

- `Use pnpm@10.22.0 from the existing local toolchain; do not use unqualified pnpm@latest.` passes.
- `Pin pnpm@9.15.4; do not use pnpm@latest because it floats past the age gate.` passes.
- `Package-manager migration strategy: migrate to pnpm using pnpm@latest.` still fails.
- `corepack prepare pnpm@latest --activate` still fails.
- `packageManager: "pnpm@latest"` still fails.

## Validation Plan

After the targeted fix:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Before rerunning the full both-agent benchmark, replay the three failed persisted artifact bodies against the revised assertion if a local helper or layer1 fixture is available.

## Confidence And Evidence Gaps

Confidence: high that the hard benchmark failure is a harness false negative.

Evidence gaps:

- I did not run a broad recurrence analysis across session history; the local evidence is sufficient for this incident.
- I did not inspect every generated artifact for subjective operator quality. That belongs to `$benchmark-agent-review` after deterministic benchmark evidence passes.

## Recommended Next Skill

Recommended next skill: `$targeted-skill-builder update-packages benchmark pnpm latest negation tolerance`
