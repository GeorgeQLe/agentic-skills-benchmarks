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
BENCH_SKILL=design-system BENCH_AGENT=codex BENCH_RUNS=1 BENCH_CHUNK_SIZE=1 pnpm bench
# Opt-in: also gate pass/fail on each suite's quality rubric (default: assertions only)
BENCH_GATE_ON_QUALITY=1 BENCH_SKILL=design-system BENCH_AGENT=codex BENCH_RUNS=1 pnpm bench
```

Benchmark run output stays under `tests/benchmarks/runs/`.

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

Flags: `--models` (default: all; ids from `--list-models`), `--skills` /
`--scenarios`, `--runs` per cell, `--concurrency`, `--budget` (hard USD ceiling —
the matrix stops spending once reached), `--mock`, and `--no-live` (plain line
log for CI / piping). Live runs are gated behind `LIVE_AGENT_TESTS=1`; a per-run
summary is written to `tests/benchmarks/dashboard/`. Edit the model matrix in
`tests/harness/dashboard/model-matrix.ts`.
