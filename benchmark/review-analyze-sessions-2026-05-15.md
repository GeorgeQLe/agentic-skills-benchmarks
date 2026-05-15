# Benchmark Agent Review: analyze-sessions

Date: 2026-05-15

## Source Evidence

- Curated benchmark report: `benchmark/test-analyze-sessions-2026-05-15.md`
- Claude run directory: `tests/benchmarks/runs/analyze-sessions-claude-bc867ac4/`
- Codex run directory: `tests/benchmarks/runs/analyze-sessions-codex-f4218901/`
- Reviewed artifacts: `session-analysis.md` snapshots retained in `run-000.json`, `run-001.json`, and `run-002.json` for both agents.
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Target skill contracts: `global/claude/analyze-sessions/SKILL.md` and `global/codex/analyze-sessions/SKILL.md`

## Benchmark Context

Both runners completed 3/3 evaluated runs with no infrastructure-blocked runs.

| Runner | Hard Assertions | Deterministic Output Quality | Threshold Failures | Critical Failures |
| --- | ---: | ---: | ---: | ---: |
| Claude | 3/3 (100.0%) | 89.4% | 0 | 0 |
| Codex | 3/3 (100.0%) | 90.9% | 0 | 0 |

The fixture asked each runner to analyze three local session logs under `sessions/`, write `session-analysis.md`, identify recurring patterns, automation opportunities, risks, and a final recommended next command. The key fixture facts were repeated validation misses and lessons-capture misses on 2026-05-01, 2026-05-08, and 2026-05-15. The expected broad follow-up was runner-specific `targeted-skill-builder`: `/targeted-skill-builder` for Claude and `$targeted-skill-builder` for Codex.

The deterministic scores are context only. This review judges the retained generated artifacts for usefulness to a next operator.

## Output-Quality Verdict

The reviewed outputs are good overall, with two excellent Codex artifacts and no failing or weak artifacts. Every output identifies the central recurring workflow gap: after task, roadmap, or todo documentation edits, validation proof and lessons capture are repeatedly missed until the user intervenes. The artifacts preserve the three fixture dates, connect the misses to risks, recommend durable automation instead of one-off triage, and avoid unsupported external services or repository mutations.

The main ergonomic weakness is remediation handoff precision. Several Claude outputs and one concise Codex output route to `targeted-skill-builder` correctly but leave the final command broad, dual-mode, or dependent on adjacent prose instead of providing one concrete runner-specific command with the gap phrase. A next operator can still act, but they must translate the analysis into the exact targeted-skill-builder brief. A secondary weakness is evidence attribution: one Claude output over-infers runner ownership from sparse fixture logs, treating two records as Claude-specific when the fixture only explicitly names Codex once and `$run` once.

## Agent-Review Scores

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex reviewer | Claude | 0 | 87 | Good | Clear pattern detection, strong risk framing, and correct broad route. Final handoff gives both Claude and Codex routes and lacks a single concrete targeted-skill-builder argument. |
| Codex reviewer | Claude | 1 | 86 | Good | Good post-doc-edit gate synthesis with useful evidence quotes. It labels `$run` as Codex and leaves the final route as a generic dual-mode handoff plus prose brief. |
| Codex reviewer | Claude | 2 | 84 | Good | Most comprehensive risk list and cross-runner framing, but it over-infers source attribution and recommends a broad targeted skill update without a precise final command argument. |
| Codex reviewer | Codex | 0 | 91 | Excellent | Strong source table, exact evidence, ranked automation opportunities, specific `$targeted-skill-builder` command, and clear residual-risk framing. |
| Codex reviewer | Codex | 1 | 88 | Good | Concise and actionable with the right route and specific command. It is thinner on source comparison and validation detail than the strongest artifacts. |
| Codex reviewer | Codex | 2 | 90 | Excellent | Good evidence grounding, remediation shape, risk framing, and exact runner-specific command. Slightly broad on detecting `lessons` file edits as part of the guard. |

Median subjective score: 87.5. Score range: 84-91.

## Common Strengths

- Every output correctly treats the fixture as a recurring cross-session workflow gap, not a single incident for session triage.
- Every output names validation skips after task, roadmap, or todo edits and missed lessons capture as the two recurring patterns.
- Every output ties the patterns to concrete dates or fixture evidence from all three session logs.
- Risk sections are operator-relevant: silent doc drift, repeated correction burden, degraded trust, and lost institutional memory.
- All outputs avoid external services, GitHub Actions, deploys, package-manager mutations, or invented benchmark runs.
- Codex runs 0 and 2 provide especially clean final `$targeted-skill-builder ...` command arguments.

## Common Weaknesses

- Several outputs route to `targeted-skill-builder` without a single exact command argument that names the remediation target. The next operator can infer the brief, but the handoff is not consistently remediation-ready.
- Claude outputs often include both Claude and Codex route spellings in the final handoff. That is understandable for a mirrored fixture, but less ergonomic than one runner-native command.
- One Claude output over-attributes source ownership, saying two incidents were Claude-specific even though the fixture does not support that exact split.
- Validation advice is mostly procedural. The outputs rarely name the concrete verification that should prove the future targeted skill fix, such as a layer1 contract test and a one-run benchmark smoke.

## Remediation Handoff

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| `analyze-sessions` outputs identify the right recurring gap but do not consistently make the `targeted-skill-builder` handoff remediation-ready. | target-skill contract | `global/claude/analyze-sessions/SKILL.md` and `global/codex/analyze-sessions/SKILL.md` | When recommending targeted-skill-builder for a broad verified workflow gap, require one runner-native final command with a concrete gap phrase, likely owner surface, and validation expectation. | Add layer1 contract coverage for remediation-ready targeted-skill-builder handoff language, then run `pnpm --dir tests verify --skill analyze-sessions`. | `$targeted-skill-builder analyze-sessions remediation-ready targeted-skill-builder handoff` |
| The benchmark quality rubric passes outputs that route correctly but give only a generic or dual-mode `targeted-skill-builder` command. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` | After the skill contract is tightened, add an `analyze-sessions` quality criterion that rewards a specific runner-native `targeted-skill-builder` command argument for recurring workflow gaps. | `pnpm --dir tests exec vitest run --project layer1 bench-setups` and a one-run both-agent benchmark smoke for `analyze-sessions`. | `$targeted-skill-builder analyze-sessions benchmark review route-specificity rubric` |
| One output over-infers runner/source ownership from sparse fixture notes. | target-skill contract | `global/claude/analyze-sessions/SKILL.md` and `global/codex/analyze-sessions/SKILL.md` | Clarify that source comparison should distinguish explicit evidence from inferred source labels and should not assign runner ownership unless the scoped history supports it. | Add a contract or fixture assertion that sparse logs are reported as explicit facts without unsupported source attribution. | `$targeted-skill-builder analyze-sessions evidence-attribution guard` |

## Deterministic-Rubric Notes

The deterministic rubric aligned with the broad result: all runs passed hard assertions, preserved fixture facts, and used the correct targeted-skill-builder route family. It also flagged `workflow-artifact-reference` at 0.0% because the generated artifacts do not name `session-analysis.md` inside the report body. Subjectively, that is not the material weakness; the generated artifact path is already retained in the benchmark evidence, and the reports are useful without self-naming the filename.

The rubric does not currently distinguish a generic or dual-mode targeted-skill-builder route from a remediation-ready runner-specific command with a concrete gap phrase. That is the useful tightening after the skill contract is updated.

## Next Work

Tighten `analyze-sessions` so broad workflow-gap findings produce a remediation-ready targeted-skill-builder handoff: one runner-native command, a concrete gap phrase, likely owner surface, and validation expectation.

Recommended next command: `$targeted-skill-builder analyze-sessions remediation-ready targeted-skill-builder handoff`
