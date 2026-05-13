# Benchmark Agent Review: session-triage

Date: 2026-05-13
Target skill: `session-triage`
Active workflow: `$benchmark-agent-review session-triage`

## Source Evidence

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Claude run directory: `tests/benchmarks/runs/session-triage-claude-4cfa1e99/`
- Codex run directory: `tests/benchmarks/runs/session-triage-codex-f8e827fb/`
- Benchmark setup: `tests/layer4/setups/tier1-workflows.setup.ts`
- Target skill contract: `global/codex/session-triage/SKILL.md`

## Benchmark Context

| Runner | Hard assertion pass rate | Deterministic quality score | Infrastructure-blocked runs | Retained artifact evidence |
| --- | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 100.0% | 0 | Final stdout summaries only; full generated report text was not retained |
| Codex | 3/3 (100.0%) | 100.0% | 0 | Full stderr transcripts include generated `session-triage-report.md` diffs and report text |

The benchmark prompt asked each runner to triage `session-log.md` and write `session-triage-report.md` with Target, Verification verdict, Timeline, Root cause, Recommended fix, Validation plan, and Next command. Fixture facts were sparse by design: `session-log.md` says `$run` skipped planned coverage matrix validation and shipped anyway, and `tasks/lessons.md` says required validation must run before shipping.

## Output Verdict

Overall subjective verdict: good, but not excellent. The outputs consistently identify the incident, cite the sparse evidence, distinguish direct evidence from missing transcript detail, and avoid unrelated services or invented repository state. The material weakness is remediation routing: several outputs recommend `$targeted-skill-builder` or `/targeted-skill-builder` even while concluding that the `$run` contract is already adequate and the issue is agent noncompliance. That conflicts with the `session-triage` constraint to avoid recommending a skill change for one-off noncompliance when the contract is already clear.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band | Evidence basis | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Codex review | Claude | 0 | 82 | Good | retained stdout summary | Clear verdict and evidence, but routes to `/targeted-skill-builder /run` after calling the existing rule adequate-but-unenforced |
| Codex review | Claude | 1 | 80 | Good | retained stdout summary | Concise and useful, but recommends adding gates to `/run` and `/ship` from sparse evidence |
| Codex review | Claude | 2 | 83 | Good | retained stdout summary | Best Claude summary; still routes to `/targeted-skill-builder run` despite describing noncompliance with an existing rule |
| Codex review | Codex | 0 | 94 | Excellent | full retained report text | Evidence-bound, names the evidence gap, avoids unnecessary skill change, and gives an operator-safe next command |
| Codex review | Codex | 1 | 91 | Excellent | full retained report text | Strong report; includes conditional `$targeted-skill-builder` language only if recurrence or enforcement work is desired |
| Codex review | Codex | 2 | 80 | Good | full retained report text | Useful report, but over-corrects by recommending a `$run` contract update from a one-line incident log |

Median subjective score: 82.5
Score range: 80-94

## Common Strengths

- Task selection is clear: every evaluated output stays on the supplied `session-log.md` incident and the validation-before-shipping rule.
- The outputs generally avoid overclaiming exact command evidence; the stronger Codex outputs explicitly state that the original plan, omitted command output, and shipping transcript are absent.
- Validation plans are concrete enough for the next operator, usually naming `rg` checks against `$run` and `tasks/lessons.md`.
- Scope control is good: no output invents deploys, GitHub Actions, external services, or unrelated files.

## Common Weaknesses

- Next-route ergonomics are inconsistent. The best output routes to operational next work only; weaker outputs recommend `$targeted-skill-builder` even after classifying the responsible issue as one-off agent noncompliance with an adequate contract.
- Some outputs blur "recommended fix" and "possible future hardening." The session-triage contract wants the smallest durable fix; optional mechanical enforcement should be framed as conditional, not the primary next step, unless recurrence or a proven contract gap exists.
- Claude artifact retention is incomplete. The run JSON keeps final summaries, assertions, file names, and quality results, but not full `session-triage-report.md` text. That limits subjective review confidence for Claude compared with Codex.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| Passing outputs can still over-recommend `$targeted-skill-builder` for one-off noncompliance despite the `session-triage` contract forbidding unnecessary skill-change recommendations | Benchmark rubric / setup issue | `tests/layer4/setups/tier1-workflows.setup.ts` and matching layer1 setup tests | Add a session-triage quality criterion or hard assertion that rewards `Recommended next skill: none` or an operational next command when the report says the existing `$run` contract is adequate, and penalizes unconditional `$targeted-skill-builder` routing in that branch | `pnpm --dir tests test:layer1 -- bench-setups bench-quality` and `pnpm --dir tests verify --skill session-triage` | `$targeted-skill-builder session-triage benchmark over-remediation rubric` |
| Claude run artifacts do not retain full generated report text, reducing subjective review fidelity | Retained-evidence gap | `tests/harness/bench-runner.ts` or the persistence path that writes `run-*.json` | Persist generated output file content or a bounded artifact excerpt for all runners, not only transcripts that happen to include diffs | Review a new Claude run JSON and confirm `session-triage-report.md` content or excerpt is present | `$targeted-skill-builder benchmark-agent-review retained artifact evidence` |

## Deterministic-Rubric Notes

The deterministic rubric was useful for verifying evidence links, file references, scope control, and validation specificity, but it did not surface the main subjective issue: over-remediation and unnecessary skill-change routing. This is a benchmark setup/rubric gap, not proof that `session-triage` itself needs a contract change.

## Next Work

Tighten the `session-triage` benchmark rubric so reports that correctly identify adequate existing contracts do not get full credit for unconditional `$targeted-skill-builder` remediation.

Recommended next command: `$targeted-skill-builder session-triage benchmark over-remediation rubric`
