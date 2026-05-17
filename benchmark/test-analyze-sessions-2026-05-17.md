# Benchmark Test: analyze-sessions

**Date:** 2026-05-17
**Workflow:** `$benchmark-test-skill analyze-sessions`
**Command resolution:** `$benchmark-test-skill` was the active workflow; the user phrase `analyze sessions` was resolved to the known benchmark target `analyze-sessions`.

## Eligibility

`analyze-sessions` is known to the benchmark harness.

| Skill | Coverage | Setup |
| --- | --- | --- |
| analyze-sessions | custom | `tests/layer4/setups/tier23-global-workflows.setup.ts` |

Coverage note: this is custom layer4 evidence with workflow-specific hard assertions and an output-quality rubric.

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.2s | 1,204 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `analyze-sessions` |

Verify command:

```bash
pnpm verify --skill analyze-sessions
```

## Benchmark

Benchmark command:

```bash
pnpm bench --skill analyze-sessions --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Session | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Quality Score | Quality Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Consistency | Outliers | Raw Session Path |
| --- | --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | `0cb06af8` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 0 threshold, 0 critical | 54.9s | 55.3s | 55.3s | $1.00 | $3.00 | 0.873 | 0 | `tests/benchmarks/runs/analyze-sessions-claude-0cb06af8/` |
| Codex | `2da5dfa4` | 100.0% (3/3) | 0 | [43.8%, 100.0%] | 92.3% | 0 threshold, 0 critical | 51.5s | 51.7s | 51.8s | $1.00 | $3.00 | 0.945 | 0 | `tests/benchmarks/runs/analyze-sessions-codex-2da5dfa4/` |

Output-quality score is an additional rubric score, not a replacement for hard assertion pass rate or a statistical confidence measure.

## Failed Assertions

No failed hard assertions were reported in evaluated runs.

## Output Quality Details

| Agent | Lowest-Scoring Criteria |
| --- | --- |
| Claude | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0%; `workflow-remediation-ready-handoff` 100.0% |
| Codex | `workflow-artifact-reference` 0.0%; `workflow-fixture-facts` 100.0%; `workflow-next-route` 100.0%; `workflow-domain-specificity` 100.0%; `workflow-remediation-ready-handoff` 100.0% |

The `workflow-artifact-reference` criterion lowered the average quality score for both agents, but the persisted benchmark reports recorded no threshold failures and no critical failures.

## Infrastructure Blocks

| Agent | Blocked Runs | Reason |
| --- | ---: | --- |
| Claude | 0 | none |
| Codex | 0 | none |

## Raw Reports

- Claude JSON: `tests/benchmarks/runs/analyze-sessions-claude-0cb06af8/report.json`
- Claude Markdown: `tests/benchmarks/runs/analyze-sessions-claude-0cb06af8/report.md`
- Codex JSON: `tests/benchmarks/runs/analyze-sessions-codex-2da5dfa4/report.json`
- Codex Markdown: `tests/benchmarks/runs/analyze-sessions-codex-2da5dfa4/report.md`

## Verdict

Verify passed. Claude and Codex each completed all three evaluated runs with 3/3 hard assertions, 92.3% output-quality score, no threshold failures, no critical failures, and no infrastructure-blocked runs. Because evaluated benchmark outputs now exist and subjective ergonomic review has not been performed, the next separate step is agent review.

Recommended next skill: `$benchmark-agent-review analyze-sessions`
