# Triage: update-packages Benchmark Failure - 2026-05-18

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under investigation: `update-packages`
- Fresh benchmark report: `benchmark/test-update-packages-2026-05-18.md`
- Raw run evidence:
  - `tests/benchmarks/runs/update-packages-claude-12d8fabf/`
  - `tests/benchmarks/runs/update-packages-codex-d7c07a6a/`
- Contracts and harness evidence:
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
  - `tests/layer4/setups/tier23-global-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill update-packages` run failed and needs triage.

## Verification Verdict

**Verified as a benchmark harness false negative.**

The benchmark failure is real: Claude session `update-packages-claude-12d8fabf` passed only 1/3 evaluated hard-assertion runs, while Codex session `update-packages-codex-d7c07a6a` passed 3/3. There were no infrastructure-blocked runs.

The failed assertion was `Output avoids unqualified pnpm@latest` in Claude runs #0 and #1. The retained Claude artifacts do not recommend unqualified `pnpm@latest`; they select pinned pnpm versions and mention `pnpm@latest` only in negated warning language:

- Run #0: pinned `pnpm@9.12.3`; says `do **not** use unqualified pnpm@latest`.
- Run #1: pinned `pnpm@9.15.0`; says `not pnpm@latest`.
- Run #2: pinned `pnpm@9.12.0`; says `do NOT use unqualified pnpm@latest` and passed.

A direct replay of `UPDATE_PACKAGES_NO_UNQUALIFIED_PNPM_LATEST_PATTERN` shows the current regex fails valid negated wording with markdown emphasis and concise negation:

```text
false  We do **not** use unqualified `pnpm@latest`
false  not `pnpm@latest`
true   do NOT use unqualified `pnpm@latest`
false  corepack prepare pnpm@latest --activate
```

The contracts require avoiding default or unqualified `pnpm@latest`; they do not require suppressing valid warning language. The failed artifacts satisfied the contract by choosing pinned pnpm versions and documenting why unqualified latest should not be used.

## Timeline

1. `$benchmark-test-skill update-packages` ran after the pnpm latest benchmark-tolerance update.
2. Verify passed: layer1 PASS in 3.3s; layer2 SKIP because no target-specific layer2 tests matched.
3. Benchmark completed both runners with no infrastructure blocks.
4. Codex passed 3/3 hard assertions with 98.0% output quality.
5. Claude failed 2/3 runs on `Output avoids unqualified pnpm@latest`.
6. Retained artifacts showed pinned pnpm versions and negated `pnpm@latest` language, not an affirmative unqualified recommendation.
7. Regex replay isolated the issue to benchmark pattern tolerance, not the skill contract.

## Root Cause

The root cause is a benchmark assertion/rubric calibration gap in `tests/layer4/setups/tier23-global-workflows.setup.ts`.

The current `UPDATE_PACKAGES_NO_UNQUALIFIED_PNPM_LATEST_PATTERN` accepts some explicit warning language, such as `do not use pnpm@latest` and `rather than pnpm@latest`, but misses common valid variants:

- markdown-emphasized negation: `do **not** use unqualified pnpm@latest`
- concise negation: `not pnpm@latest`

Focused layer1 coverage currently includes `do not use`, `rather than`, and `Never default to`, but not these two variants. That left the false negative unprotected.

## Responsible Contract Gap

Responsible surface: benchmark harness and layer1 coverage.

- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

The mirrored `update-packages` skill contracts are adequate and aligned. This is not a Codex/Claude contract drift issue, not an infrastructure block, and not a proven generated-output noncompliance issue.

## Recommended Fix

Update the `update-packages` benchmark assertion so it accepts negated `pnpm@latest` mentions when the same line clearly warns against using it, including markdown emphasis and concise `not pnpm@latest` forms.

Suggested behavior:

- Accept lines like:
  - `do **not** use unqualified pnpm@latest`
  - `not pnpm@latest`
  - `not \`pnpm@latest\``
  - `never use pnpm@latest`
  - `rather than pnpm@latest`
- Continue rejecting affirmative recommendations and executable/package-manager declarations:
  - `migrate to pnpm using pnpm@latest`
  - `corepack prepare pnpm@latest --activate`
  - `packageManager: "pnpm@latest"`

Use `$targeted-skill-builder update-packages benchmark pnpm latest markdown-negation tolerance` to make the narrow harness update and add focused coverage.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent claude --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Targeted checks:

```bash
rg -n "do \\*\\*not\\*\\* use|not `pnpm@latest`|pnpm@latest" tests/layer1/bench-setups.test.ts tests/layer4/setups/tier23-global-workflows.setup.ts
```

After the harness fix, rerun `$benchmark-test-skill update-packages` for fresh both-agent evidence.

## Confidence and Evidence Gaps

Confidence: high.

The raw failed artifacts, mirrored contracts, current regex, and direct regex replay all point to a false negative in the benchmark harness. No broader `$analyze-sessions` run is needed; the issue is localized to one benchmark setup and its focused layer1 coverage.

Evidence gap: this triage did not implement the regex fix or rerun the full benchmark. That should happen in the targeted follow-up.

Recommended next skill: `$targeted-skill-builder update-packages benchmark pnpm latest markdown-negation tolerance`
