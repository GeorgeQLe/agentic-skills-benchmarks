# Benchmark Agent Review: session-triage

Date: 2026-05-13
Run label: fresh rerun at 10:40 ET
Target skill: `session-triage`
Active workflow: `$benchmark-agent-review session-triage`

## Source Evidence

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Claude run directory: `tests/benchmarks/runs/session-triage-claude-e5f0772b/`
- Codex run directory: `tests/benchmarks/runs/session-triage-codex-374ad6f0/`
- Claude source report: `tests/benchmarks/runs/session-triage-claude-e5f0772b/report.json`
- Codex source report: `tests/benchmarks/runs/session-triage-codex-374ad6f0/report.json`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Target skill contract: `global/codex/session-triage/SKILL.md`
- Related skill contract evidence: `global/codex/run/SKILL.md`

## Benchmark Context

| Runner | Hard assertion pass rate | Deterministic quality score | Infrastructure-blocked runs | Retained artifact evidence |
| --- | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 93.8% | 0 | Final stdout summaries, assertions, file names, and quality results; full generated report text was not retained |
| Codex | 3/3 (100.0%) | 95.8% | 0 | Full stderr transcripts include generated `session-triage-report.md` diffs and report text |

The benchmark prompt asked each runner to triage `session-log.md` and write `session-triage-report.md` with Target, Verification verdict, Timeline, Root cause, Recommended fix, Validation plan, and Next command. Fixture facts were intentionally sparse: `session-log.md` says `$run` skipped planned coverage matrix validation and shipped anyway, while `tasks/lessons.md` says required validation must run before shipping.

## Output Verdict

Overall subjective verdict: usable to excellent, with a median in the usable band. The best outputs are evidence-bound, name the missing source evidence, classify the issue as agent noncompliance with an already adequate `$run` contract, and route to operational validation rather than immediate skill editing. The weaker outputs over-remediate: they recommend `$targeted-skill-builder` or a `$run` contract rewrite even while admitting that the existing contract and lesson already require validation before shipping.

This review is about generated artifact quality. The deterministic benchmark passed all hard assertions, but the retained outputs show that correct structure and hard-pass compliance do not guarantee good remediation judgment.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band | Evidence basis | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Codex review | Claude | 0 | 78 | Usable | retained stdout summary | Correctly identifies a skipped coverage validation and cites the lesson, but jumps to patching `/run` with a validation gate from sparse evidence |
| Codex review | Claude | 1 | 76 | Usable | retained stdout summary | Names noncompliance with an adequate but generic contract, then recommends rewriting the lesson and routes to `/targeted-skill-builder` without a specific target |
| Codex review | Claude | 2 | 74 | Usable | retained stdout summary | Identifies noncompliance, but recommends upgrading the lesson plus `/run` and adds temp-repo commit commentary that does not help the next operator |
| Codex review | Codex | 0 | 94 | Excellent | full retained report text | Evidence-bound report, explicit evidence gap, no unnecessary skill change, and an operational `$run` next command |
| Codex review | Codex | 1 | 78 | Usable | full retained report text | Strong evidence section, but contradicts itself by calling the `$run` contract adequate while recommending a new evidence gate via `$targeted-skill-builder` |
| Codex review | Codex | 2 | 92 | Excellent | full retained report text | Clear noncompliance verdict, concrete validation checks, conditional future hardening only if recurrence appears, and an operational `$run` next command |

Median subjective score: 78
Score range: 74-94

## Common Strengths

- Task selection is clear: every evaluated output focuses on the supplied `session-log.md` incident and validation-before-shipping rule.
- Root-cause framing is mostly correct: outputs distinguish a skipped planned validation from unrelated product, deploy, or GitHub workflow issues.
- The stronger Codex outputs explicitly separate verified facts from missing evidence such as the original task plan, exact coverage matrix command, shipped diff, and command output.
- Validation plans are generally concrete, usually naming `rg` checks against `session-log.md`, `$run`, and `tasks/lessons.md`.
- No evaluated output invented external services, GitHub Actions, production deploys, or unrelated repository facts.

## Common Weaknesses

- Next-route ergonomics are the main weakness. Several outputs route to `$targeted-skill-builder` even after saying the current `$run` contract and `tasks/lessons.md` already cover the required behavior.
- Some outputs blur a real fix with optional hardening. A checklist-style evidence gate might be worth exploring after recurrence evidence, but it should not be the primary fix when the retained fixture only proves one-off noncompliance with an adequate rule.
- Claude retained evidence is incomplete. Because full Claude `session-triage-report.md` text was not persisted, the Claude review relies on stdout summaries, assertions, and deterministic quality details. That makes the Claude scores lower-confidence than Codex scores.
- One Claude output recommends `/targeted-skill-builder` without a specific target or gap, which is not a useful next operator handoff.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| Generated outputs still over-route one-off noncompliance to `$targeted-skill-builder` after recognizing that the `$run` contract and lesson already require validation before shipping | Benchmark rubric / setup issue | `tests/layer4/setups/tier1-workflows.setup.ts` and `tests/layer1/bench-setups.test.ts` | Strengthen the `session-triage` no-over-remediation branch so it also catches reports that re-label an already-required validation step as a new `$run` evidence-gate contract change without recurrence evidence; require `none` or an operational next command when the report concludes the existing contract is adequate | `pnpm --dir tests test:layer1 -- bench-setups bench-quality` and `pnpm --dir tests verify --skill session-triage` | `$targeted-skill-builder session-triage benchmark over-remediation rubric` |
| Full generated artifact text is not retained for Claude runs, limiting subjective review fidelity | Retained-evidence gap | `tests/harness/bench-runner.ts` or the persistence path that writes `run-*.json` | Persist generated output file content or a bounded artifact excerpt for every runner when the setup declares an expected artifact path | Inspect a new Claude `run-*.json` and confirm it includes `session-triage-report.md` content or an excerpt | `$targeted-skill-builder benchmark-agent-review retained artifact evidence` |
| One retained output emits a vague `/targeted-skill-builder` route without naming the target skill or exact gap | Target-skill contract / output ergonomics | `global/codex/session-triage/SKILL.md` and mirrored Claude contract if present | If future recurrence shows this is common outside the benchmark, tighten output instructions so any `$targeted-skill-builder` route must include both the owning skill and a specific gap; otherwise prefer `none` for adequate-contract noncompliance | Contract lint or `rg -n "targeted-skill-builder.*specific|adequate contract|none" global/codex/session-triage/SKILL.md` plus a focused benchmark rerun | `$session-triage session-triage benchmark review` |

## Deterministic-Rubric Notes

The deterministic rubric did surface part of the issue: Claude run 1 failed `evidence-linked`, and Codex run 1 failed `no-over-remediation-route`. It did not catch every over-remediation variant, especially outputs that frame the proposed skill change as a "missing evidence gate" even though the report also says validation was already required. That is a benchmark setup/rubric gap, not proof that the `session-triage` skill contract itself is missing the core rule.

## Next Work

Tighten the `session-triage` benchmark rubric so reports that identify adequate existing contracts do not get full credit for re-labeling one-off noncompliance as a new `$run` contract/evidence-gate change.

Recommended next command: `$targeted-skill-builder session-triage benchmark over-remediation rubric`
