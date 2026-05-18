# Benchmark Test: update-packages - 2026-05-18

**Workflow:** `$benchmark-test-skill update-packages`
**Target skill:** `update-packages`
**Coverage status:** custom (`tests/layer4/setups/tier23-global-workflows.setup.ts`)
**Result:** deterministic both-agent failure with partial Claude infrastructure blocks

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
| Claude | `225f6efc` | 0.0% (0/1) | 2 | [0.0%, 79.3%] | 75.0% | 1 | 2 | 57.1s | 57.1s | 57.1s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-225f6efc/` |
| Codex | `fd2c4602` | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 89.7% | 0 | 3 | 68.0s | 78.5s | 79.4s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-codex-fd2c4602/` |

Total estimated cost: **$1.50**.

## Failed Assertions

| Agent | Run | Exit code | Failed assertions |
|---|---:|---:|---|
| Claude | #1 | 0 | `Output proves selected pnpm toolchain age eligibility`; `Output preserves age-gate key semantics` |
| Codex | #0 | 0 | `Output preserves age-gate key semantics` |
| Codex | #1 | 0 | `Output preserves age-gate key semantics` |
| Codex | #2 | 0 | `Output preserves age-gate key semantics` |

## Output Quality

The output-quality score is an additional rubric score, not a statistical confidence measure and not a replacement for the hard assertion pass rate.

| Agent | Average score | Threshold failures | Critical failures | Lowest-scoring criteria |
|---|---:|---:|---:|---|
| Claude | 75.0% | 1 | 2 | `workflow-output-proves-selected-pnpm-toolchain-age-eligibility` 0.0%; `workflow-output-preserves-age-gate-key-semantics` 0.0%; `workflow-artifact-reference` 0.0%; `workflow-actionability` 75.0%; `workflow-fixture-facts` 100.0% |
| Codex | 89.7% | 0 | 3 | `workflow-output-preserves-age-gate-key-semantics` 0.0%; `workflow-actionability` 83.3%; `workflow-fixture-facts` 100.0%; `workflow-output-includes-verification-command-evidence` 100.0%; `workflow-output-includes-major-upgrade-compatibility-risk-handling` 100.0% |

## Infrastructure Blocks

| Agent | Run | Reason |
|---|---:|---|
| Claude | #0 | agent runner budget exceeded |
| Claude | #2 | agent runner budget exceeded |

Codex had no infrastructure-blocked runs.

## Raw Reports

- `tests/benchmarks/runs/update-packages-claude-225f6efc/report.json`
- `tests/benchmarks/runs/update-packages-claude-225f6efc/report.md`
- `tests/benchmarks/runs/update-packages-codex-fd2c4602/report.json`
- `tests/benchmarks/runs/update-packages-codex-fd2c4602/report.md`

## Notes

The deterministic result is a failed benchmark. Claude had two infrastructure-blocked runs from agent-runner budget exhaustion, but it also had one evaluated run that failed both pnpm toolchain-proof and age-gate semantics assertions. Codex completed all three evaluated runs and failed the age-gate semantics assertion in every run, with three critical output-quality failures. This should be triaged before another full rerun.

Recommended next skill: `$session-triage update-packages benchmark failure`
