# Benchmark Test: update-packages - 2026-05-18

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
| Claude | `12d8fabf` | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 82.8% | 2 | 2 | 64.1s | 69.2s | 69.6s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-12d8fabf/` |
| Codex | `d7c07a6a` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 98.0% | 0 | 0 | 68.4s | 75.9s | 76.6s | $0.25 | $0.75 | 0.888 | 0 | `tests/benchmarks/runs/update-packages-codex-d7c07a6a/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #0 | 0 | `Output avoids unqualified pnpm@latest` |
| Claude | #1 | 0 | `Output avoids unqualified pnpm@latest` |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 82.8% | 2 | 2 | `workflow-artifact-reference` 0.0%; `workflow-output-avoids-unqualified-pnpm-latest` 33.3%; `workflow-actionability` 41.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0% |
| Codex | 98.0% | 0 | 0 | `workflow-actionability` 66.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-12d8fabf/report.json`
- `tests/benchmarks/runs/update-packages-claude-12d8fabf/report.md`
- `tests/benchmarks/runs/update-packages-codex-d7c07a6a/report.json`
- `tests/benchmarks/runs/update-packages-codex-d7c07a6a/report.md`

## Verdict

The fresh rerun failed deterministically. Both runners completed three evaluated runs with no infrastructure blocks. Codex passed all three hard-assertion runs with 98.0% output quality, but Claude failed two of three runs on `Output avoids unqualified pnpm@latest` and had two output-quality threshold failures plus two critical failures.

Recommended next skill: `$session-triage update-packages benchmark failure`
