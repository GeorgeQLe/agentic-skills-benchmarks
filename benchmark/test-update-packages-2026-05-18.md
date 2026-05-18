# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic both-agent pass

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.5s | 1,210 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `fa542bcd` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 91.2% | 0 | 0 | 58.4s | 59.9s | 60.1s | $0.25 | $0.75 | 0.854 | 0 | `tests/benchmarks/runs/update-packages-claude-fa542bcd/` |
| Codex | `03d220e0` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 98.5% | 0 | 0 | 85.7s | 86.2s | 86.2s | $0.25 | $0.75 | 0.892 | 0 | `tests/benchmarks/runs/update-packages-codex-03d220e0/` |

Total estimated cost: **$1.50**.

## Failed Assertions

None. All six evaluated benchmark runs passed the hard assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 91.2% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| Codex | 98.5% | 0 | 0 | `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-fa542bcd/report.json`
- `tests/benchmarks/runs/update-packages-claude-fa542bcd/report.md`
- `tests/benchmarks/runs/update-packages-codex-03d220e0/report.json`
- `tests/benchmarks/runs/update-packages-codex-03d220e0/report.md`

## Verdict

The fresh rerun passed deterministically. Both runners completed three evaluated runs with no infrastructure blocks, no failed hard assertions, no output-quality threshold failures, and no critical failures.

Recommended next skill: `$benchmark-agent-review update-packages`
