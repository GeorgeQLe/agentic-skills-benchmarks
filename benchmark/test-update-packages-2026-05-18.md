# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** pass for all evaluated hard assertions; one Claude run was infrastructure-blocked by agent runner budget

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.6s | 1,214 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `25145968` | 100.0% (2/2) | 1 | [34.2%, 100.0%] | 97.6% | 0 | 0 | 56.7s | 57.1s | 57.1s | $0.25 | $0.75 | 0.851 | 0 | `tests/benchmarks/runs/update-packages-claude-25145968/` |
| Codex | `fdde75ea` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 | 0 | 76.4s | 86.3s | 87.2s | $0.25 | $0.75 | 0.897 | 0 | `tests/benchmarks/runs/update-packages-codex-fdde75ea/` |

Total estimated cost: **$1.50**.

## Failed Assertions

No evaluated Claude or Codex runs reported failed hard assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 97.6% | 0 | 0 | `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |
| Codex | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #2 | agent runner budget exceeded |

Codex reported no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-25145968/report.json`
- `tests/benchmarks/runs/update-packages-claude-25145968/report.md`
- `tests/benchmarks/runs/update-packages-codex-fdde75ea/report.json`
- `tests/benchmarks/runs/update-packages-codex-fdde75ea/report.md`

## Notes

This run passed all evaluated hard assertions for both runners. Claude had one infrastructure-blocked run due to agent runner budget, so its evaluated sample is 2 rather than 3. The small sample size keeps the Wilson intervals wide, so this is deterministic fixture evidence rather than a statistically definitive quality claim.

Recommended next skill: `$benchmark-agent-review update-packages`
