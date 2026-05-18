# Benchmark Agent Review: update-packages - 2026-05-18

**Workflow:** `$benchmark-agent-review update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Reviewed run directories:**

- `tests/benchmarks/runs/update-packages-claude-25145968/`
- `tests/benchmarks/runs/update-packages-codex-fdde75ea/`

## Benchmark Context

The deterministic benchmark passed all evaluated hard assertions. Claude evaluated 2/3 runs because run #2 was infrastructure-blocked by `agent runner budget exceeded`; that blocked run is excluded from subjective scoring. Codex evaluated 3/3 runs.

| Agent | Hard assertion pass rate | Deterministic output-quality score | Infrastructure-blocked runs |
|---|---:|---:|---:|
| Claude | 100.0% (2/2) | 97.6% | 1 |
| Codex | 100.0% (3/3) | 100.0% | 0 |

The benchmark prompt asked each runner to create `package-update-plan.md` from `package.json`, `npm-view-times.json`, and `package-lock-note.md`, including pnpm migration, age-gate config, eligible and skipped versions, React 18 to 19 and Vitest 1 to 3 risk handling, verification commands, and the runner-native next command.

## Agent-Review Verdict

All evaluated outputs are at least good enough for a next operator to act on. The strongest outputs combine age-gate proof, clear npm-to-pnpm migration sequencing, eligible/skipped version tables, and major-upgrade stop routes. The main weakness is actionability variance: some plans say "run tests/build" or "apply batches" without a crisp first mutation step and exact per-batch validation gate, so the next operator would still need to refine the execution sequence before changing a real lockfile.

## Score Table

| Reviewer | Runner | Run index | Score | Grade band | Notes |
|---|---|---:|---:|---|---|
| Codex agent-review | Claude | 0 | 88 | good | Strong evidence and coverage; batch order places Vitest before React in one section, but the execution handoff is still actionable. |
| Codex agent-review | Claude | 1 | 84 | good | Useful and complete, but less ergonomic: "manager migration -> zod -> vitest -> react" and duplicate numbering make the next execution order less crisp. |
| Codex agent-review | Codex | 0 | 93 | excellent | Clear artifact with strong retained evidence and constraints; best balance of specificity and scope control. |
| Codex agent-review | Codex | 1 | 91 | excellent | Clear and concise; good first-batch handoff and focused checks. |
| Codex agent-review | Codex | 2 | 88 | good | Comprehensive, but includes `vitest run --runInBand` with a fallback note; that command may be stale for Vitest 3 and weakens validation ergonomics. |

**Median subjective score:** 88  
**Score range:** 84-93

## Common Strengths

- Correctly selected age-eligible versions: `pnpm@10.11.0`, `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4`.
- Correctly rejected fresh versions inside the 8-day window, including unqualified `pnpm@latest`.
- Kept ownership clear for `min-release-age=8`, `minimum-release-age=11520`, and `minimumReleaseAge: 11520`.
- Named React and Vitest major-upgrade risks with stop routes to `migrate`.
- Used runner-native next commands: `/run` for Claude and `$run` for Codex.

## Common Weaknesses

- Actionability is uneven. Some outputs provide the required sections but do not reduce the first executable batch to a precise, low-risk operator checklist.
- Per-batch validation is sometimes generic. A next operator should see exact proof per batch, such as package-manager pin verification, `.npmrc` checks, lockfile generation, and package-specific smoke checks before the next version bump.
- One Codex output includes `pnpm exec vitest run --runInBand` with a caveat. The caveat prevents a hard failure, but it still hands the next operator a possibly unsupported Vitest 3 flag instead of a safer fixture-native smoke command.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| The skill permits good but broad plans that do not always expose a concrete first mutation step and per-batch stop gate. | target-skill contract | `global/codex/update-packages/SKILL.md` section `Apply updates in safe batches` and `Output` | Require dependency-update plans to include a "Batch 0 / Batch 1 / Batch 2" execution checklist where each batch has exact mutation command, exact verification command, expected artifact or version proof, and stop condition before proceeding. | `pnpm verify --skill update-packages` plus a focused benchmark rerun should show the artifact includes per-batch commands and expected proof for package manager migration, Zod, React, and Vitest. | `$targeted-skill-builder update-packages per-batch actionability` |
| The deterministic rubric surfaced Claude actionability at 50% but still allowed broad handoffs to look nearly perfect overall. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` quality evaluator for `update-packages` | Tighten `workflow-actionability` so it checks for exact per-batch mutation command, verification command, expected proof, and "do not proceed on red" gate. Keep this as quality scoring unless the project wants it promoted to a hard assertion. | `pnpm verify --skill update-packages` should pass static setup checks; `$benchmark-test-skill update-packages` should lower quality scores for outputs that only list generic `pnpm test` / `pnpm build` without per-batch proof. | `$targeted-skill-builder update-packages benchmark actionability rubric` |
| A reviewed output suggested `vitest run --runInBand`, which may not be a stable Vitest 3 smoke command. | target-skill contract | `global/codex/update-packages/SKILL.md` Vitest/build-tool compatibility guidance | Add guidance to avoid Jest-only or version-uncertain flags in migration plans unless verified against the selected version; prefer project script first (`pnpm test`) plus an explicitly discovered test-file command. | `pnpm verify --skill update-packages` should include a contract/rubric fact rejecting unverified runner flags when the fixture asks for Vitest 1 to 3 planning. | `$targeted-skill-builder update-packages vitest smoke command specificity` |

## Deterministic-Rubric Notes

The deterministic rubric was directionally useful: it caught the Claude actionability weakness while still passing compliant artifacts. It did not surface the Vitest `--runInBand` ergonomics issue as a distinct signal. That issue is not severe enough to treat the benchmark as failed, but it is worth tightening because unsupported runner flags create avoidable operator friction.

## Next

**Next work:** tighten `update-packages` output contract so every dependency-update plan includes exact per-batch mutation commands, verification commands, expected proof, and stop gates.

**Recommended next command:** `$targeted-skill-builder update-packages per-batch actionability`
