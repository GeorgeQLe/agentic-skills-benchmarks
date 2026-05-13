# Benchmark Agent Review: session-triage

Date: 2026-05-13
Run label: latest rerun at 11:06 ET
Target skill: `session-triage`
Active workflow: `$benchmark-agent-review session-triage`

## Source Evidence

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Claude run directory: `tests/benchmarks/runs/session-triage-claude-13f4872c/`
- Codex run directory: `tests/benchmarks/runs/session-triage-codex-7cdefe10/`
- Claude source report: `tests/benchmarks/runs/session-triage-claude-13f4872c/report.json`
- Codex source report: `tests/benchmarks/runs/session-triage-codex-7cdefe10/report.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Target skill contract: `global/codex/session-triage/SKILL.md`
- Related skill contract evidence: `global/codex/run/SKILL.md`

## Benchmark Context

| Runner | Hard assertion pass rate | Deterministic quality score | Infrastructure-blocked runs | Retained artifact evidence |
| --- | ---: | ---: | ---: | --- |
| Claude | 2/2 (100.0%) | 78.1% | 1 | Final stdout summaries, assertions, file names, and quality results; full generated report text was not retained |
| Codex | 3/3 (100.0%) | 100.0% | 0 | Full stderr transcripts include generated `session-triage-report.md` diffs and report text |

The benchmark prompt asked each runner to triage `session-log.md` and write `session-triage-report.md` with Target, Verification verdict, Timeline, Root cause, Recommended fix, Validation plan, and Next command. Fixture facts were intentionally sparse: `session-log.md` says `$run` skipped planned coverage matrix validation and shipped anyway, while `tasks/lessons.md` says required validation must run before shipping.

Infrastructure-blocked Claude run 2 is excluded from subjective scoring.

## Output Verdict

Overall subjective verdict: good, with a median in the good band. The Codex outputs are excellent to good: they keep the issue scoped to the sparse fixture, name the evidence gap, identify likely agent noncompliance with an adequate `$run` validation contract, and route to operational validation rather than immediate skill editing. The Claude outputs are weak because they over-remediate a one-off noncompliance fixture into `/targeted-skill-builder run`, and one says no `/run` skill file was present even though the benchmark environment made the installed `$run` contract available.

This review is about generated artifact quality. The deterministic hard assertions passed for all evaluated runs, but the retained outputs show that structure alone does not prove good remediation judgment.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band | Evidence basis | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Codex review | Claude | 0 | 64 | Weak | retained stdout summary | Identifies skipped validation but claims the `/run` skill file was not in scope and routes to `/targeted-skill-builder run`; weak evidence handling and over-remediation |
| Codex review | Claude | 1 | 66 | Weak | retained stdout summary | Calls the rule adequate, then says `/run` lacks a hard gate and recommends both `/run` and lesson edits; handoff is not the smallest durable fix |
| Codex review | Codex | 0 | 97 | Excellent | full retained report text | Evidence-bound, says no `$run` skill change is justified, provides concrete replay validation, and uses an operational `$run` next command |
| Codex review | Codex | 1 | 92 | Excellent | full retained report text | Strong evidence section and operational primary fix; optional future hardening is conditional rather than the main route |
| Codex review | Codex | 2 | 86 | Good | full retained report text | Sensible partial-verification stance and validation ledger, though it is slightly more prescriptive than the sparse fixture proves |

Median subjective score: 86
Score range: 64-97

## Common Strengths

- Every evaluated output selected the right incident: a `$run` session skipped planned coverage matrix validation and shipped anyway.
- The stronger outputs separate the sparse session-log evidence from missing details such as the exact coverage command, full execution trace, and actual ship artifact.
- Codex outputs avoid unconditional skill editing and treat the primary fix as replaying or explicitly accounting for the skipped validation.
- No evaluated output invented external services, GitHub Actions, production deploys, or unrelated repository facts.

## Common Weaknesses

- Claude next-route ergonomics are poor: both evaluated runs route to `/targeted-skill-builder run` despite evidence that this is likely one-off noncompliance with an existing validation requirement.
- Claude retained evidence is incomplete. Because full Claude `session-triage-report.md` text was not persisted, the Claude review relies on stdout summaries, assertions, and deterministic quality details.
- One Claude output makes an unsupported retained-evidence claim that no `/run` skill file was in scope. The fixture did not retain enough transcript to determine why, but the benchmark context expects the installed skill contracts to be available.
- Some good outputs still drift toward a validation-ledger enhancement. That may be useful if the pattern repeats, but it should remain conditional until recurrence evidence exists.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| Evaluated Claude outputs still over-route one-off noncompliance to `/targeted-skill-builder run` after recognizing an adequate validation rule | Benchmark rubric / setup issue | `tests/layer4/setups/tier1-workflows.setup.ts` and `tests/layer1/bench-setups.test.ts` | Tighten the `session-triage` quality rubric so any unconditional skill/contract edit route fails when the output also concludes the existing `$run` contract or lesson already required validation. Require `none`, `$run`, or a clearly operational validation replay route unless recurrence evidence is present. | `pnpm --dir tests test:layer1 -- bench-setups bench-quality` and `pnpm --dir tests verify --skill session-triage` | `$targeted-skill-builder session-triage benchmark over-remediation rubric` |
| Full generated artifact text is not retained for Claude runs, limiting subjective review fidelity and making root-cause comparison weaker | Retained-evidence gap | `tests/harness/bench-runner.ts` or the persistence path that writes `run-*.json` | Persist generated output file content or a bounded artifact excerpt for every runner when the setup declares an expected artifact path. | Inspect a new Claude `run-*.json` and confirm it includes `session-triage-report.md` content or a bounded excerpt. | `$targeted-skill-builder benchmark-agent-review retained artifact evidence` |
| One evaluated output claims the `/run` skill file was not present in scope, which conflicts with benchmark expectations and leads to an unsupported contract-gap conclusion | Harness/setup issue | `tests/layer4/setups/tier1-workflows.setup.ts` | Ensure the fixture prompt or setup facts explicitly include the installed `$run` contract path or a short quoted `$run` validation requirement, so the reviewed output cannot reasonably treat the contract as unavailable. | Focused rerun: `pnpm --dir tests bench --skill session-triage --agent claude --runs 1 --chunk-size 1 --pause 0`, then inspect the generated report for `$run` contract evidence. | `$targeted-skill-builder session-triage benchmark contract evidence` |

## Deterministic-Rubric Notes

The deterministic rubric correctly surfaced the largest retained issue: Claude run 0 failed `no-over-remediation-route`, and Claude run 1 failed both `evidence-linked` and `no-over-remediation-route`. The rubric did not prevent hard assertion pass because hard assertions only check structural workflow compliance. That separation is appropriate: hard assertions should stay structural, while the quality rubric should keep tightening over-remediation and evidence linkage.

## Next Work

Tighten the `session-triage` benchmark quality rubric so one-off noncompliance with an adequate validation contract cannot receive acceptable quality credit when the output routes to unconditional skill or contract edits.

Recommended next command: `$targeted-skill-builder session-triage benchmark over-remediation rubric`
