# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** pass for all evaluated hard assertions; Claude had one infrastructure-blocked run

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 4.9s | 1,215 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `a767ae3e` | 100.0% (2/2) | 1 | [34.2%, 100.0%] | 95.2% | 0 | 0 | 54.5s | 57.2s | 57.5s | $0.25 | $0.75 | 0.866 | 0 | `tests/benchmarks/runs/update-packages-claude-a767ae3e/` |
| Codex | `337a5d5e` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 | 0 | 76.6s | 120.3s | 124.2s | $0.25 | $0.75 | 0.906 | 0 | `tests/benchmarks/runs/update-packages-codex-337a5d5e/` |

Total estimated cost: **$1.50**.

## Failed Assertions

No evaluated Claude or Codex runs reported failed hard assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 95.2% | 0 | 0 | `workflow-actionability` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |
| Codex | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #2 | agent runner budget exceeded |

Codex reported no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-a767ae3e/report.json`
- `tests/benchmarks/runs/update-packages-claude-a767ae3e/report.md`
- `tests/benchmarks/runs/update-packages-codex-337a5d5e/report.json`
- `tests/benchmarks/runs/update-packages-codex-337a5d5e/report.md`

## Notes

This run passed all evaluated hard assertions for both runners. Claude had one agent-runner budget block, which is infrastructure blockage rather than a skill failure. The evaluated sample size is small and has wide Wilson intervals, so this is deterministic fixture evidence rather than a statistically definitive quality claim.

Recommended next skill: `$benchmark-agent-review update-packages`
