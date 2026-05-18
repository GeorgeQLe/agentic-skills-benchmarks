# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** pass for all evaluated hard assertions; Claude lane was fully infrastructure-blocked by agent runner budget

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.6s | 1,215 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `4d9966e8` | 0.0% (0/0) | 3 | [0.0%, 0.0%] | n/a | n/a | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-4d9966e8/` |
| Codex | `df005dbd` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 | 0 | 85.4s | 86.0s | 86.1s | $0.25 | $0.75 | 0.870 | 0 | `tests/benchmarks/runs/update-packages-codex-df005dbd/` |

Total estimated cost: **$1.50**.

## Failed Assertions

No evaluated Claude or Codex runs reported failed hard assertions. Claude produced no evaluated runs because all three runs were infrastructure-blocked.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | n/a | n/a | n/a | No evaluated runs |
| Codex | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #0 | agent runner budget exceeded |
| Claude | #1 | agent runner budget exceeded |
| Claude | #2 | agent runner budget exceeded |

Codex reported no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-4d9966e8/report.json`
- `tests/benchmarks/runs/update-packages-claude-4d9966e8/report.md`
- `tests/benchmarks/runs/update-packages-codex-df005dbd/report.json`
- `tests/benchmarks/runs/update-packages-codex-df005dbd/report.md`

## Notes

This run passed all evaluated hard assertions for the Codex runner. The Claude lane is inconclusive because all three runs were blocked by agent runner budget, which is infrastructure blockage rather than skill failure. The Codex sample size is small and has a wide Wilson interval, so this is deterministic fixture evidence rather than a statistically definitive quality claim.

Recommended next skill: `$benchmark-agent-review update-packages`
