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

## 2026-07-04 — Live TUI model dashboard (SkateBench-style)

Added a live terminal dashboard that runs the benchmark suite across a matrix of
Claude and GPT models and renders a ranked leaderboard (pass rate, p50 latency,
cost), a model × task grid, and a rolling activity tail.

- **Model-aware runners:** threaded an optional `model` through `RunOptions` and
  both CLI runners (`runClaude` → `--model`, `runCodex` → `--model`). Additive;
  unset preserves each CLI's default model and prior behaviour.
- **Single source of truth for scoring:** extracted the per-run assertion +
  quality-gate evaluation out of `runChunk` into an exported `buildRunResult`, so
  the dashboard scores every cell through the exact same pass/fail logic as
  `pnpm bench`.
- **New module `tests/harness/dashboard/`:** `model-matrix.ts` (competitor field
  + `--models` selection), `state.ts` (aggregates, percentiles, cell status),
  `orchestrator.ts` (worker-pool matrix runner with an atomic reserve-before-
  dispatch budget gate; `--mock` simulator for spend-free previews), `render.ts`
  (zero-dep ANSI leaderboard/grid/activity), `live.ts` (TTY repaint + non-TTY
  line log). CLI entry `tests/dashboard.ts`; `pnpm bench:dashboard`.
- **Live-run guard:** real runs require `LIVE_AGENT_TESTS=1`; a per-run summary
  is written under `tests/benchmarks/dashboard/`.

Validation (offline): `pnpm test` green — 43 layer1 tests (new
`dashboard.test.ts`: matrix selection, aggregate consistency, budget ceiling
under concurrency); `pnpm bench:coverage` valid (208 skills). No live runs.

Shipped the full working tree grouped by feature at the user's direction:
dashboard, opt-in quality-rubric gating + anti-prompt-echo lint, setup/fixture
hardening, and afps-status benchmark coverage. `.claude/` and `.codex/` left
uncommitted as generated local skill roots.

## 2026-07-04 — Ban Fable 5 from the live dashboard

User goal: prevent the SkateBench-style dashboard from running Fable 5 after it
consumed too much quota, while keeping GPT-5 targets available.

Changed files:
- `tests/harness/dashboard/model-matrix.ts` — added an explicit banned-model
  guard for `fable-5`; retained `gpt-5` and `gpt-5-codex` in the allowed matrix.
- `tests/layer1/dashboard.test.ts` — added regression coverage proving Fable 5
  is rejected and GPT-5 selection remains valid.
- `README.md` — documented the Fable 5 dashboard ban.
- `tasks/lessons.md` — recorded the correction that model bans must not be
  broadened by family inference.
- `tasks/history.md` — recorded this shipping manifest.

User-goal mapping: explicit selection of `--models fable-5` now fails before any
dashboard work is dispatched; `--models gpt-5` still runs in mock mode and
remains listed by `--list-models`.

Tests run:
- `pnpm test -- tests/layer1/dashboard.test.ts`
- `pnpm bench:dashboard --list-models`
- `pnpm bench:dashboard --models fable-5 --mock` (expected failure proving the
  guard)
- `pnpm bench:dashboard --models gpt-5 --mock --skills investigate --runs 1
  --budget 1 --no-live`

Skipped tests: full live dashboard run skipped because the change is a
pre-dispatch model-selection guard and live runs spend quota; mock CLI coverage
exercises the same selector without external spend.

Adversarial review: checked that the first guard executes before model lookup,
so Fable 5 fails with a ban message even though it is not in the default matrix;
checked that GPT-5 IDs are not in the banned set and remain listed.

Residual risk: only the exact dashboard target id `fable-5` is blocked. If a
future alias is added for the same model under a different id, it must be added
to the banned-model set with a corresponding test.

Rollback note: remove `fable-5` from `BANNED_MODEL_IDS` and delete the README /
test / lesson entries if the model is intentionally allowed again.

Next command: `$ship-end`

## 2026-07-05 — SkillBench CLI, budget, catalog metadata, and pack discriminator completion

User goal: wrap and ship the current benchmark harness session.

Changed files:
- `README.md` — documented the CLI-based benchmark invocation and shared suite
  budget behavior.
- `package.json`, `tests/skillbench.ts`, `tests/harness/cli/*` — added the
  unified `pnpm skillbench` command surface, list/run/dashboard/verify/stress
  subcommands, shared argument parsing, and deterministic fake-data stress
  checks.
- `tests/harness/bench-budget.ts`, `tests/harness/cli/bench-command.ts`,
  `tests/bench.ts`, `tests/layer1/bench-budget.test.ts`,
  `tests/layer1/skillbench-cli.test.ts` — added top-level budget reservation for
  broad benchmark runs and ensured worker invocations receive only the reserved
  run count.
- `tests/harness/skills-catalog.ts`, `tests/harness/bench-types.ts`,
  `tests/harness/bench-persistence.ts`, `tests/harness/bench-report.ts`,
  `tests/layer4/bench.test.ts`, `tests/layer1/bench-coverage.test.ts`,
  `tests/layer1/bench-persistence-report.test.ts` — persisted imported catalog
  ref/version/source commit/release channel in manifests, reports, and
  benchmark worker config.
- `tests/dashboard.ts`, `tests/harness/cli/dashboard-command.ts`,
  `tests/harness/dashboard/*`, `tests/layer1/dashboard.test.ts` — routed the
  dashboard through the shared CLI module and persisted catalog metadata in
  dashboard summaries.
- `tests/layer4/setups/packs/pack-workflows.setup.ts`,
  `tests/layer1/pack-discriminator-ratchet.test.ts` — completed fixture-derived
  required-output discriminators for pack workflow setups and emptied the leaky
  pack allowlist ratchet.
- `tests/harness/runner.ts`,
  `tests/layer4/setups/tier23-base-workflows.setup.ts` — fixed TypeScript
  typing issues surfaced by the pre-ship `tsc --noEmit` gate.
- `.gitignore` — ignored generated local skill roots, pack docs, and benchmark
  runtime output.

User-goal mapping: the session boundary now ships the pending CLI, budget,
metadata, dashboard summary, and discriminator-ratchet work with docs and
verification.

Tests run:
- `pnpm test` — 67 layer1 tests passed.
- `pnpm bench --verify` — catalog freshness, 208-skill benchmark coverage, and
  67 layer1 tests passed.
- `pnpm skillbench stress --json` — deterministic stress suite passed, including
  expected-failure guards for insufficient budget, malformed flags, live-run
  opt-in, and banned Fable 5 selection.
- `pnpm exec tsc --noEmit` — passed after type-only harness fixes.

Skipped tests: live agent benchmark runs were skipped because this ship covers
offline command routing, metadata persistence, fixture discrimination, and
budget pre-dispatch behavior; live runs would spend agent quota and are still
guarded by `LIVE_AGENT_TESTS=1`.

Adversarial review: checked the budget path for partial reservations and fixed
the worker environment to pass `BENCH_RUNS` / `BENCH_CHUNK_SIZE` equal to the
reserved count rather than relying on lower-layer budget abortion. Confirmed
generated `.agents/skillpacks`, `.claude/skills`, `.codex/skills`, and
`tests/benchmarks` outputs are ignored and not committed.

Residual risk: the pack discriminator updates are regex-heavy; offline ratchet
coverage proves every pack definition has a discriminator and blocks simple
transcriber output, but only live agent runs can measure real pass-rate impact.

Rollback note: revert this session commit to restore the previous direct
`bench.ts` / `dashboard.ts` entrypoints, remove `skillbench` scripts, and return
the pack discriminator allowlist to its previous backlog.

Next command: `$exec`
