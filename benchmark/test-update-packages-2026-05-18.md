# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** mixed deterministic result with one Claude infrastructure-blocked run

## Verify

| Layer | Status | Wall time | Notes |
|---|---:|---:|---|
| layer1 | PASS | 3.5s | 1,211 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated pass rate | Blocked runs | Wilson 95% CI | Output-quality score | Threshold failures | Critical failures | p50 latency | p95 latency | p99 latency | Cost/run | Total cost | Similarity | Outliers | Raw session path |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Claude | `c663452c` | 50.0% (1/2) | 1 | [9.5%, 90.5%] | 91.7% | 0 | 1 | 55.1s | 58.6s | 58.9s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-c663452c/` |
| Codex | `ebca44af` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 | 0 | 75.0s | 122.7s | 126.9s | $0.25 | $0.75 | 0.945 | 0 | `tests/benchmarks/runs/update-packages-codex-ebca44af/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #1 | 0 | `Output avoids unqualified pnpm@latest` |

Codex had no failed assertions.

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 91.7% | 0 | 1 | `workflow-output-avoids-unqualified-pnpm-latest` 50.0%; `workflow-artifact-reference` 50.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0% |
| Codex | 100.0% | 0 | 0 | `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0%; `workflow-output-avoids-unqualified-pnpm-latest` 100.0%; `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #0 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-c663452c/report.json`
- `tests/benchmarks/runs/update-packages-claude-c663452c/report.md`
- `tests/benchmarks/runs/update-packages-codex-ebca44af/report.json`
- `tests/benchmarks/runs/update-packages-codex-ebca44af/report.md`

## Notes

This run is not infrastructure-only blocked because both agents produced evaluated outputs and Claude had one deterministic hard-assertion failure. Claude run #1 failed the `Output avoids unqualified pnpm@latest` assertion; the generated artifact selected `pnpm@10.11.0`, but still contained `pnpm@latest` wording in its output/artifact context that the current assertion rejected as a critical failure. Codex passed all evaluated hard assertions.

Recommended next skill: `$session-triage update-packages benchmark failure`
