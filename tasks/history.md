# Session History

## 2026-07-03 — Fix three systemic benchmark false-negative defect classes

Implemented the audited May 2026 defect classes in the post-split harness.

- **Class 1 (negation-blind rubrics):** Generalized the per-line pnpm-latest
  negation idea into a shared, exported `mentionIsNegated(text, term)` in
  `tests/harness/bench-quality.ts`. Routed both forbidden primitives
  (`forbiddenFabrications`, `specificity` forbiddenPhrases) through it —
  negation-aware by default (inline cues + Non-Goals-style section headings),
  with a `strict?` opt-out. Threaded `strict` through
  `forbiddenFabricationCriterion` / `specificityCriterion`. Set `strict: true`
  on the two design-system token/asset guards. Removed the now-redundant
  `allowedFixtureTerms: ["package-lock.json"]` hatch on update-packages (kept
  the field + filter). Exported `avoidsUnqualifiedPnpmLatest` /
  `provesSelectedPnpmToolchainAgeEligibility` for offline testing. Fixes the
  skill-interview "Non-Goals: no GitHub Actions" false-negative.
- **Class 3 (infra counted as skill failure):** Extracted the per-agent verdict
  logic into an exported pure `classifyVerdict` in
  `scripts/lib/regression-verdict.mjs`. A fully infra-blocked lane
  (`evaluatedRuns === 0`) now returns verdict `blocked` (not `regression`),
  treats passRate/wilsonLower as null for the drop comparison, and does not
  exit 1 or route to skill triage.
- **Class 2 (brittle fixtures):** Added a `tests/layer1/no-pinned-run-ids.test.ts`
  lint guardrail against re-pinning rotating run IDs in `tests/**` / `scripts/**`.

Validation (offline): `pnpm test` (layer1) green — 33 tests across 7 files
(4 new: forbidden-negation, bench-setup-guards, regression-verdict,
no-pinned-run-ids); `pnpm bench:coverage` valid (208 skills). No live layer4
runs.

Outstanding: an unrelated git-fixture setup hardening change
(`git-fixture-commit-and-push.setup.ts`, `git-fixture-sync.setup.ts`,
`tests/layer1/git-fixture.test.ts`) was present in the working tree from outside
this session and was left uncommitted for separate review.
