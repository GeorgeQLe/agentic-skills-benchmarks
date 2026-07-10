# Session History

## 2026-07-10 — Grok skill-command convention (`/skill` like Claude)

Decided and encoded runner route conventions so Grok does not false-fail on
Claude-compat slash handoffs (e.g. `benchmark-test-skill` → `/ship`).

- **Convention:** Claude + Grok use `/skill`; Codex uses `$skill`. Grok discovers
  Claude-compat skills and exposes them as slash commands.
- **`tests/layer4/setup-helpers/routing.ts`:** `skillCommandPrefix`,
  `skillCommandForAgent`, `recommendedRoutesFor`, `runnerRouteVariants`,
  `resolveRecommendedRoute` (Grok falls back to Claude's slash route),
  `alternateSkillCommand`.
- **Setups wired through helpers:** tier1, tier23, pack workflows, and
  `afps-status` (was `agent === "claude" ? / : $`, which mis-graded Grok as Codex).
- **Prompts:** runner-aware fixtures mention Grok slash alongside Claude.
- **Layer1:** `routing-conventions.test.ts` locks the convention and proves
  `benchmark-test-skill` hard-asserts `/ship` for Grok.

Validation: `pnpm test` (layer1) after the change.

## 2026-07-10 — First-class Grok agent (runGrok + BenchAgent)

Vertical-slice PR: wire Grok into the main skillbench path without expanding
the dashboard matrix or `both`.

- **`runGrok` / `grokExecArgs`** in `tests/harness/runner.ts` — headless
  `grok -p … --cwd … --always-approve --max-turns 25 --no-memory
  --no-auto-update`, optional `-m` model override, soft budget note (no CLI
  USD flag).
- **`BenchAgent` includes `"grok"`** with shared `isBenchAgent` / `BENCH_AGENTS`
  helpers; dispatch in `runBenchAgent`, CLI `--agent`, `BENCH_AGENT` worker
  env, interactive prompt, and regression-check argv.
- **`both` stays claude+codex only** so broad existing invocations do not
  silently double spend. Select Grok with `--agent grok`.
- **End-to-end path:** any custom/generic setup works; smoke with
  `design-system` or `session-triage`:
  `pnpm bench --skill design-system --agent grok --runs 1 --budget 1`.
- **Out of scope for this PR:** dashboard model-matrix entry, `live-agent.ts`
  JSON-schema path, agent-specific route conventions for Grok, catalog skill
  install into temp fixtures.

Validation:
- Offline: layer1 `runner-grok.test.ts` (args + CLI accept/reject + `both`
  non-expansion); full `pnpm test` green.
- Live: `pnpm bench --skill session-triage --agent grok --runs 1 --budget 1`
  → 100% pass (1/1 evaluated, p50 ~63s). `design-system` blocked in this
  checkout by missing `tests/fixtures/inputs/ui-final-dashboard.md` (pre-existing
  fixture gap, not Grok-specific).

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

## 2026-07-10 — Sol orchestration publisher live canary

Completed the remaining live GitHub operational canary for the Sol orchestration
publisher using clearly labeled synthetic run artifacts (no live model execution).

- Campaign `full-campaign-aae00bced244df66`, chunk
  `chunk-5a5c85d4804c425c952a`, registered 288/288 judged-shaped run identities.
- The no-write JSON dry-run reported the chunk eligible with no reasons.
- The real publisher created the private
  `GeorgeQLe/agentic-skills-benchmark-results` repository, committed compact
  indexes/reports/verified state/cleanup receipt, and created a two-part private
  GitHub Release.
- Fresh independent downloads matched both part hashes and the reassembled
  71,360,968-byte archive SHA-256.
- The persisted retry path recovered after shortening a canary-only artifact
  filename that exceeded the deterministic ustar path limit; attempt 2 reached
  `cleaned` with zero consecutive failures.
- Compact local reports and 288 compact result rows remain while all owned raw
  run directories and local archive parts were removed.
- The campaign-scoped continuous watcher remains active under its durable PID
  lock. A future real campaign needs its own watcher.

### Ship manifest

**User goal:** wrap the current repository session after proving the real private
GitHub publisher/Release path, preserving careful feature-oriented commit scope,
and land the completed work on the primary branch.

**Changed files:** the shipping boundary includes `.agents/project.json`,
`.gitignore`, `README.md`, `package.json`, `tasks/history.md`, `tasks/todo.md`;
the three exact files under `docs/analysis/`; every new checksum-locked file under
`experiments/sol-orchestration/v1/`; the two exact schemas under
`tests/fixtures/golden/` and every new input under `tests/fixtures/inputs/`;
`tests/orchestration.ts`, `tests/orchestration-publish.ts`, every new module under
`tests/orchestration/`, `tests/layer1/orchestration.test.ts`, and
`tests/layer1/publisher.test.ts`; plus the Grok/dashboard completion files
`tests/harness/cli/dashboard-command.ts`, `tests/harness/cli/stress-command.ts`,
`tests/harness/dashboard/model-matrix.ts`,
`tests/harness/dashboard/orchestrator.ts`, `tests/layer1/dashboard.test.ts`,
`tests/layer1/routing-conventions.test.ts`,
`tests/layer4/setup-helpers/routing.ts`, and the route consumers in
`tests/layer4/setups/afps-status.setup.ts`,
`tests/layer4/setups/packs/pack-workflows.setup.ts`,
`tests/layer4/setups/tier1-workflows.setup.ts`, and
`tests/layer4/setups/tier23-base-workflows.setup.ts`. The earlier Grok runner
commit already exists canonically on `origin/master` as `e364c2f`; the local
same-subject feature-branch commit will not be duplicated. Generated
`.claude/skills/**`, `.codex/skills/**`, and `generated-results/**` are excluded
and ignored. The private results sibling repository is outside this code-repo
boundary and is clean.

**Per-file purpose:** project/package/README files expose and document the new
control plane while ignoring runtime results; the locked experiment tree defines
the immutable design, treatments, prompts, and fixtures; orchestration modules
implement scheduling, provider isolation, allowance accounting, judging,
reporting, deterministic multipart archival, private GitHub transport, durable
publisher recovery, verification, and cleanup; layer1 tests cover those
contracts. Dashboard/routing files finish Grok dispatch and runner-native
handoffs while hardening live TUI repaint cleanup. Fixture files restore the
source inputs and schemas consumed by existing benchmark setups. Analysis docs
preserve the model comparison evidence. Project/task files record designation,
the canary, the exact ship boundary, and the next real-campaign blocker.

**User-goal mapping:** the production publisher command was exercised unchanged
against a production-shaped 288-run chunk and a real private repository/Release;
the implementation, offline contracts, docs, and locked corpus that enabled that
canary are the core feature commit. Grok/dashboard and fixture changes are kept
in separate logical commits so the pre-existing work is not mixed into the
orchestration implementation.

**Tests run:** `pnpm bench --verify` passed catalog freshness, the 208-skill
coverage matrix, and 117/117 layer1 tests across 18 files; `pnpm exec tsc
--noEmit` passed; `pnpm skillbench stress --json` passed all deterministic cases,
including expected-failure guards; `pnpm bench:orchestration verify
--campaign-ready` passed all six fixture qualifications and CLI capability
checks. The live canary dry-run was eligible without writes; the real sweep
created two Release parts, fresh-downloaded and reassembled them, matched both
part hashes and the archive hash, pushed verified/cleanup records, removed only
owned raw paths, and left the watcher lock active.

**Skipped tests:** a genuine live-model pilot/full chunk was not run because the
repository has no legitimate calibration observations/profile or passing
1,116-run pilot gate; fabricating those scientific gates would invalidate the
experiment. A GUI visual test is not applicable to this terminal/control-plane
change; deterministic ANSI repaint snapshots and stress coverage exercise the
TUI. No deploy was run because this repository has no `deploy.md` or
`tasks/deploy.md` manual deploy contract.

**Adversarial review:** performed a failure-oriented changed-file review and
targeted scans for whitespace errors, unfinished markers, command execution,
destructive removal, credential literals, personal paths, and accidentally
tracked runtime output. Child commands use argument arrays rather than shell
interpolation; publisher removals are rooted through ownership checks and are
covered by unrelated-path retention and interruption tests. The only token-like
literal is the deliberate fake-key archive-scan fixture. One absolute home path
in an analysis note was normalized to `~/projects`. The live canary also proved
retry recovery after a deliberately large artifact first exceeded the ustar path
limit. Staged-diff checks also normalized extra EOF blank lines in new modules
and trailing whitespace in a restored Markdown input fixture.

**Residual risk:** scientific live execution remains unvalidated until fresh
manual provider snapshots, real calibration observations, and a passing pilot
gate exist. The active watcher is intentionally scoped to the synthetic campaign
and will not discover a future real campaign; that campaign must launch its own
watcher. Remote event mirrors are committed at atomic state boundaries while the
local durable ledger may contain later terminal/watcher events; remote
`publisher/state.json` and cleanup receipts remain the completion authority.

**Rollback note:** revert the feature-oriented commits on `master` to remove the
code/corpus/dashboard changes. Stop the watcher with SIGTERM before removing its
ignored local campaign data. The private results repository and Release are
external canary evidence and must only be deleted through an explicit separate
cleanup request.

**Next command:** `npx skillpacks install guided-walkthrough`
