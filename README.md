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
```

Benchmark run output stays under `tests/benchmarks/runs/`.
