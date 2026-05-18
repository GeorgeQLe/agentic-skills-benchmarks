# Triage: update-packages Benchmark Failure - 2026-05-18

**Workflow:** `$session-triage update-packages benchmark failure`
**Target skill:** `update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Raw sessions:** `tests/benchmarks/runs/update-packages-claude-225f6efc/`, `tests/benchmarks/runs/update-packages-codex-fd2c4602/`

## User-Identified Issue

The fresh `$benchmark-test-skill update-packages` run failed after the pnpm toolchain-proof and age-gate semantics update. The failures were on `Output proves selected pnpm toolchain age eligibility` and `Output preserves age-gate key semantics`.

## Verification Verdict

**Verified as a benchmark harness false negative with partial infrastructure blocks.**

The benchmark failure itself is real: the report records failed hard assertions and critical quality failures. The root cause is not verified as an `update-packages` skill-contract failure because the retained artifacts contain the behavior the contract requested.

Evidence:

- Claude session `update-packages-claude-225f6efc` had one evaluated failed run and two infrastructure-blocked runs due to agent runner budget exhaustion.
- Codex session `update-packages-codex-fd2c4602` had three evaluated failed runs, all on age-gate semantics.
- Failed Codex artifacts say `min-release-age=8` is npm's relative age gate and `minimum-release-age=11520` / `minimumReleaseAge: 11520` are pnpm coverage.
- Failed Claude retained text includes pnpm publish evidence such as `npm view pnpm@10.11.0 time.version` with `2026-05-01T12:00:00.000Z`, plus the correct npm/pnpm age-gate ownership language.
- Direct regex replay against representative retained snippets returned `false` for the current `UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN` and `UPDATE_PACKAGES_AGE_GATE_SEMANTICS_PATTERN`.

## Timeline

1. `$targeted-skill-builder update-packages pnpm toolchain proof and age-gate semantics` tightened mirrored `update-packages` contracts and the custom benchmark setup.
2. `$benchmark-test-skill update-packages` verified layer1 successfully and ran both-agent benchmark coverage.
3. Claude had two runner-budget infrastructure blocks and one evaluated failed artifact.
4. Codex completed all three runs but failed age-gate semantics in every run.
5. Retained artifacts showed the desired proof and semantics in several failed runs, indicating the hard-assertion patterns were too brittle.

## Root Cause

The benchmark setup uses overly narrow regexes for two newly added checks:

- `UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN` requires `packageManager ... pnpm@...` to appear before proof language in a narrow shape. It misses valid retained evidence where the publish-time evidence appears first and the `packageManager` recommendation appears later.
- `UPDATE_PACKAGES_AGE_GATE_SEMANTICS_PATTERN` requires npm/pnpm and the setting literals to appear in constrained punctuation windows. It misses valid bullet-list wording such as `` `min-release-age=8` is npm's relative age gate `` and `` `minimum-release-age=11520` is pnpm coverage ``.

The current mirrored `update-packages` contracts are adequate for the intended behavior. The failure is in benchmark pattern calibration and focused layer1 coverage, not in the skill contract.

## Responsible Contract Gap

Responsible owner: `tests/layer4/setups/tier23-global-workflows.setup.ts` and focused layer1 coverage in `tests/layer1/bench-setups.test.ts`.

No mirrored `global/codex/update-packages/SKILL.md` or `global/claude/update-packages/SKILL.md` contract change is currently justified by this evidence.

## Recommended Fix

Update the `update-packages` benchmark setup to accept semantically correct variants while still rejecting missing proof and reversed semantics.

Proposed changes:

- Replace the pnpm proof regex with logic or broader patterns that accept either order:
  - `packageManager: "pnpm@10.11.0"` followed by `npm view pnpm@10.11.0 time.version` / publish timestamp evidence.
  - publish timestamp evidence followed by the matching `packageManager` recommendation.
  - retained `npm-view-times.json` evidence that names the selected pnpm version and publish timestamp.
- Replace the age-gate semantics regex with either structured checks or independent sentence/bullet checks:
  - accept `` `min-release-age=8` is npm's relative age gate `` and equivalent wording;
  - accept `` `minimum-release-age=11520` is pnpm coverage `` and `` `minimumReleaseAge: 11520` is pnpm project config coverage ``;
  - continue rejecting reversed claims such as npm owning `minimum-release-age=11520` and pnpm owning `min-release-age=8`.
- Add focused layer1 examples from these failed retained artifacts so the false-negative shape cannot recur.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent codex --runs 1 --chunk-size 1 --pause 0
rg -n "UPDATE_PACKAGES_PNPM_TOOLCHAIN_PROOF_PATTERN|UPDATE_PACKAGES_AGE_GATE_SEMANTICS_PATTERN|Output preserves age-gate key semantics" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1/bench-setups.test.ts
git diff --check
```

Expected proof:

- Failed-run snippets from `update-packages-codex-fd2c4602` pass the age-gate semantics check.
- Failed-run snippets from `update-packages-claude-225f6efc` pass pnpm proof when publish-time evidence and matching package-manager recommendation are both present.
- Existing missing-proof and reversed-semantics negative examples still fail.

## Confidence And Evidence Gaps

Confidence: high. The retained artifacts and regex replay directly show that the benchmark patterns miss acceptable output forms.

Evidence gaps:

- Claude had only one evaluated run because two runs were infrastructure-blocked by agent-runner budget exhaustion.
- A full both-agent rerun should wait until after the benchmark pattern fix; a Codex smoke benchmark is enough to validate the narrow calibration first.

## Next Route

Recommended next skill: `$targeted-skill-builder update-packages benchmark pnpm proof and age-gate semantics tolerance`
