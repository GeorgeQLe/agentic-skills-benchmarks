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
| Claude | `update-packages-claude-f8355f37` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 64.6s | 79.4s | 80.7s | 0.829 | 0 | $3.00 | $1.00 |
| Codex | `update-packages-codex-1ed5350e` | 3/3 evaluated, 100.0% | [43.8%, 100.0%] | 0 | 66.7s | 78.7s | 79.8s | 0.883 | 0 | $3.00 | $1.00 |

## Hard Assertions

| Agent | Failed assertions |
| --- | --- |
| Claude | none |
| Codex | none |

Both agents passed all evaluated hard assertions. No infrastructure-blocked runs were reported.

## Output Quality

| Agent | Evaluated runs | Average quality | Threshold failures | Critical failures | Lowest-scoring criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 3 | 97.0% | 0 | 1 | `workflow-actionability` 66.7%; `workflow-targeted-migration-routes` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| Codex | 3 | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

Quality score is an additional configured rubric score, not a replacement for hard assertion pass rate or a statistically definitive measure.

## Infrastructure Blocks

None.

## Raw Session Paths

- Claude report: `tests/benchmarks/runs/update-packages-claude-f8355f37/report.json`
- Claude markdown: `tests/benchmarks/runs/update-packages-claude-f8355f37/report.md`
- Claude retained runs:
  - `tests/benchmarks/runs/update-packages-claude-f8355f37/run-000.json`
  - `tests/benchmarks/runs/update-packages-claude-f8355f37/run-001.json`
  - `tests/benchmarks/runs/update-packages-claude-f8355f37/run-002.json`
- Codex report: `tests/benchmarks/runs/update-packages-codex-1ed5350e/report.json`
- Codex markdown: `tests/benchmarks/runs/update-packages-codex-1ed5350e/report.md`
- Codex retained runs:
  - `tests/benchmarks/runs/update-packages-codex-1ed5350e/run-000.json`
  - `tests/benchmarks/runs/update-packages-codex-1ed5350e/run-001.json`
  - `tests/benchmarks/runs/update-packages-codex-1ed5350e/run-002.json`

## Verdict

The fresh benchmark passed all hard assertions for both evaluated agents. Claude still had one deterministic output-quality critical failure across three evaluated runs, with the lowest average scores on workflow actionability and targeted migration routing; Codex had no quality failures. Subjective output-quality review has not been performed for this fresh run.

Recommended next skill: `$benchmark-agent-review update-packages`
