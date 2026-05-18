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
| layer1 | PASS | 3.6s | 1,211 tests passed across 15 files |
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
| Claude | `feature-interview-claude-02d30038` | 0/0 evaluated | [0.0%, 0.0%] | 3 | 0.0s | 0.0s | 0.0s | 1.000 | 0 | $0.75 | $0.25 |
| Codex | `feature-interview-codex-ed08cfc2` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 85.8s | 138.6s | 143.3s | 0.877 | 0 | $0.75 | $0.25 |

## Hard Assertions

Claude had no evaluated runs because all three runs were infrastructure-blocked by `agent runner budget exceeded`.

Codex passed all hard assertions in all evaluated runs:

- Agent command exited successfully.
- `specs/benchmark-reporting-feature-interview.md` was created.
- Output included `Assumptions`, `evidence`, `decision`, `risks`, and `prototype`.
- Output matched the custom fixture expectation for `custom`, `generic`, or `blocked`.
- Output included a next command handoff and recommended `$roadmap`.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 0 | n/a | n/a | n/a | n/a |
| Codex | 3 | 75.9% | 1 | 4 | `evidence-linked` 0.0%; `prototype-first-product-gate` 66.7%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |

Codex quality details:

- Runs 0 and 1 passed the quality threshold at 83.3% but each had a critical `evidence-linked` miss because the output did not preserve the exact fixture fact `Benchmark reports`.
- Run 2 failed the quality threshold at 61.1% and had critical failures for `evidence-linked` plus `prototype-first-product-gate`.
- The run 2 prototype-first miss was: `missing prototype-first gate: evidence or calibration needed before promotion`.

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 0 | agent runner budget exceeded |
| Claude | 1 | agent runner budget exceeded |
| Claude | 2 | agent runner budget exceeded |

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/feature-interview-claude-02d30038/report.json`
- Claude markdown: `tests/benchmarks/runs/feature-interview-claude-02d30038/report.md`
- Codex report: `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/report.json`
- Codex markdown: `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/report.md`
- Codex retained runs:
  - `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-000.json`
  - `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-001.json`
  - `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-002.json`

## Verdict

The deterministic benchmark produced evaluated Codex hard-assertion passes, but the run is not clean because Codex had output-quality threshold and critical failures, and Claude was fully infrastructure-blocked. Treat this as a benchmark failure requiring triage rather than a passed subjective-quality handoff.

Recommended next skill: `$session-triage feature-interview benchmark failure`
