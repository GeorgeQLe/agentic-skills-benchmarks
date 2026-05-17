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
| layer1 | PASS | 3.9s | 1,204 tests passed across 15 files |
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
| Claude | `e5b18930` | 100.0% (1/1) | 2 | [20.7%, 100.0%] | 92.9% | 0 threshold, 1 critical | 35.0s | 35.0s | 35.0s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/feature-interview-claude-e5b18930/` |
| Codex | `1ff31029` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 97.6% | 0 threshold, 1 critical | 68.2s | 73.9s | 74.4s | $0.25 | $0.75 | 0.878 | 0 | `tests/benchmarks/runs/feature-interview-codex-1ff31029/` |

Output-quality score is an additional rubric score, not a replacement for hard assertion pass rate or a statistical confidence measure.

## Failed Assertions

No failed hard assertions were reported in evaluated runs.

## Output Quality Details

| Agent | Lowest-Scoring Criteria |
| --- | --- |
| Claude | `file-reference` 0.0%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0%; `validation-specificity` 100.0% |
| Codex | `file-reference` 66.7%; `evidence-linked` 100.0%; `scope-control` 100.0%; `interview-decision-quality` 100.0%; `validation-specificity` 100.0% |

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
| --- | ---: | --- |
| Claude | 2 | agent runner budget exceeded |
| Codex | 0 | none |

## Raw Reports

- Claude JSON: `tests/benchmarks/runs/feature-interview-claude-e5b18930/report.json`
- Claude Markdown: `tests/benchmarks/runs/feature-interview-claude-e5b18930/report.md`
- Codex JSON: `tests/benchmarks/runs/feature-interview-codex-1ff31029/report.json`
- Codex Markdown: `tests/benchmarks/runs/feature-interview-codex-1ff31029/report.md`

## Verdict

Verify passed, and the post-route-alignment benchmark passed hard assertions for all evaluated runs. Claude had two infrastructure-blocked runs from runner budget exhaustion, and the single evaluated Claude run retained one critical output-quality failure for missing concrete file-reference evidence. Codex passed 3/3 evaluated runs and retained one critical output-quality failure from one run's missing concrete file-reference evidence.

Recommended next skill: `$benchmark-agent-review feature-interview`
