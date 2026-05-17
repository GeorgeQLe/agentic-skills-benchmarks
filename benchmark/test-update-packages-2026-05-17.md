# Benchmark Test: update-packages - 2026-05-17

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** mixed deterministic benchmark result

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.3s | 1,206 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `c99f0776` | 66.7% (2/3) | 0 | [20.8%, 93.9%] | 75.0% | 1 | 1 | 34.7s | 40.1s | 40.6s | $0.25 | $0.75 | 0.807 | 0 | `tests/benchmarks/runs/update-packages-claude-c99f0776/` |
| Codex | `e51e553b` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 93.2% | 0 | 0 | 53.7s | 56.4s | 56.7s | $0.25 | $0.75 | 0.922 | 0 | `tests/benchmarks/runs/update-packages-codex-e51e553b/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | 1 | 0 | Output includes verification commands |
| Codex | -- | -- | none |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 75.0% | 1 | 1 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 66.7%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |
| Codex | 93.2% | 0 | 0 | `workflow-actionability` 25.0%; `workflow-fixture-facts` 100.0%; `workflow-artifact-reference` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0% |

## Infrastructure Blocks

None. All six benchmark runs were evaluated.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-c99f0776/report.json`
- `tests/benchmarks/runs/update-packages-claude-c99f0776/report.md`
- `tests/benchmarks/runs/update-packages-codex-e51e553b/report.json`
- `tests/benchmarks/runs/update-packages-codex-e51e553b/report.md`

## Verdict

The rerun improved from the earlier same-day failure but is not a clean both-agent pass. Codex passed all hard assertions and quality thresholds. Claude passed two of three hard-assertion runs, but one run missed the verification-command assertion and the quality evaluator recorded one threshold failure plus one critical failure.

Recommended next skill: `$session-triage update-packages benchmark failure`
