# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic both-agent failure with partial Claude infrastructure blocks

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.5s | 1,211 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `5c4392a3` | 0.0% (0/1) | 2 | [0.0%, 79.3%] | 75.0% | 1 | 2 | 60.0s | 60.0s | 60.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-5c4392a3/` |
| Codex | `31ad8c8d` | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 93.3% | 0 | 2 | 72.0s | 103.6s | 106.4s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-codex-31ad8c8d/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #0 | 0 | `Output proves selected pnpm toolchain age eligibility`; `Output preserves age-gate key semantics` |
| Codex | #0 | 0 | `Output preserves age-gate key semantics` |
| Codex | #1 | 0 | `Output preserves age-gate key semantics` |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 75.0% | 1 | 2 | `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 0.0%; `workflow-output-preserves-age-gate-key-semantics` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0% |
| Codex | 93.3% | 0 | 2 | `workflow-output-preserves-age-gate-key-semantics` 33.3%; `workflow-actionability` 91.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #1 | agent runner budget exceeded |
| Claude | #2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-5c4392a3/report.json`
- `tests/benchmarks/runs/update-packages-claude-5c4392a3/report.md`
- `tests/benchmarks/runs/update-packages-codex-31ad8c8d/report.json`
- `tests/benchmarks/runs/update-packages-codex-31ad8c8d/report.md`

## Notes

The failed retained artifacts include substantive pnpm proof and age-gate language in at least some failed runs, so this may be a benchmark-pattern calibration issue rather than a pure `update-packages` contract failure. The deterministic result is still a failed benchmark and needs triage before another full rerun.

Recommended next skill: `$session-triage update-packages benchmark failure`
