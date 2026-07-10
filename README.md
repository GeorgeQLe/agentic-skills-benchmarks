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
