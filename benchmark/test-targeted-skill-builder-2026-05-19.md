# Benchmark Test: targeted-skill-builder

Date: 2026-05-19

Target skill: `targeted-skill-builder`

Command: `$benchmark-test-skill targeted-skill-builder`

Coverage: custom, `tests/layer4/setups/tier1-workflows.setup.ts`

## Verify

| Layer | Status | Wall Time | Notes |
| --- | --- | ---: | --- |
| layer1 | PASS | 3.0s | Static harness-contract gate passed. |
| layer2 | SKIP | -- | No layer2 tests matched `targeted-skill-builder`; benchmark continued with custom layer4 coverage. |

## Benchmark Summary

| Agent | Evaluated Pass Rate | Blocked Runs | Wilson 95% CI | Output Quality | Critical Failures | Latency p50 | Latency p95 | Latency p99 | Cost / Run | Total Cost | Similarity | Outliers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 0.0% (0/0) | 3 | 0.0%-0.0% | n/a | n/a | n/a | n/a | n/a | $0.25 | $0.75 | 1.000 | 0 |
| codex | 0.0% (0/3) | 0 | 0.0%-56.2% | 92.9% | 0 | 51.0s | 54.9s | 55.2s | $0.25 | $0.75 | 1.000 | 0 |

## Failed Assertions

| Agent | Run | Exit Code | Failed Assertions |
| --- | ---: | ---: | --- |
| codex | #0 | 0 | Output recommends $run |
| codex | #1 | 0 | Output recommends $run |
| codex | #2 | 0 | Output recommends $run |

All three Codex runs produce a `## Next Command` section that routes to `$targeted-skill-builder create-agentic-skill benchmark coverage contract` instead of the expected `$run`. The hard assertion `assertRecommendedRoute(content, "$run")` checks `content.includes("$run")` — the output does not contain the literal string `$run` anywhere.

## Output Quality

The output-quality score is an additional deterministic rubric score, not a statistical confidence measure.

| Agent | Evaluated Runs | Average Score | Threshold Failures | Critical Failures | Lowest-Scoring Criteria |
| --- | ---: | ---: | ---: | ---: | --- |
| claude | 0 | n/a | n/a | n/a | All runs infrastructure-blocked (agent runner budget exceeded). |
| codex | 3 | 92.9% | 0 | 0 | `actionable-next-route` 0.0%; `evidence-linked` 100.0%; `file-reference` 100.0%; `scope-control` 100.0%; `correction-to-contract-mapping` 100.0% |

The Codex output correctly maps the correction to a durable skill contract change, identifies existing-skill overlap (create-agentic-skill, create-local-skill, skill-interview), and proposes a validation plan. The only failure is the `actionable-next-route` quality criterion, which expects `$run` in the Next Command section.

## Infrastructure Blocked Runs

| Agent | Run | Reason |
| --- | ---: | --- |
| claude | #0 | agent runner budget exceeded |
| claude | #1 | agent runner budget exceeded |
| claude | #2 | agent runner budget exceeded |

## Raw Sessions

- Claude: `tests/benchmarks/runs/targeted-skill-builder-claude-3b4f2b62/`
- Codex: `tests/benchmarks/runs/targeted-skill-builder-codex-8f32ac01/`

## Triage

**Claude (infrastructure-blocked):** All three Claude runs exceeded the per-run budget ($0.25) before producing output. The `targeted-skill-builder` fixture requires reading `correction.md` and `tasks/lessons.md`, then writing a structured plan — this exceeds the smoke budget for Claude. Next action: rerun with `--budget standard` or increase `perRunBudgetUsd` in the setup definition.

**Codex (route mismatch):** The agent produces substantively correct output (92.9% quality) but routes to `$targeted-skill-builder` for a follow-up contract update instead of `$run`. This is arguably a reasonable agent decision — the fixture's correction is about skill-creation workflow, so routing to the skill builder makes domain sense. However, the setup expects `$run` as the canonical next step. Two remediation options:

1. **Fixture adjustment:** Accept `$targeted-skill-builder` as a valid alternative route in the hard assertion, since the fixture is about skill contract work.
2. **Prompt clarification:** Add explicit routing guidance to the fixture prompt (e.g., "End with Next command: $run").

Recommended next route: `$session-triage` to decide whether to adjust the fixture or the prompt.
