# Benchmark Test: session-triage

Date: 2026-05-13
Command: `$benchmark-test-skill session-triage`
Active workflow: `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
Target skill: `session-triage`

## Eligibility

`session-triage` is a known repository benchmark target.

| Skill | Coverage | Setup |
| --- | --- | --- |
| `session-triage` | custom | `tests/layer4/setups/tier1-workflows.setup.ts` |

## Verify

Command run from `tests/`:

```bash
pnpm verify --skill session-triage
```

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 9.0s | 1,349 tests passed across 12 files |
| layer2 | SKIP | -- | No layer2 tests matched skill `session-triage` |

## Benchmark

Command run from `tests/`:

```bash
pnpm bench --skill session-triage --agent both --runs 3 --chunk-size 3 --pause 0
```

| Agent | Evaluated Pass Rate | Evaluated Runs | Infrastructure Blocked | Wilson 95% CI |
| --- | ---: | ---: | ---: | --- |
| Claude | 0.0% | 0/2 | 1 | [0.0%, 65.8%] |
| Codex | 66.7% | 2/3 | 0 | [20.8%, 93.9%] |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertion |
| --- | ---: | ---: | --- |
| Claude | 0 | 0 | Output recommends `$targeted-skill-builder` |
| Claude | 2 | 0 | Output recommends `$targeted-skill-builder` |
| Codex | 0 | 0 | Output recommends `$targeted-skill-builder` |

## Output Quality

Output-quality scores are additional rubric scores, not a replacement for the hard assertion pass rate.

| Agent | Average Quality Score | Quality Evaluated Runs | Threshold Failures | Critical Failures | Lowest-Scoring Criterion |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude | 92.9% | 2 | 0 | 0 | `actionable-next-route` at 0.0% |
| Codex | 97.6% | 3 | 0 | 0 | `actionable-next-route` at 66.7% |

## Infrastructure-Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| Claude | 1 | agent runner budget exceeded |

## Latency

| Agent | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| Claude | 42.8s | 43.3s | 43.3s |
| Codex | 55.5s | 60.3s | 60.8s |

## Cost

| Agent | Cost Per Run | Total Cost |
| --- | ---: | ---: |
| Claude | $0.25 | $0.75 |
| Codex | $0.25 | $0.75 |
| Total | -- | $1.50 |

## Consistency

| Agent | Mean Pairwise Similarity | Outlier Count |
| --- | ---: | ---: |
| Claude | 1.000 | 0 |
| Codex | 0.855 | 0 |

## Raw Session Paths

| Agent | Raw Session Path | Report JSON |
| --- | --- | --- |
| Claude | `tests/benchmarks/runs/session-triage-claude-49cd4515/` | `tests/benchmarks/runs/session-triage-claude-49cd4515/report.json` |
| Codex | `tests/benchmarks/runs/session-triage-codex-2717976e/` | `tests/benchmarks/runs/session-triage-codex-2717976e/report.json` |

## Conclusion

Verify passed, but the deterministic benchmark did not pass. The repeated failure is the hard next-route assertion: outputs did not consistently recommend `$targeted-skill-builder` for the benchmark failure fixture. One Claude run was infrastructure-blocked by runner budget and is not counted as a skill failure.

Recommended next command: `$session-triage session-triage benchmark failure`
