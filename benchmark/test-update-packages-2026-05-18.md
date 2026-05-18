# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic Codex failure with Claude infrastructure-blocked

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.3s | 1,211 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `29df606d` | 0.0% (0/0) | 3 | [0.0%, 0.0%] | n/a | n/a | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-29df606d/` |
| Codex | `870b131b` | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 96.8% | 0 | 1 | 69.5s | 73.8s | 74.2s | $0.25 | $0.75 | 0.920 | 0 | `tests/benchmarks/runs/update-packages-codex-870b131b/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Codex | #2 | 0 | `Output proves selected pnpm toolchain age eligibility` |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | n/a | n/a | n/a | No evaluated runs; all runs were infrastructure-blocked. |
| Codex | 96.8% | 0 | 1 | `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #0 | agent runner budget exceeded |
| Claude | #1 | agent runner budget exceeded |
| Claude | #2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-29df606d/report.json`
- `tests/benchmarks/runs/update-packages-claude-29df606d/report.md`
- `tests/benchmarks/runs/update-packages-codex-870b131b/report.json`
- `tests/benchmarks/runs/update-packages-codex-870b131b/report.md`

## Notes

This run is not infrastructure-only blocked because Codex produced three evaluated runs and one failed a hard assertion. Claude's lane was fully blocked by agent-runner budget exhaustion and should be reported separately from the evaluated Codex failure. The failed Codex run selected `pnpm@10.11.0` using fixture publish-time evidence but missed the currently accepted pnpm proof assertion shape, so this should be triaged before another full rerun.

Recommended next skill: `$session-triage update-packages benchmark failure`
