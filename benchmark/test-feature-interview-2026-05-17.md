# Benchmark Test: feature-interview

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill feature-interview`
**Command resolution:** `$benchmark-test-skill` was the active workflow; `feature-interview` was treated only as the benchmark target argument.

## Eligibility

`feature-interview` is known to the benchmark harness.

| Skill | Coverage | Setup |
| --- | --- | --- |
| feature-interview | custom | `tests/layer4/setups/tier1-workflows.setup.ts` |

Coverage note: this is custom layer4 evidence with skill-specific assertions and an output-quality rubric.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 4.6s | 1,202 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `feature-interview` |

Verify command:

```bash
pnpm verify --skill feature-interview
```

## Benchmark

Benchmark command:

```bash
pnpm bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Quality Score | Quality Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | `6bd2c89a` | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 90.5% | 0 threshold, 1 critical | 47.6s | 57.0s | 57.9s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/` |
| Codex | `5bd5a8da` | 33.3% (1/3) | 0 | [6.1%, 79.2%] | 90.5% | 0 threshold, 2 critical | 68.4s | 77.2s | 77.9s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/` |

Output-quality score is an additional rubric score, not a replacement for hard assertion pass rate or a statistical confidence measure.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| Claude | 0 | 0 | Output recommends `$spec-interview` |
| Claude | 1 | 0 | Output recommends `$spec-interview` |
| Claude | 2 | 0 | Output recommends `$spec-interview` |
| Codex | 0 | 0 | Output recommends `$spec-interview` |
| Codex | 2 | 0 | Output recommends `$spec-interview` |

## Output Quality Details

| Agent | Lowest-Scoring Criteria |
| --- | --- |
| Claude | `actionable-next-route` 0.0%; `file-reference` 66.7%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |
| Codex | `file-reference` 33.3%; `actionable-next-route` 33.3%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |

## Infrastructure Blocks

No infrastructure-blocked runs were reported for either agent.

## Raw Reports

- Claude JSON: `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/report.json`
- Claude Markdown: `tests/benchmarks/runs/feature-interview-claude-6bd2c89a/report.md`
- Codex JSON: `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/report.json`
- Codex Markdown: `tests/benchmarks/runs/feature-interview-codex-5bd5a8da/report.md`

## Verdict

Verify passed, but both evaluated agents failed the custom hard benchmark assertions. The repeated failed assertion is the final next-route expectation: outputs recommended `$spec-interview` instead of the route expected by the `feature-interview` benchmark setup.

Recommended next skill: `$session-triage feature-interview benchmark failure`
