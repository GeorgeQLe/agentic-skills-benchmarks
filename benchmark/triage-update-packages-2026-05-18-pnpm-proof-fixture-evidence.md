# Triage: update-packages pnpm Proof Fixture Evidence Failure - 2026-05-18

## Target

- Scope: latest `$benchmark-test-skill update-packages` rerun after the benchmark pnpm proof and age-gate semantics tolerance fix.
- Curated report: `benchmark/test-update-packages-2026-05-18.md`.
- Raw evidence:
  - `tests/benchmarks/runs/update-packages-codex-870b131b/report.json`
  - `tests/benchmarks/runs/update-packages-codex-870b131b/run-002.json`
  - `tests/benchmarks/runs/update-packages-claude-29df606d/report.json`
- Contracts and harness files:
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
  - `tests/layer4/setups/tier23-global-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Relevant lesson: `tasks/lessons.md` already records that package update skills must persist installer age gates.

## User-Identified Issue

The user asked for `$session-triage update-packages benchmark failure`, referring to the latest deterministic `update-packages` benchmark failure after the previous tolerance fix.

## Verification Verdict

**Verified as a benchmark harness false negative with a separate fully blocked Claude lane.** It is not verified as a mirrored `update-packages` skill-contract failure.

Claude session `update-packages-claude-29df606d` had 0 evaluated runs and 3 infrastructure blocks from agent runner budget exhaustion, so it provides no skill-output failure evidence.

Codex session `update-packages-codex-870b131b` had 3 evaluated runs, 2/3 hard assertion pass rate, 96.8% output quality, and one failed hard assertion in run #2: `Output proves selected pnpm toolchain age eligibility`.

The failed Codex artifact selected `packageManager: "pnpm@10.11.0"` and included retained fixture evidence:

- `npm-view-times.json` records `"10.11.0": "2026-05-01T12:00:00.000Z"`.
- The artifact says this is `older than 8 days`.
- The artifact skips `pnpm@10.22.0` because the same fixture records `"10.22.0": "2026-05-16T12:00:00.000Z"`, which is not older than 8 days.
- The artifact also says to retain registry proof with `npm view pnpm@10.11.0 time.10.11.0` before executing outside the fixture.

That satisfies the mirrored skill contract, which allows proving the chosen pnpm version is older than 8 full days by using retained project evidence, an existing project pin, or registry publish-time evidence such as `npm view pnpm@<version> time.version`.

## Timeline

1. `$targeted-skill-builder update-packages benchmark pnpm proof and age-gate semantics tolerance` updated the benchmark proof and age-gate assertion tolerance.
2. `$benchmark-test-skill update-packages` reran verify and the both-agent benchmark.
3. Verify passed. Claude was fully infrastructure-blocked by agent runner budget exhaustion.
4. Codex produced three evaluated artifacts. Runs #0 and #1 passed all hard assertions; run #2 failed only `Output proves selected pnpm toolchain age eligibility`.
5. The retained run #2 artifact contained valid fixture-based pnpm publish-time proof, but the benchmark pattern did not recognize the specific shape.

## Root Cause

`UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN` is still too syntax-sensitive for valid retained fixture evidence.

The current pattern accepts evidence shapes where the selected `pnpm@<version>` appears near wording such as `published`, `publish-time evidence`, `Retained publish-time evidence`, or an `npm view pnpm@<version> time.version` command with a returned date. Run #2 instead phrases the proof as:

- `pnpm@10.11.0` is selected.
- `npm-view-times.json` records `"10.11.0": "2026-05-01T12:00:00.000Z"`.
- That timestamp is older than 8 days.

The proof is semantically valid because the artifact is using the benchmark fixture's retained publish-time evidence, but the selected package name and timestamp are not in the exact adjacency shape the current regex expects.

## Responsible Contract Gap

The gap is in the benchmark harness and its focused layer1 coverage:

- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

The mirrored `global/codex/update-packages/SKILL.md` and `global/claude/update-packages/SKILL.md` contracts are adequate for this case because they explicitly allow retained project evidence.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark pnpm fixture evidence tolerance`.

Make the smallest durable harness update:

1. Update the pnpm toolchain proof evaluator to accept fixture evidence where:
   - a final or recommended `packageManager` value names `pnpm@<version>`;
   - retained fixture evidence names `npm-view-times.json`;
   - the same version appears as a JSON key such as `"<version>": "2026-05-01T12:00:00.000Z"` or equivalent retained publish-time record;
   - the artifact states the selected version is older than 8 days or age-eligible.
2. Prefer a small helper that extracts the selected pnpm version and checks for matching retained evidence, instead of widening the regex so much that mismatched-version proof could pass.
3. Add layer1 positive coverage using the exact failed run #2 shape.
4. Keep negative coverage where a local/toolchain pnpm version is recommended without retained publish-time evidence, and add or keep a mismatched-version negative if the helper makes that feasible.

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality`
- `pnpm --dir tests bench:coverage`
- `pnpm --dir tests verify --skill update-packages`
- A one-run Codex smoke benchmark for `update-packages` after the harness update, if targeted-skill-builder changes the benchmark setup.
- Targeted checks:
  - `rg -n "npm-view-times.json|UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN|Output proves selected pnpm" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts`
  - `git diff --check`

## Confidence And Evidence Gaps

Confidence: high.

The raw run artifact includes the selected pnpm version, retained fixture source, exact publish timestamp, older-than-8-days conclusion, and skip proof for the newer pnpm version. The quality evaluator failure note prints the missing regex pattern, which confirms the failure is an assertion-shape miss rather than absent proof.

No broad `$analyze-sessions` pass is needed. This is a localized benchmark evaluator tolerance gap already reproduced by persisted raw benchmark evidence.

## Recommended Next Skill

`$targeted-skill-builder update-packages benchmark pnpm fixture evidence tolerance`
