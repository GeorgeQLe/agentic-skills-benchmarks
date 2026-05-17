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
| layer1 | PASS | 4.2s | 1,204 tests passed across 15 files |
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
| Claude | `9139ad15` | 0.0% (0/0) | 3 | [0.0%, 0.0%] | n/a | n/a | 0.0s | 0.0s | 0.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-claude-9139ad15/` |
| Codex | `ab46e0d0` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 100.0% | 0 threshold, 0 critical | 58.9s | 60.5s | 60.6s | $0.25 | $0.75 | 0.887 | 0 | `tests/benchmarks/runs/feature-interview-codex-ab46e0d0/` |

Output-quality score is an additional rubric score, not a replacement for hard assertion pass rate or a statistical confidence measure.

## Failed Assertions

No failed hard assertions were reported in evaluated runs.

## Output Quality Details

| Agent | Lowest-Scoring Criteria |
| --- | --- |
| Claude | n/a; all three runs were infrastructure-blocked before evaluation |
| Codex | `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0%; `validation-specificity` 100.0% |

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
| --- | ---: | --- |
| Claude | 3 | agent runner budget exceeded |
| Codex | 0 | none |

## Raw Reports

- Claude JSON: `tests/benchmarks/runs/feature-interview-claude-9139ad15/report.json`
- Claude Markdown: `tests/benchmarks/runs/feature-interview-claude-9139ad15/report.md`
- Codex JSON: `tests/benchmarks/runs/feature-interview-codex-ab46e0d0/report.json`
- Codex Markdown: `tests/benchmarks/runs/feature-interview-codex-ab46e0d0/report.md`

## Verdict

Verify passed, and Codex completed all three evaluated runs with 3/3 hard assertions, 100.0% output-quality score, no threshold failures, and no critical failures. Claude produced no evaluated runs because all three runs were infrastructure-blocked by runner budget exhaustion. This is not a `feature-interview` skill failure; the evaluated Codex outputs should move to subjective review while the blocked Claude lane is reported separately.

Recommended next skill: `$benchmark-agent-review feature-interview`
