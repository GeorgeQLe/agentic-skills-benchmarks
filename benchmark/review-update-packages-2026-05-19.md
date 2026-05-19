# Benchmark Agent Review: update-packages - 2026-05-19

**Source benchmark report:** `benchmark/test-update-packages-2026-05-19.md`

**Reviewed run directories:**

- `tests/benchmarks/runs/update-packages-claude-f8355f37/`
- `tests/benchmarks/runs/update-packages-codex-1ed5350e/`

## Benchmark Context

The deterministic benchmark passed all evaluated hard assertions for both runners. No runs were infrastructure-blocked.

| Agent | Hard assertion pass rate | Deterministic output-quality score | Infrastructure-blocked runs |
|---|---:|---:|---:|
| Claude | 100.0% (3/3) | 97.0% | 0 |
| Codex | 100.0% (3/3) | 100.0% | 0 |

The benchmark prompt asked each runner to create `package-update-plan.md` from `package.json`, `npm-view-times.json`, and `package-lock-note.md`, including pnpm migration, npm/pnpm age-gate config, eligible and skipped versions, React 18 to 19 and Vitest 1 to 3 risk handling, verification commands, and the runner-native next command.

## Agent-Review Verdict

The retained outputs are mostly strong. All six artifacts preserve the critical fixture facts, choose age-eligible versions, avoid unqualified `pnpm@latest`, separate React and Vitest major risks, and finish with the correct runner-native `/run` or `$run` handoff. The Codex outputs are consistently excellent operator handoffs; the first two Claude outputs are also excellent despite one deterministic regex miss on actionability.

One Claude output is only usable, not excellent. Claude run 2 tells the operator to remove `package-lock.json` before `pnpm import`, then later repeats `rm package-lock.json` before `pnpm install`. That conflicts with the skill contract's safer order: seed/import from the npm lockfile first, establish a clean pnpm install, then delete the npm lockfile only after success. The same artifact also routes broad compatibility work to bare `/migrate` rather than target-specific `/migrate react` or `/migrate vitest`. The deterministic rubric partially surfaced the bare route but did not catch the unsafe lockfile migration ordering.

## Score Table

| Reviewer | Runner | Run index | Score | Grade band | Notes |
|---|---|---:|---:|---|---|
| Codex agent-review | Claude | 0 | 92 | excellent | Clear pnpm migration, retained publish-time evidence, explicit Batch 0/0a/1/2/3 table, expected proof, stop gates, and target-specific `/migrate react` and `/migrate vitest` routes. The deterministic actionability failure appears to be a pattern false negative, not an operator-quality failure. |
| Codex agent-review | Claude | 1 | 94 | excellent | Strongest Claude artifact. It includes package-manager fallback handling, per-batch expected proof, focused React/Vitest checks, and target-specific `/migrate react`, `/migrate vitest`, and `/migrate pnpm` routes. |
| Codex agent-review | Claude | 2 | 72 | usable | Preserves version and age-gate facts, but weakens operator safety by saying to remove `package-lock.json` before `pnpm import` and by using a bare `/migrate` handoff for known compatibility targets. |
| Codex agent-review | Codex | 0 | 95 | excellent | Detailed plan with exact batches, artifact proof, package-manager and age-gate evidence, focused smokes, and target-specific `$migrate npm-to-pnpm`, `$migrate zod`, `$migrate react-19`, and `$migrate vitest-3` routes. |
| Codex agent-review | Codex | 1 | 93 | excellent | Clear and safe. Slightly less thorough than Codex run 0, but still gives concrete mutation commands, verification commands, expected proof, and target-specific migrate handoffs. |
| Codex agent-review | Codex | 2 | 91 | excellent | Compact but still operator-ready, with correct evidence and target-specific `$migrate zod`, `$migrate react`, and `$migrate vitest` routes. |

**Median subjective score:** 93
**Score range:** 72-95

## Common Strengths

- Correctly selected age-eligible versions: `pnpm@10.11.0`, `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4`.
- Correctly skipped fresh versions inside the 8-day safety window, including `pnpm@10.22.0`, `react@19.3.0`, `zod@4.1.12`, and `vitest@4.0.0`.
- Avoided unqualified `pnpm@latest` and retained publish-time proof for the selected package-manager pin.
- Kept npm and pnpm age-gate ownership clear with `min-release-age=8`, `minimum-release-age=11520`, and `minimumReleaseAge: 11520`.
- Separated React and Vitest majors into isolated batches with compatibility checks and focused smoke tests.
- Preserved runner-native next routing: `/run` for Claude and `$run` for Codex.

## Common Weaknesses

- One retained Claude artifact gives unsafe package-manager migration ordering by deleting `package-lock.json` before `pnpm import` can seed `pnpm-lock.yaml`.
- One retained Claude artifact uses a bare `/migrate` route even though the failing compatibility domains are known: React 19, Vitest 3, and pnpm migration.
- The deterministic quality rubric flags the bare route in Claude run 2, but it does not treat unsafe npm-to-pnpm lockfile ordering as a quality failure.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| Unsafe lockfile migration ordering passed deterministic scoring: Claude run 2 says to remove `package-lock.json` before `pnpm import`, even though the safe contract is import/install first and delete npm lockfile only after pnpm succeeds. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` quality evaluator for `update-packages`, plus focused cases in `tests/layer1/bench-setups.test.ts` | Add an `update-packages` quality criterion that rejects plans where `package-lock.json` removal appears before `pnpm import` or before successful pnpm install proof. Positive examples should accept `pnpm import` then `pnpm install` then delete/remove `package-lock.json` only after success. | Add a retained-artifact negative case based on `tests/benchmarks/runs/update-packages-claude-f8355f37/run-002.json`; run `pnpm --dir tests exec vitest run --project layer1 bench-setups` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages benchmark lockfile migration ordering` |
| Bare migrate route reduced next-route ergonomics in Claude run 2. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` `UPDATE_PACKAGES_TARGETED_MIGRATION_ROUTE_PATTERN` and related layer1 coverage | Raise target-specific migrate routing to a critical quality failure for `update-packages` when the artifact names known major-upgrade domains but only routes to bare `/migrate` or `$migrate`. Accept `/migrate react`, `/migrate vitest`, `/migrate pnpm`, and runner-native `$migrate ...` equivalents. | Add a focused layer1 assertion that retained Claude run 2 fails critical quality for bare `/migrate` while Claude run 0/1 and Codex run 0/1/2 pass; run `pnpm --dir tests exec vitest run --project layer1 bench-setups`. | `$targeted-skill-builder update-packages benchmark lockfile migration ordering` |
| Deterministic actionability false negative on Claude run 0 creates noisy context even when the artifact is operator-ready. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` `UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN` | Accept the retained Batch 0/0a table shape when each row has mutation, verification, expected proof, and stop gate columns. Keep the stricter negative cases for missing per-batch proof. | Add retained Claude run 0 as a positive layer1 fixture and confirm `workflow-actionability` passes; run `pnpm --dir tests exec vitest run --project layer1 bench-setups`. | `$targeted-skill-builder update-packages benchmark lockfile migration ordering` |

## Deterministic-Rubric Notes

The hard assertions correctly establish compliance, but they are not sufficient to judge operator safety. The next rubric gap is not the target skill contract; the mirrored `update-packages` contracts already say to remove npm lockfiles only after pnpm install/update succeeds. The missing check is benchmark quality coverage for migration ordering in the generated artifact.

## Next

**Next work:** tighten `update-packages` benchmark quality coverage so unsafe npm-to-pnpm lockfile deletion order is rejected, while preserving the retained positive batch-actionability shapes.

**Recommended next command:** `$targeted-skill-builder update-packages benchmark lockfile migration ordering`
