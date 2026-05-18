# Benchmark Agent Review: update-packages - 2026-05-18

**Workflow:** `$benchmark-agent-review update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Reviewed skill:** `update-packages`
**Review object:** retained generated `package-update-plan.md` artifacts, not benchmark strictness

## Source Evidence

| Runner | Run directory | Run indexes | Hard assertion pass rate | Deterministic quality | Infrastructure blocked |
|---|---|---:|---:|---:|---:|
| Claude | `tests/benchmarks/runs/update-packages-claude-fa542bcd/` | 0, 1, 2 | 100.0% (3/3) | 91.2% | 0 |
| Codex | `tests/benchmarks/runs/update-packages-codex-03d220e0/` | 0, 1, 2 | 100.0% (3/3) | 98.5% | 0 |

Retained artifact content was available in each `run-*.json` under `artifacts["package-update-plan.md"]`, so all six evaluated runs were reviewed. No infrastructure-blocked runs were scored.

## Verdict

Subjective verdict: **good overall**. The generated plans are operator-usable: they select only age-eligible dependency versions, preserve skipped-package evidence, avoid unqualified `pnpm@latest`, include persistent age-gate configuration, isolate React and Vitest major upgrades, define focused smoke checks, and use runner-native `/run` or `$run` final routes.

The main weakness is pnpm toolchain-version proof. Several artifacts choose a concrete pnpm version from general toolchain knowledge or the local environment without proving its publish timestamp from fixture evidence before turning it into a `packageManager` recommendation. One Claude artifact also reverses the explanatory ownership of `.npmrc` age-gate keys even though it writes both required values. These are not failing outputs, but they are the highest-impact quality gaps because this skill exists to make supply-chain update decisions evidence-backed.

## Score Table

| Reviewer | Runner | Run | Score | Grade | Notes |
|---|---|---:|---:|---|---|
| Codex review | Claude | 0 | 90 | excellent | Strong batch plan, pinned pnpm 9.x, clear compatibility checks, precise `/migrate` stop conditions. Could better prove the selected pnpm version from fixture evidence. |
| Codex review | Claude | 1 | 88 | good | Very actionable and correctly defers pnpm 10.x blast radius, with strong React/Vitest checks. Claims pnpm 9.15.0 as toolchain default without retained registry proof. |
| Codex review | Claude | 2 | 82 | good | Usable plan with concrete batches and stop routes, but the `.npmrc` explanation reverses npm/pnpm key semantics and the pnpm version proof is mostly asserted. |
| Codex review | Codex | 0 | 89 | good | Broadest and most ergonomic plan, includes workspace `minimumReleaseAge`, package-manager setup batch, and focused smokes. Uses local `pnpm@10.22.0` with a verification caveat rather than proven eligibility. |
| Codex review | Codex | 1 | 88 | good | Strong phased plan and clear `$migrate` routes, but `pnpm@10.11.0` is selected as age-eligible without showing the registry timestamp evidence. |
| Codex review | Codex | 2 | 86 | good | Good risk handling and verification commands, but uses local `pnpm@10.22.0` provisionally and would let a next operator carry the proof step into execution. |

Median subjective score: **88/100**.
Score range: **82-90**.

## Common Strengths

- All six artifacts selected eligible dependency targets from the fixture: React `19.2.0`, Zod `3.25.76`, and Vitest `3.2.4`.
- All six skipped newer versions inside the 8-day window, including React `19.3.0`, Zod `4.1.12`, and Vitest `4.0.0`.
- All six avoided recommending unqualified `pnpm@latest`; mentions of `pnpm@latest` were warnings or negations.
- Major-upgrade handling is materially better than the earlier review target: React 18 to 19 and Vitest 1 to 3 are isolated, have peer/config checks, focused smokes, and migration stop routes.
- Runner-native next routes were correct: Claude artifacts ended with `/run`, Codex artifacts ended with `$run`.

## Common Weaknesses

- Pnpm version selection is sometimes asserted from general toolchain knowledge instead of proven from fixture evidence or retained registry metadata.
- Codex runs that selected `pnpm@10.22.0` correctly warn to verify its publish timestamp before real mutation, but still present it as the planned `packageManager` value. That is weaker than proving age eligibility before the recommendation.
- One Claude run describes `.npmrc` key semantics imprecisely: it says pnpm reads `minimum-release-age` and npm reads `min-release-age`, while the skill contract requires npm's `min-release-age=8`, pnpm coverage through `minimum-release-age=11520`, and `minimumReleaseAge: 11520` where the active pnpm configuration requires it.
- Deterministic quality context missed the age-gate key semantics drift and does not require retained proof of the pnpm version's publish timestamp.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| Pnpm package-manager version can be selected without retained publish-time proof. | Target-skill contract + benchmark rubric | `global/codex/update-packages/SKILL.md`, `global/claude/update-packages/SKILL.md`, and `tests/layer4/setups/tier23-global-workflows.setup.ts` | Require outputs to either use an existing project-pinned pnpm version or show retained registry/toolchain evidence that the chosen pnpm version is older than 8 full days before recommending it in `packageManager`. If only a local pnpm version is observed, require the plan to mark it provisional and make registry verification a blocker before mutation. | Add focused layer1 setup/quality coverage where a plan with `packageManager: "pnpm@10.22.0"` and no `npm view pnpm@10.22.0 time.version` evidence loses quality credit, while a plan with explicit publish-time proof or existing project pin passes. Then run `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages pnpm toolchain proof and age-gate semantics` |
| Age-gate key semantics can drift while literals still pass. | Benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` | Add a quality criterion that credits the two durable settings only when their tool/config ownership is described consistently with the skill contract: `.npmrc` must contain `min-release-age=8` plus `minimum-release-age=11520`, and `minimumReleaseAge: 11520` must be required when the active pnpm project config needs it. | Add layer1 examples for correct and reversed key explanations. Verify that reversed explanations fail the new criterion without failing otherwise good plans. | `$targeted-skill-builder update-packages pnpm toolchain proof and age-gate semantics` |

## Deterministic Rubric Notes

The hard assertions and deterministic output-quality scores were useful but incomplete. They caught the high-level contract requirements and all six outputs passed them, yet they did not distinguish evidence-backed pnpm version selection from unproven concrete version selection. They also did not catch the reversed `.npmrc` key explanation in Claude run 2. A targeted rubric addition would make future deterministic scores line up better with subjective operator risk.

## Next Work

Tighten `update-packages` so package-manager version recommendations are evidence-backed and age-gate key semantics are preserved in generated plans.

**Recommended next command:** `$targeted-skill-builder update-packages pnpm toolchain proof and age-gate semantics`
