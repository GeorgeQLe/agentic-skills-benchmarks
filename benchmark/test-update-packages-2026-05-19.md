# Benchmark Test: update-packages

> Date: 2026-05-19
> Workflow: `$benchmark-test-skill update-packages`
> Target skill: `update-packages`
> Coverage: custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)

## Command Resolution

`$benchmark-test-skill` was resolved as the active workflow from the `agentic-skills-bench` pack. `update-packages` was treated only as the benchmark target argument.

## Verify

| Layer | Status | Wall time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | 1,219 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

Verify command:

```bash
pnpm verify --skill update-packages
```

## Benchmark Command

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

## Agent Results

| Agent | Session | Evaluated pass rate | Wilson 95% CI | Blocked runs | p50 latency | p95 latency | p99 latency | Mean similarity | Outliers | Total cost | Cost/run |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Claude | `update-packages-claude-dc9580ca` | 1/2 evaluated, 50.0% | [9.5%, 90.5%] | 1 | 552.7s | 1004.5s | 1044.6s | 1.000 | 0 | $3.00 | $1.00 |
| Codex | `update-packages-codex-f04f15cc` | 2/2 evaluated, 100.0% | [34.2%, 100.0%] | 1 | 75.0s | 77.0s | 77.2s | 0.910 | 0 | $3.00 | $1.00 |

## Hard Assertions

| Agent | Failed assertions |
| --- | --- |
| Claude | Run 1: `Agent command exited successfully`; `package-update-plan.md created in project root` |
| Codex | none |

Claude had one evaluated failing run and one infrastructure-blocked timeout. Codex passed all hard assertions in both evaluated runs and had one infrastructure-blocked timeout.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 2 | 56.8% | 1 | 8 | `workflow-targeted-migration-routes` 0.0%; `workflow-fixture-facts` 50.0%; `workflow-output-includes-verification-command-evidence` 50.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 50.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 50.0% |
| Codex | 2 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

Quality score is an additional configured rubric score, not a replacement for hard assertion pass rate or a statistically definitive measure.

## Infrastructure Blocks

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 2 | agent runner timeout |
| Codex | 2 | agent runner timeout |

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/update-packages-claude-dc9580ca/report.json`
- Claude markdown: `tests/benchmarks/runs/update-packages-claude-dc9580ca/report.md`
- Claude retained runs:
  - `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-000.json`
  - `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-001.json`
  - `tests/benchmarks/runs/update-packages-claude-dc9580ca/run-002.json`
- Codex report: `tests/benchmarks/runs/update-packages-codex-f04f15cc/report.json`
- Codex markdown: `tests/benchmarks/runs/update-packages-codex-f04f15cc/report.md`
- Codex retained runs:
  - `tests/benchmarks/runs/update-packages-codex-f04f15cc/run-000.json`
  - `tests/benchmarks/runs/update-packages-codex-f04f15cc/run-001.json`
  - `tests/benchmarks/runs/update-packages-codex-f04f15cc/run-002.json`

## Verdict

The fresh benchmark has mixed evaluated evidence. Codex passed all evaluated hard assertions and scored 100.0% output quality, but Claude had one evaluated hard assertion failure, one quality threshold failure, and eight critical quality failures. Both runners also had one infrastructure-blocked timeout, reported separately from evaluated pass rates.

Recommended next skill: `$session-triage update-packages benchmark failure`
