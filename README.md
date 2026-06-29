# Agentic Skills Benchmarks

This repository owns the benchmark harness, persisted benchmark runs, and benchmark reports for `agentic-skills`.

The harness imports versioned public catalog artifacts from the canonical skills repository instead of reading that repository's internal `base/` or `packs/` source tree.

## Catalog Import

```bash
SKILLS_REPO_URL=https://github.com/GeorgeQLe/agentic-skills.git \
SKILLS_REPO_REF=<tag-or-commit-sha> \
pnpm catalog:import
```

`SKILLS_REPO_REF` defaults to `master` for local development, but release and report generation should pin a tag or commit SHA. The import writes only inside this repository under `data/skills-catalog/v1/`.

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
