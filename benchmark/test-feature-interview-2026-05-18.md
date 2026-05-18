# Benchmark Test: feature-interview

> Date: 2026-05-18
> Workflow: `$benchmark-test-skill feature-interview`
> Target skill: `feature-interview`
> Coverage: custom (`tests/layer4/setups/tier1-workflows.setup.ts`)

## Command Resolution

`$benchmark-test-skill` was resolved as the active workflow from the `agentic-skills-bench` pack. `feature-interview` was treated only as the benchmark target argument.

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.6s | 1,214 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `feature-interview` |

Verify command:

```bash
pnpm verify --skill feature-interview
```

## Benchmark Command

```bash
pnpm bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0
```

## Agent Results

| Agent | Session | Evaluated pass rate | Wilson 95% CI | Blocked runs | p50 latency | p95 latency | p99 latency | Mean similarity | Outliers | Total cost | Cost/run |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude | `feature-interview-claude-3efd3354` | 0/1 evaluated, 0.0% | [0.0%, 79.3%] | 2 | 48.6s | 48.6s | 48.6s | 1.000 | 0 | $0.75 | $0.25 |
| Codex | `feature-interview-codex-bcc5f678` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 80.2s | 84.5s | 84.9s | 0.880 | 0 | $0.75 | $0.25 |

## Hard Assertions

| Agent | Failed assertions |
| --- | --- |
| Claude | Run #0 failed: `Output recommends /roadmap` |
| Codex | none |

Claude completed one evaluated run and had two infrastructure-blocked runs from `agent runner budget exceeded`.

Codex passed all hard assertions in all three evaluated runs.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 1 | 72.2% | 1 | 1 | `actionable-next-route` 0.0%; `prototype-first-product-gate` 0.0%; `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0% |
| Codex | 3 | 77.8% | 3 | 3 | `prototype-first-product-gate` 0.0%; `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |

Quality score is an additional configured rubric score, not a replacement for hard assertion pass rate or a statistically definitive measure.

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 1 | agent runner budget exceeded |
| Claude | 2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/feature-interview-claude-3efd3354/report.json`
- Claude markdown: `tests/benchmarks/runs/feature-interview-claude-3efd3354/report.md`
- Claude retained run: `tests/benchmarks/runs/feature-interview-claude-3efd3354/run-000.json`
- Codex report: `tests/benchmarks/runs/feature-interview-codex-bcc5f678/report.json`
- Codex markdown: `tests/benchmarks/runs/feature-interview-codex-bcc5f678/report.md`
- Codex retained runs:
  - `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-000.json`
  - `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-001.json`
  - `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-002.json`

## Verdict

The fresh benchmark is not clean. Claude failed the evaluated hard assertion by recommending `/roadmap`, had two infrastructure-blocked runs, and failed critical output-quality criteria. Codex passed hard assertions in all evaluated runs, but all three Codex outputs failed the configured `prototype-first-product-gate` quality criterion.

Recommended next skill: `$session-triage feature-interview benchmark failure`
