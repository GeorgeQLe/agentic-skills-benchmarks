# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** mixed; Claude had one deterministic hard-assertion failure and Codex passed all evaluated hard assertions

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.7s | 1,214 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `dbd3972f` | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 96.8% | 0 | 1 | 56.7s | 61.8s | 62.3s | $0.25 | $0.75 | 0.833 | 0 | `tests/benchmarks/runs/update-packages-claude-dbd3972f/` |
| Codex | `49aec343` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 | 0 | 84.5s | 148.1s | 153.8s | $0.25 | $0.75 | 0.902 | 0 | `tests/benchmarks/runs/update-packages-codex-49aec343/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #1 | 0 | `Output avoids unqualified pnpm@latest` |

Codex reported no failed assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 96.8% | 0 | 1 | `workflow-output-avoids-unqualified-pnpm-latest` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |
| Codex | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocks

No infrastructure-blocked runs were reported for Claude or Codex.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-dbd3972f/report.json`
- `tests/benchmarks/runs/update-packages-claude-dbd3972f/report.md`
- `tests/benchmarks/runs/update-packages-codex-49aec343/report.json`
- `tests/benchmarks/runs/update-packages-codex-49aec343/report.md`

## Notes

This run is a deterministic benchmark failure for the Claude lane because one evaluated run failed the `Output avoids unqualified pnpm@latest` hard assertion and triggered one critical quality failure. Codex passed all evaluated hard assertions and quality criteria. The small sample size keeps the Wilson intervals wide, so this is deterministic fixture evidence rather than a statistically definitive quality claim.

Recommended next skill: `$session-triage update-packages benchmark failure`
