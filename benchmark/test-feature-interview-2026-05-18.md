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
| layer1 | PASS | 3.5s | 1,212 tests passed across 15 files |
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
| Claude | `feature-interview-claude-e499a20d` | 1/1 evaluated, 100.0% | [20.7%, 100.0%] | 2 | 41.8s | 41.8s | 41.8s | 1.000 | 0 | $0.75 | $0.25 |
| Codex | `feature-interview-codex-e6208aac` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 85.2s | 90.0s | 90.5s | 0.893 | 0 | $0.75 | $0.25 |

## Hard Assertions

Claude passed all hard assertions in the one evaluated run. Two Claude runs were infrastructure-blocked by `agent runner budget exceeded`.

Codex passed all hard assertions in all three evaluated runs.

No failed hard assertions were reported for either evaluated agent lane.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 1 | 77.8% | 1 | 1 | `prototype-first-product-gate` 0.0%; `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |
| Codex | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0%; `validation-specificity` 100.0% |

Claude quality details:

- The single evaluated Claude run passed hard assertions but failed the configured output-quality rubric.
- The failing critical criterion was `prototype-first-product-gate`.

Codex quality details:

- All three evaluated Codex runs passed the output-quality rubric with 100.0% average quality.
- No threshold or critical failures were reported.

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 0 | agent runner budget exceeded |
| Claude | 1 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/feature-interview-claude-e499a20d/report.json`
- Claude markdown: `tests/benchmarks/runs/feature-interview-claude-e499a20d/report.md`
- Codex report: `tests/benchmarks/runs/feature-interview-codex-e6208aac/report.json`
- Codex markdown: `tests/benchmarks/runs/feature-interview-codex-e6208aac/report.md`
- Claude retained run: `tests/benchmarks/runs/feature-interview-claude-e499a20d/run-002.json`
- Codex retained runs:
  - `tests/benchmarks/runs/feature-interview-codex-e6208aac/run-000.json`
  - `tests/benchmarks/runs/feature-interview-codex-e6208aac/run-001.json`
  - `tests/benchmarks/runs/feature-interview-codex-e6208aac/run-002.json`

## Verdict

The evaluated hard assertions passed for both agents, and Codex passed the configured output-quality rubric cleanly. The overall benchmark is still not clean because Claude had two infrastructure-blocked runs and its single evaluated run had one critical output-quality failure on `prototype-first-product-gate`.

Recommended next skill: `$session-triage feature-interview benchmark failure`
