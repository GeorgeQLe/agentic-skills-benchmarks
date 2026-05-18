# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** pass for all evaluated hard assertions with one Claude infrastructure-blocked run

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.5s | 1,212 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `bdc852e4` | 100.0% (2/2) | 1 | [34.2%, 100.0%] | 94.0% | 0 | 0 | 57.3s | 57.5s | 57.5s | $0.25 | $0.75 | 0.788 | 0 | `tests/benchmarks/runs/update-packages-claude-bdc852e4/` |
| Codex | `443aab01` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 99.6% | 0 | 0 | 73.2s | 99.8s | 102.2s | $0.25 | $0.75 | 0.915 | 0 | `tests/benchmarks/runs/update-packages-codex-443aab01/` |

Total estimated cost: **$1.50**.

## Failed Assertions

No failed hard assertions were reported for evaluated Claude or Codex runs.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 94.0% | 0 | 0 | `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |
| Codex | 99.6% | 0 | 0 | `workflow-actionability` 91.7%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #1 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-bdc852e4/report.json`
- `tests/benchmarks/runs/update-packages-claude-bdc852e4/report.md`
- `tests/benchmarks/runs/update-packages-codex-443aab01/report.json`
- `tests/benchmarks/runs/update-packages-codex-443aab01/report.md`

## Notes

This run is not a skill failure. All evaluated Claude and Codex runs passed hard assertions. Claude had one infrastructure-blocked run from agent runner budget exhaustion, which is reported separately from evaluated pass rate. The small sample size keeps the Wilson intervals wide, so this is deterministic benchmark evidence for the configured fixtures rather than a statistically definitive quality claim.

Recommended next skill: `$benchmark-agent-review update-packages`
