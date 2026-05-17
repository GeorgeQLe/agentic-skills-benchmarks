# Benchmark Test: update-packages - 2026-05-17

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic both-agent failure

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.3s | 1,210 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `e7c523af` | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 83.3% | 2 | 2 | 49.3s | 53.0s | 53.4s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-e7c523af/` |
| Codex | `c8dbd66e` | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 93.6% | 0 | 1 | 90.2s | 116.1s | 118.4s | $0.25 | $0.75 | 0.918 | 0 | `tests/benchmarks/runs/update-packages-codex-c8dbd66e/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #1 | 0 | `Output avoids unqualified pnpm@latest` |
| Claude | #2 | 0 | `Output avoids unqualified pnpm@latest` |
| Codex | #2 | 0 | `Output avoids unqualified pnpm@latest` |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 83.3% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-output-avoids-unqualified-pnpm-latest` 33.3%; `workflow-actionability` 50.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0% |
| Codex | 93.6% | 0 | 1 | `workflow-actionability` 58.3%; `workflow-output-avoids-unqualified-pnpm-latest` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-e7c523af/report.json`
- `tests/benchmarks/runs/update-packages-claude-e7c523af/report.md`
- `tests/benchmarks/runs/update-packages-codex-c8dbd66e/report.json`
- `tests/benchmarks/runs/update-packages-codex-c8dbd66e/report.md`

## Verdict

The fresh rerun failed deterministically. Both runners completed three evaluated runs with no infrastructure blocks, but Claude failed two runs and Codex failed one run on `Output avoids unqualified pnpm@latest`. Major-upgrade compatibility risk handling was fully credited in the Codex rubric, while the remaining hard failure is the unqualified package-manager recommendation.

Recommended next skill: `$session-triage update-packages benchmark failure`
