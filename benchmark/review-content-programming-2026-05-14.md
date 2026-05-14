# Benchmark Agent Review: content-programming

Date: 2026-05-14

## Source Evidence

- Curated benchmark report: `benchmark/test-content-programming-2026-05-14.md`
- Claude run directory: `tests/benchmarks/runs/content-programming-claude-a8dda4dc/`
- Codex run directory: `tests/benchmarks/runs/content-programming-codex-7f0f09f4/`
- Reviewed artifacts: `pack-benchmark-output.md` snapshots retained in `run-000.json`, `run-001.json`, and `run-002.json` for both agents.
- Fixture facts: `pack-input.md` identifies `creator-foundation`, `content-programming`, focus `creator content programming strategy`, weekly cadence, practical build-note audience need, durable pillars, recurring formats, portfolio balance axes, measurement axes, cleanup target `stale setup walkthroughs`, and next series candidate `local-first benchmark workflow`. `fixtures/local-evidence.md` says the fixture is local and deterministic and avoids external services.

## Deterministic Context

| Runner | Run Directory | Hard Assertions | Deterministic Quality | Infrastructure Blocked |
| --- | --- | ---: | ---: | ---: |
| Claude | `tests/benchmarks/runs/content-programming-claude-a8dda4dc/` | 3/3 | 96.8% | 0 |
| Codex | `tests/benchmarks/runs/content-programming-codex-7f0f09f4/` | 3/3 | 98.1% | 0 |

The deterministic scores are context only. This review judges the retained generated artifacts for usefulness to a next operator.

## Output-Quality Verdict

The reviewed outputs are excellent overall. All six artifacts now behave like full creator programming strategies rather than calendar smoke outputs: they define a thesis, map durable pillars to audience jobs, map recurring formats to portfolio roles, handle weekly cadence constraints, balance acquisition/trust/proof/education/retention, define measurement and warning signs, plan cleanup for stale setup walkthroughs, identify next series candidates, cite local fixture evidence, and route correctly to `series-spec`.

The outputs are not identical in depth. Claude run 1 and Codex runs 1-2 are the strongest because they connect fixture facts to practical operating choices without becoming a script or full calendar. Claude run 0 is a little more generic on measurement targets, and Codex run 0 is more basic on audience-job specificity. Those are normal variation, not remediation-worthy failures.

## Agent-Review Scores

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex reviewer | Claude | 0 | 91 | Excellent | Complete strategy surface with strong fixture citations and risk handling; measurement targets are useful but somewhat generic. |
| Codex reviewer | Claude | 1 | 94 | Excellent | Best cadence and portfolio operating model; cleanup and local-only constraints are concrete and actionable. |
| Codex reviewer | Claude | 2 | 92 | Excellent | Strong measurement plan and cleanup/refactor sequence; slightly over-indexes on percentages that are fixture-informed but not evidenced by channel data. |
| Codex reviewer | Codex | 0 | 90 | Excellent | Clear fixture grounding, practical scope control, and correct `$series-spec` route; less rich than the others on audience-job nuance. |
| Codex reviewer | Codex | 1 | 93 | Excellent | Strongest Codex output for series candidates and stale-content cleanup; keeps the plan bounded to strategy rather than scripting. |
| Codex reviewer | Codex | 2 | 92 | Excellent | Strong local-deterministic workflow framing and evidence mapping; adds an extra pillar from fixture context, but it is defensible as a series lane. |

Median subjective score: 92.0. Score range: 90-94.

## Common Strengths

- Every output names the `creator-foundation` pack and `content-programming` skill.
- Every output cites concrete fixture facts from `pack-input.md` and `fixtures/local-evidence.md`.
- The artifacts cover the full programming-strategy contract rather than stopping at a calendar.
- Portfolio balance is explicit and tied to recurring formats.
- Measurement plans include local, fixture-appropriate checks such as cadence completion, evidence coverage, artifact readiness, and series handoff readiness.
- Cleanup/refactor plans are consistently tied to the fixture's stale setup walkthrough target.
- Next-route ergonomics are correct for runner mode: Claude outputs use `/series-spec`, and Codex outputs use `$series-spec`.
- The outputs avoid unsupported analytics, external services, install steps, or remote mutations.

## Common Weaknesses

- Some artifacts use precise portfolio percentages even though the fixture has no channel history or performance data. The percentages are usable planning defaults, but a real channel artifact would label them more explicitly as initial targets.
- Some outputs add a `local deterministic workflow` or `local-first benchmark workflow` lane beyond the three listed pillars. This is grounded in fixture context, but future real-channel runs should distinguish durable pillars from next-series candidates.
- Claude run 0 and Codex run 0 are less specific about validation thresholds than the strongest outputs, though still actionable.

## Remediation Handoff

No material remediation is needed. The common weaknesses are acceptable variation for a benchmark fixture that intentionally lacks a real creator slug, platform analytics, or existing content inventory.

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| No remediation-worthy output-quality issue found in the reviewed full-contract artifacts. | none | none | Keep current `content-programming` benchmark setup and skill contracts unchanged. | Existing report-field checks, Skills Showcase data validation, and `git diff --check` are sufficient for this review artifact update. | `$ship` |

## Deterministic-Rubric Notes

The deterministic rubric correctly surfaced clean hard-assertion and quality results. The `pack-workflow-traits` criterion still penalized some outputs for missing generic `platform` or `provenance` wording, but the retained artifacts were not materially weaker for that in this local-only fixture. This is not worth changing now because the richer `content-programming`-specific criteria already carry the important behavior.

## Next Work

No follow-up remediation. The deterministic benchmark and subjective review both support the current `content-programming` full-contract coverage.

Recommended next command: `$ship`
