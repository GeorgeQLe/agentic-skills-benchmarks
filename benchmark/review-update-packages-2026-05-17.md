# Benchmark Agent Review: update-packages - 2026-05-17

**Workflow:** `$benchmark-agent-review update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-17.md`
**Reviewed runs:**
- `tests/benchmarks/runs/update-packages-claude-2611723c/`
- `tests/benchmarks/runs/update-packages-codex-2216d07d/`

## Deterministic Context

| Runner | Hard assertion pass rate | Deterministic output-quality score | Infrastructure blocked |
|---|---:|---:|---:|
| Claude | 100.0% (3/3) | 86.5% | 0 |
| Codex | 100.0% (3/3) | 94.2% | 0 |

The benchmark prompt asked the agent to read `package.json`, `npm-view-times.json`, and `package-lock-note.md`, then write `package-update-plan.md` with a pnpm-preferred migration strategy, `.npmrc` and package-manager age gates, eligible versions older than 8 days, skipped packages, verification commands, and a runner-native next command.

The fixture facts were: current dependencies `react@^18.2.0`, `zod@^3.22.0`, and `vitest@^1.6.0`; a source `package-lock.json` with no `pnpm-lock.yaml`; no deployment notes requiring npm; eligible versions `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4`; too-new versions `react@19.3.0`, `zod@4.1.12`, and `vitest@4.0.0`.

## Subjective Verdict

The generated `package-update-plan.md` artifacts are **good overall**. They are operator-usable, correctly select and skip versions, preserve the installer age-gate values, and route to the correct runner-native next command. The strongest Codex outputs also add file-level config checks and a fallback path if pnpm migration fails.

They are not consistently excellent because risk handling for peer-sensitive major upgrades is thinner than the `update-packages` contract deserves. React 18 to 19 and Vitest 1 to 3 are named as major upgrades, but most plans do not translate that into concrete batch ordering, peer-compatibility checks, React-specific smoke tests, or an explicit stop/route condition if compatibility issues exceed dependency-update scope. Two Codex runs also suggest `pnpm@latest` before warning about local policy; that is a weak default in a workflow built around package age gating.

## Score Table

| Reviewer | Runner | Run index | Score | Grade band | Notes |
|---|---|---:|---:|---|---|
| Codex | Claude | 0 | 86 | good | Accurate plan with strong fixture coverage; verification is concrete, but React/Vitest major-upgrade risk remains mostly generic. |
| Codex | Claude | 1 | 82 | good | Clear summary and eligible/skipped tables; includes destructive cleanup language and weak major-upgrade validation specificity. |
| Codex | Claude | 2 | 80 | good | Usable and concise, but has confusing age-gate comments and only broad checks for major compatibility. |
| Codex | Codex | 0 | 88 | good | Strong structure and fallback note; uses `pnpm@10`/toolchain language but lacks concrete React/Vitest smoke checks. |
| Codex | Codex | 1 | 90 | excellent | Best verification section, including lockfile and `.npmrc` assertions; still suggests `pnpm@latest` before qualifying it. |
| Codex | Codex | 2 | 90 | excellent | Strongest residual-risk note for React migration and source-tree preservation; still defaults to `pnpm@latest` in implementation commands. |

**Median subjective score:** 87/100
**Score range:** 80-90

## Common Strengths

- Correctly identifies that pnpm migration is allowed because the fixture has no npm-only deployment constraint.
- Correctly selects `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4` as eligible older-than-8-day targets.
- Correctly skips `react@19.3.0`, `zod@4.1.12`, and `vitest@4.0.0` as inside the age gate.
- Includes `.npmrc` entries `min-release-age=8` and `minimum-release-age=11520`.
- Keeps package-manager shell commands inside implementation or verification sections and uses `/run` for Claude, `$run` for Codex.
- Avoids unsupported external services, deployments, or repository claims.

## Common Weaknesses

- Major-upgrade risk handling is too shallow for React and Vitest. The plans identify the upgrades as major but usually stop at generic build/test verification instead of naming compatibility checks or batch boundaries.
- Package-manager version selection is inconsistent. Several outputs use a fixed pnpm version, while two Codex outputs propose `pnpm@latest` and only later qualify that policy risk.
- Some age-gate descriptions confuse which manager owns which setting, even though the required literal settings are present.
- Claude outputs often omit a clear artifact path reference in stdout, which is less ergonomic for the next operator even though the retained artifact exists.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| Major React/Vitest upgrades are not converted into concrete compatibility checks and stop conditions. | target-skill contract | `global/codex/update-packages/SKILL.md` and `global/claude/update-packages/SKILL.md` | Require the output for major/framework/build-tool updates to include batch order, peer/config compatibility checks, focused smoke checks, and a stop route to `$migrate <package>` or `/migrate <package>` when compatibility work exceeds dependency-update scope. | Add contract/layer1 text coverage, then run `pnpm --dir tests verify --skill update-packages` and a focused `pnpm --dir tests bench --skill update-packages --agent codex --runs 1 --chunk-size 1 --pause 0`. | `$targeted-skill-builder update-packages major-upgrade risk handling` |
| Plans can suggest `pnpm@latest`, which conflicts with the age-gated spirit unless that package-manager version is also checked or already approved. | target-skill contract | `global/codex/update-packages/SKILL.md` and `global/claude/update-packages/SKILL.md` | Require package-manager version selection to prefer an existing repo/toolchain version or an explicitly age-eligible pnpm version; forbid unqualified `pnpm@latest` in plans. | Add a benchmark setup or quality-rubric assertion rejecting unqualified `pnpm@latest`, then run `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality`. | `$targeted-skill-builder update-packages package-manager version age gate` |
| Deterministic rubric passes outputs with generic major-upgrade verification. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` and `tests/layer4/setup-helpers/quality.ts` | Add an output-quality criterion or fixture-required fact for major-upgrade compatibility evidence when the update target includes React, Vitest, Next, Vite, TypeScript, or similar peer-sensitive packages. | `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages benchmark major-upgrade quality rubric` |
| Artifact path ergonomics differ by runner; Claude stdout summarizes the artifact but does not expose a clickable path. | retained-evidence gap | `tests/layer4/setups/tier23-global-workflows.setup.ts` or runner output expectations | Optional: ask benchmark prompts to include the artifact path in final stdout, or avoid scoring this if retained artifacts are already captured. | Report-only unless the team wants stricter retained-evidence ergonomics. | `$ship` |

## Deterministic-Rubric Notes

The deterministic rubric correctly caught the core compliance surface: artifact creation, age-gate literals, eligible/skipped versions, verification evidence, and runner-native next route. It did not meaningfully distinguish generic major-upgrade verification from remediation-ready major-upgrade risk handling. That gap matters because `update-packages` is most valuable when it prevents risky dependency updates from becoming broad, hidden migrations.

## Next Work

Tighten the `update-packages` skill contract so major/framework/build-tool upgrades require explicit compatibility checks, batch boundaries, and a stop route when migration work exceeds dependency-update scope.

Recommended next command: `$targeted-skill-builder update-packages major-upgrade risk handling`
