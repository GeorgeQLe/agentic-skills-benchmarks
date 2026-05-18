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
| layer1 | PASS | 3.7s | 1,214 tests passed across 15 files |
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
| Claude | `feature-interview-claude-bd781522` | 0/0 evaluated, N/A | N/A | 3 | 0.0s | 0.0s | 0.0s | 1.000 | 0 | $0.75 | $0.25 |
| Codex | `feature-interview-codex-59a38b3c` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 87.1s | 99.3s | 100.4s | 0.885 | 0 | $0.75 | $0.25 |

## Hard Assertions

| Agent | Failed assertions |
| --- | --- |
| Claude | none evaluated |
| Codex | none |

Claude had no evaluated runs because all three runs were infrastructure-blocked by the agent runner budget. Codex passed all hard assertions in all three evaluated runs.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 0 | N/A | N/A | N/A | N/A |
| Codex | 3 | 100.0% | 0 | 0 | `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0%; `validation-specificity` 100.0% |

Quality score is an additional configured rubric score, not a replacement for hard assertion pass rate or a statistically definitive measure.

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 0 | agent runner budget exceeded |
| Claude | 1 | agent runner budget exceeded |
| Claude | 2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/feature-interview-claude-bd781522/report.json`
- Claude markdown: `tests/benchmarks/runs/feature-interview-claude-bd781522/report.md`
- Codex report: `tests/benchmarks/runs/feature-interview-codex-59a38b3c/report.json`
- Codex markdown: `tests/benchmarks/runs/feature-interview-codex-59a38b3c/report.md`
- Codex retained runs:
  - `tests/benchmarks/runs/feature-interview-codex-59a38b3c/run-000.json`
  - `tests/benchmarks/runs/feature-interview-codex-59a38b3c/run-001.json`
  - `tests/benchmarks/runs/feature-interview-codex-59a38b3c/run-002.json`

## Verdict

The fresh benchmark has evaluated passing Codex evidence and no deterministic `feature-interview` failure. Claude produced no evaluated outputs because all three runs were infrastructure-blocked by the agent runner budget, so the Claude lane should be treated as inconclusive infrastructure blockage rather than a skill failure.

Recommended next skill: `$benchmark-agent-review feature-interview`
