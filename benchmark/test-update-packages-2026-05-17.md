# Benchmark Test: `update-packages` — 2026-05-17

## Command Resolution

- Active workflow: `$benchmark-test-skill`
- Target skill argument: `update-packages`
- Harness eligibility: known repository skill
- Coverage: `custom`
- Setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 5.6s | 1,204 tests passed across 15 files |
| layer2 | SKIP | -- | No target-specific layer2 tests matched `update-packages` |

## Benchmark Summary

Command:

```bash
pnpm bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Quality Score | Threshold Failures | Critical Failures | p50 | p95 | p99 | Cost / Run | Total Cost | Mean Pairwise Similarity | Outliers | Raw Session Path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Claude | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 39.4% | 3 | 7 | 33.3s | 39.0s | 39.5s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-claude-4f02cadc/` |
| Codex | 0.0% (0/3) | 0 | [0.0%, 56.2%] | 38.6% | 3 | 7 | 46.4s | 50.0s | 50.4s | $0.25 | $0.75 | 1.000 | 0 | `tests/benchmarks/runs/update-packages-codex-febcb2db/` |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| Claude | 0 | 0 | Output recommends `$run` |
| Claude | 1 | 0 | Output includes older than 8 days; Output recommends `$run` |
| Claude | 2 | 0 | Output recommends `$run` |
| Codex | 0 | 0 | Output recommends `$run` |
| Codex | 1 | 0 | Output recommends `$run` |
| Codex | 2 | 0 | Output includes older than 8 days; Output recommends `$run` |

## Output Quality

| Agent | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | --- |
| Claude | 39.4% | 3 | 7 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `no-generic-or-external-overreach` 0.0%; `workflow-actionability` 33.3%; `workflow-fixture-facts` 66.7% |
| Codex | 38.6% | 3 | 7 | `workflow-artifact-reference` 0.0%; `workflow-next-route` 0.0%; `no-generic-or-external-overreach` 0.0%; `workflow-actionability` 25.0%; `workflow-fixture-facts` 66.7% |

## Infrastructure-Blocked Runs

- Claude: none
- Codex: none

## Raw Evidence

- Claude report: `tests/benchmarks/runs/update-packages-claude-4f02cadc/report.json`
- Codex report: `tests/benchmarks/runs/update-packages-codex-febcb2db/report.json`

## Verdict

`update-packages` failed the hard benchmark assertions for both agents. The dominant failure is next-route compliance: all six evaluated runs failed to recommend `$run`. One Claude run and one Codex run also failed to include the required “older than 8 days” eligibility fact. Because there were no infrastructure-blocked runs, this is a benchmark failure rather than runner-capacity blockage.

Recommended next skill: `$session-triage update-packages benchmark failure`
