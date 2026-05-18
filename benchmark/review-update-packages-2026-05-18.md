# Benchmark Agent Review: update-packages - 2026-05-18

**Workflow:** `$benchmark-agent-review update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Reviewed skill:** `update-packages`
**Review object:** retained generated `package-update-plan.md` artifacts, not benchmark strictness

## Source Evidence

| Runner | Run directory | Run indexes | Hard assertion pass rate | Deterministic quality | Infrastructure blocked |
|---|---|---:|---:|---:|---:|
| Claude | `tests/benchmarks/runs/update-packages-claude-bdc852e4/` | 0, 2 | 100.0% (2/2 evaluated) | 94.0% | 1 |
| Codex | `tests/benchmarks/runs/update-packages-codex-443aab01/` | 0, 1, 2 | 100.0% (3/3 evaluated) | 99.6% | 0 |

Retained artifact content was available in each evaluated `run-*.json` under `artifacts["package-update-plan.md"]`. Claude run #1 was excluded from subjective scoring because it was infrastructure-blocked by agent runner budget exhaustion.

## Verdict

Subjective verdict: **excellent overall**. The five evaluated plans are operator-ready: they preserve fixture evidence, choose age-eligible package and pnpm versions, skip too-new versions, explain npm and pnpm age-gate ownership, isolate React and Vitest major upgrades, name peer/config checks, include focused smoke checks, and end with runner-native next routes.

The only material follow-up is benchmark-rubric alignment. Claude artifacts include `package-update-plan.md` and verification sections, but the deterministic quality rubric under-credited artifact-reference and actionability. That does not make the generated plans weak; it means future deterministic quality summaries may slightly mislead triage unless the rubric recognizes these valid retained shapes.

## Score Table

| Reviewer | Runner | Run | Score | Grade | Notes |
|---|---|---:|---:|---|---|
| Codex review | Claude | 0 | 92 | excellent | Strong plan with package-manager migration, retained pnpm timestamp proof, clear age-gate ownership, skipped versions, React/Vitest risk checks, and `/migrate` stop conditions. Minor issue: final verification commands include `corepack prepare` in the same block as project checks, which is acceptable but less clean than separating toolchain setup from validation. |
| Codex review | Claude | 2 | 94 | excellent | Very actionable artifact: explicit npm-to-pnpm migration, exact pnpm publish-time proof, `.npmrc` plus pnpm project config semantics, eligible/skipped tables, staged majors, focused smokes, and `/run` route. |
| Codex review | Codex | 0 | 88 | good | Complete and safe, with artifact naming and retained evidence. The batch order puts React before Zod, which is workable but slightly less ergonomic than landing the low-risk Zod update before framework/runtime work. |
| Codex review | Codex | 1 | 92 | excellent | Strong operator handoff with direct config checks, package-manager lockfile proof, React/Vitest/Zod smoke checks, and a correct `$run` route. |
| Codex review | Codex | 2 | 93 | excellent | Best structured stop-condition section and crisp retained evidence. Good separation of migration, Zod, React, and Vitest batches with targeted migrate routes. |

Median subjective score: **92/100**.
Score range: **88-94**.

## Common Strengths

- All evaluated artifacts chose age-eligible targets: React `19.2.0`, Zod `3.25.76`, Vitest `3.2.4`, and pnpm `10.11.0`.
- All evaluated artifacts skipped too-new versions, including React `19.3.0`, Zod `4.1.12`, Vitest `4.0.0`, and pnpm `10.22.0`.
- All evaluated artifacts avoided recommending unqualified `pnpm@latest`; any mention was negated or explanatory.
- Age-gate ownership is clear: npm `min-release-age=8`, pnpm `.npmrc` `minimum-release-age=11520`, and pnpm project config `minimumReleaseAge: 11520` where supported.
- Major-upgrade handling is implementation-ready: React 18 to 19 and Vitest 1 to 3 have batch boundaries, peer/config checks, focused smoke checks, and `$migrate`/`/migrate` stop routes.
- Runner-native next routes are correct: Claude artifacts use `/run`, Codex artifacts use `$run`.

## Common Weaknesses

- One Codex run orders React before the lower-risk Zod update. It remains usable, but a next operator would usually prefer package-manager migration, low-risk Zod, then React/Vitest majors.
- Some plans could better separate setup commands from verification commands. They still include the required checks, but cleaner grouping would reduce operator confusion during execution.
- The deterministic quality rubric under-credits valid Claude retained evidence: it reports missing `package-update-plan.md` and missing `validation` even though the artifact and/or stdout contain the plan name and verification commands.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| Deterministic quality under-credits valid retained artifacts for artifact-reference and actionability. | Benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` and focused layer1 setup/quality coverage in `tests/layer1/bench-setups.test.ts` | Update the `workflow-artifact-reference` and `workflow-actionability` checks so retained artifact text with a `# package-update-plan.md` heading, stdout naming `package-update-plan.md`, or a `## Verification Commands` section receives credit. Keep negative coverage for outputs that do not name the artifact and do not provide verification/action language. | Add layer1 examples using the Claude `bdc852e4` retained shapes, then run `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages benchmark artifact-reference actionability tolerance` |

## Deterministic Rubric Notes

The hard assertions and deterministic quality scores correctly show that the latest evaluated run passed. The residual mismatch is narrow: Claude's generated plans are strong, but two quality criteria read as under-scored in the report. Fixing that would make future triage less likely to chase a false weakness after otherwise excellent generated artifacts.

## Next Work

Tighten the `update-packages` benchmark rubric so valid artifact-reference and verification/actionability evidence is credited consistently.

**Recommended next command:** `$targeted-skill-builder update-packages benchmark artifact-reference actionability tolerance`
