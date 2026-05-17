# Benchmark Test: update-packages — 2026-05-17

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** failed deterministic benchmark assertions

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.4s | 1,204 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `573c54a8` | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 21.2% | 3 | 9 | 42.7s | 43.1s | 43.1s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-573c54a8/` |
| Codex | `51516b57` | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 47.7% | 3 | 6 | 57.1s | 60.3s | 60.6s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-codex-51516b57/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | 0 | 0 | Output includes older than 8 days; Output includes min-release-age; Output recommends $run |
| Claude | 1 | 0 | Output includes older than 8 days; Output includes min-release-age; Output recommends $run |
| Claude | 2 | 0 | Output includes older than 8 days; Output recommends $run |
| Codex | 0 | 0 | Output recommends $run |
| Codex | 1 | 0 | Output recommends $run |
| Codex | 2 | 0 | Output recommends $run |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Lowest-scoring criteria |
|---|---:|---|
| Claude | 21.2% | `workflow-fixture-facts` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `no-generic-or-external-overreach` 0.0%; `workflow-actionability` 33.3% |
| Codex | 47.7% | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `no-generic-or-external-overreach` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-573c54a8/report.json`
- `tests/benchmarks/runs/update-packages-claude-573c54a8/report.md`
- `tests/benchmarks/runs/update-packages-codex-51516b57/report.json`
- `tests/benchmarks/runs/update-packages-codex-51516b57/report.md`

## Verdict

The deterministic benchmark failed for both agents. Codex preserved the fixture facts but missed the expected next-route assertion in every run. Claude also missed the 8-day and `min-release-age` fixture assertions in multiple runs.

Recommended next skill: `$session-triage update-packages benchmark failure`
