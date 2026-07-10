# Agentic Skills Benchmarks

This repository owns the benchmark harness, persisted benchmark runs, and benchmark reports for `agentic-skills`.

The harness imports versioned public catalog artifacts from the canonical skills repository instead of reading that repository's internal `base/` or `packs/` source tree.

## Catalog Import

```bash
SKILLS_REPO_URL=https://github.com/GeorgeQLe/agentic-skills.git \
SKILLS_REPO_REF=<tag-or-commit-sha> \
pnpm catalog:import
```

`SKILLS_REPO_REF` defaults to a **pinned root commit SHA** (`defaultRepoRef` in `scripts/import-skills-catalog.mjs`), so the committed snapshot under `data/skills-catalog/v1/` is reproducible and `pnpm catalog:check` is deterministic — it does not drift as root `master` advances. Passing `SKILLS_REPO_REF=master` (or any tag/SHA) overrides the default.

Refreshing the catalog is a **deliberate, reviewable step**, not silent drift:

1. Bump `defaultRepoRef` in `scripts/import-skills-catalog.mjs` to the new root commit SHA (or tag).
2. Run `pnpm catalog:import` to regenerate the snapshot.
3. Commit the 4 regenerated `data/skills-catalog/v1/{catalog,proof,manifest,import-source}.json` files together with the importer edit.

For local verification against a checked-out worktree:

```bash
SKILLS_REPO_URL=/path/to/agentic-skills SKILLS_REPO_REF=WORKTREE pnpm catalog:check
```

## Commands

```bash
pnpm catalog:check
pnpm bench:coverage
pnpm test
pnpm bench:list
pnpm bench --skill design-system --agent codex --runs 1 --chunk-size 1 --budget 1
pnpm bench --skills design-system,ship --agent both --runs 1 --budget 4
# Grok (explicit --agent; `both` stays claude+codex only)
pnpm bench --skill design-system --agent grok --runs 1 --chunk-size 1 --budget 1
# Opt-in: also gate pass/fail on each suite's quality rubric (default: assertions only)
BENCH_GATE_ON_QUALITY=1 pnpm bench --skill design-system --agent codex --runs 1 --budget 1
```

`--agent` accepts `claude`, `codex`, `grok`, or `both`. **`both` means claude+codex
only** so existing multi-agent runs do not silently add Grok spend — pass
`--agent grok` explicitly. Grok runs use the local `grok` CLI headless path
(`-p` / `--always-approve` / `--cwd`).

**Skill-command convention:** Claude and Grok use slash skills (`/ship`); Codex
uses dollar skills (`$ship`). Grok discovers Claude-compat skills and exposes
them as slash commands, so benchmark `recommendedRoutes` treat Grok like Claude.

Benchmark run output stays under `tests/benchmarks/runs/`.

`pnpm bench` has a shared hard budget for each invocation. Pass `--budget <usd>`
or set `BENCH_BUDGET_USD`; the default is `$5`. The runner reserves whole
per-run budget slots before launching each target/agent child process, so broad
`--skills` / `--scenarios` runs stop once the remaining budget cannot pay for
another run.

`BENCH_GATE_ON_QUALITY=1` makes a run additionally require its `qualityEvaluator`
rubric to pass (critical criteria + minimum score). Unset (the default), pass/fail
is computed from `assertResult` alone and the rubric is diagnostic only.

## Live model dashboard

`pnpm bench:dashboard` runs the benchmark suite across a matrix of Claude and GPT
models and renders a live, SkateBench-style TUI: a ranked leaderboard (pass rate,
p50 latency, cost), a model × task grid, and a rolling activity tail. The same
`assertResult` + quality-gate logic scores every cell, so pass/fail matches
`pnpm bench` exactly — only the model varies (via each CLI's `--model`).

```bash
# Preview the dashboard with simulated runs (no live agents, no spend)
pnpm bench:dashboard --mock

# Real runs — requires LIVE_AGENT_TESTS=1 (spends on claude/codex)
LIVE_AGENT_TESTS=1 pnpm bench:dashboard \
  --models claude-opus,claude-sonnet,gpt-5-codex \
  --skills investigate,ship,session-triage \
  --runs 3 --concurrency 4 --budget 15

pnpm bench:dashboard --list-models   # show the model matrix
pnpm bench:dashboard --help          # all options
```

Fable 5 is banned from this dashboard benchmark to avoid accidental quota burn.

Flags: `--models` (default: all; ids from `--list-models`), `--skills` /
`--scenarios`, `--runs` per cell, `--concurrency`, `--budget` (hard USD ceiling —
the matrix stops spending once reached), `--mock`, and `--no-live` (plain line
log for CI / piping). Live runs are gated behind `LIVE_AGENT_TESTS=1`; a per-run
summary is written to `tests/benchmarks/dashboard/`. Edit the model matrix in
`tests/harness/dashboard/model-matrix.ts`.

## Sol orchestration benchmark

`pnpm bench:orchestration` is the control plane for the locked Sol multi-agent
experiment. GPT-5.6 Sol is the only editor and final verifier. Fresh Sol, Terra,
Luna, and Claude Opus 4.8 workers are advisory and read-only; GPT and Claude
judges run in separate blinded ephemeral sessions.

The v1 experiment is checked in under `experiments/sol-orchestration/v1/`:

- `design.lock.json` pins factors, models, CLI versions, hypotheses, rubric,
  stopping rules, environment fingerprint, task hashes, and artifact hashes.
- `assignments.jsonl` contains exactly 11,520 content-addressed delegated
  configurations; `chunks.jsonl` locks 1,440 chunks of eight.
- `pilot-ofat.jsonl` contains the solo control, delegated reference, and all 28
  OFAT alternatives.
- `checksums.sha256` covers tasks, prompts, skills, AGENTS treatments, judge
  prompts, fixtures, and generated manifests.
- Six TypeScript/Python/Go greenfield/brownfield fixtures each have a failing
  seed, passing reference, hidden tests, and one clean/challenge intervention
  pair.

Common commands:

```bash
pnpm bench:orchestration generate
pnpm bench:orchestration verify
pnpm bench:orchestration verify --campaign-ready
pnpm bench:orchestration calibrate --template usage-snapshot.json
pnpm bench:orchestration calibrate \
  --before usage-before.json --after usage-after.json \
  --observations calibration-observations.json \
  --output calibration-profile.json

# Planning is read-only and launches no models.
pnpm bench:orchestration pilot
pnpm bench:orchestration run
pnpm bench:orchestration run --chunk 0

# Live work requires explicit acknowledgement and manual usage evidence.
pnpm bench:orchestration pilot --execute --ack-subscription \
  --snapshot usage-before-pilot.json --calibration calibration-profile.json
pnpm bench:orchestration run --execute --ack-subscription \
  --snapshot usage-before-campaign.json --calibration calibration-profile.json \
  --pilot-gate generated-results/sol-orchestration/campaigns/<pilot>/pilot-gate.json

pnpm bench:orchestration resume --execute --ack-subscription \
  --campaign <id> --calibration calibration-profile.json
pnpm bench:orchestration judge --campaign <id>
pnpm bench:orchestration report --campaign <id>
pnpm bench:orchestration report --campaign <id> --run <run-id>
pnpm bench:orchestration:publish --campaign <id>
pnpm bench:orchestration:publish --campaign <id> --once
pnpm bench:orchestration:publish --campaign <id> --dry-run --json --once
pnpm bench:orchestration archive --campaign <id> --chunk 0
pnpm bench:orchestration cleanup --campaign <id> --chunk-id <chunk-id>
```

Without `--chunk`, a full live run advances through all 1,440 immutable chunks,
stopping safely when its calibrated worst-case reservation no longer fits. Run
and resume persist judged raw results, compact indexes, and aggregate reports but
never publish or delete them. Launch the campaign-specific publisher separately;
it discovers fully judged chunks, processes them serially, and retries isolated
failures with capped exponential backoff. Interrupted runs resume the same
immutable run ID with a new fixture and fresh provider contexts; an already-atomic
`result.json` is recovered rather than duplicated.

Live child processes never receive `OPENAI_API_KEY`, `OPENAI_ADMIN_KEY`, or
`ANTHROPIC_API_KEY`. Codex uses subscription auth with `--ephemeral
--ignore-user-config`; Claude uses `--no-session-persistence`. Consumption is
always labeled as an estimated subscription allowance measure, never API spend
or exact USD cost. A current manual provider Usage-dashboard snapshot is required
because the Codex CLI exposes no subscription-balance endpoint.

Publishing targets the private sibling repository
`<origin-owner>/agentic-skills-benchmark-results`. Valid GitHub CLI authentication
is a hard prerequisite; Git LFS is not required. Git stores only compact indexes,
checksums, reports, and cleanup state. Raw archives are split into ordered 64 MiB
parts and uploaded to a chunk-specific private GitHub release so they never bloat
ordinary Git history. Every part and the reassembled archive are checksummed
before cleanup. After cleanup, run drill-down lazily downloads, reassembles, and
verifies the containing release assets.

The publisher records progress in `publisher/state.json` and durable lifecycle
events in `publisher/events.jsonl`, separate from `campaign.json`. Its
campaign-scoped PID lock rejects a second live watcher and recovers only a lock
whose process is no longer active. Remote verification uses a disposable clone
and fresh asset downloads; cleanup is allowed only after the verified-completion
index is pushed. A final cleanup receipt is pushed after allowlisted local raw
paths are removed. SIGINT/SIGTERM stops new scheduling, finishes the active
atomic operation, flushes state, and releases the lock.

The 36 paired plan-first observations are analyzed only after the pilot. A
separate 23,040-row v2 manifest is generated only for statistically supported
quality superiority, or quality non-inferiority within two points plus at least
10% token or latency improvement. The v1 manifest is never rewritten.
