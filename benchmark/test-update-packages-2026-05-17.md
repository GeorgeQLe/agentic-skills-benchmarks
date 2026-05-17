# Benchmark Test: update-packages - 2026-05-17

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic both-agent pass

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.3s | 1,208 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `2611723c` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 86.5% | 0 | 0 | 34.0s | 40.6s | 41.2s | $0.25 | $0.75 | 0.831 | 0 | `tests/benchmarks/runs/update-packages-claude-2611723c/` |
| Codex | `2216d07d` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 94.2% | 0 | 0 | 60.1s | 71.8s | 72.9s | $0.25 | $0.75 | 0.930 | 0 | `tests/benchmarks/runs/update-packages-codex-2216d07d/` |

Total estimated cost: **$1.50**.

## Failed Assertions

None. All six evaluated runs passed the configured hard assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 86.5% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-next-route` 100.0% |
| Codex | 94.2% | 0 | 0 | `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-artifact-reference` 100.0%; `workflow-next-route` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-2611723c/report.json`
- `tests/benchmarks/runs/update-packages-claude-2611723c/report.md`
- `tests/benchmarks/runs/update-packages-codex-2216d07d/report.json`
- `tests/benchmarks/runs/update-packages-codex-2216d07d/report.md`

## Verdict

The fresh rerun passed for both benchmark runners. Claude and Codex each completed three evaluated runs with 100.0% hard assertion pass rates, no infrastructure blocks, no quality threshold failures, and no critical failures. Subjective output-quality review has not yet been performed for these fresh outputs.

Recommended next skill: `$benchmark-agent-review update-packages`
