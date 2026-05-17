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
| Claude | `52b6ef8a` | 0.0% (0/1) | 2 | [0.0%, 79.3%] | 85.7% | 0 threshold, 1 critical | 43.2s | 43.2s | 43.2s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-claude-52b6ef8a/` |
| Codex | `3d90c865` | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 90.5% | 0 threshold, 1 critical | 66.1s | 66.6s | 66.6s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-codex-3d90c865/` |

Output-quality score is an additional rubric score, not a replacement for hard assertion pass rate or a statistical confidence measure.

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| Claude | 0 | 0 | Output recommends `$spec-interview` |
| Codex | 0 | 0 | Output recommends `$spec-interview` |
| Codex | 1 | 0 | Output recommends `$spec-interview` |
| Codex | 2 | 0 | Output recommends `$spec-interview` |

## Output Quality Details

| Agent | Lowest-Scoring Criteria |
| --- | --- |
| Claude | `file-reference` 0.0%; `actionable-next-route` 0.0%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |
| Codex | `actionable-next-route` 0.0%; `file-reference` 66.7%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0% |

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
| --- | ---: | --- |
| Claude | 2 | agent runner budget exceeded |
| Codex | 0 | none |

## Raw Reports

- Claude JSON: `tests/benchmarks/runs/feature-interview-claude-52b6ef8a/report.json`
- Claude Markdown: `tests/benchmarks/runs/feature-interview-claude-52b6ef8a/report.md`
- Codex JSON: `tests/benchmarks/runs/feature-interview-codex-3d90c865/report.json`
- Codex Markdown: `tests/benchmarks/runs/feature-interview-codex-3d90c865/report.md`

## Verdict

Verify passed, but both evaluated agents failed the custom hard benchmark assertions. Claude also had two infrastructure-blocked runs from runner budget exhaustion. The repeated evaluated-run failure is the final next-route expectation: outputs recommended `$spec-interview` instead of the route expected by the `feature-interview` benchmark setup.

Recommended next skill: `$session-triage feature-interview benchmark failure`
