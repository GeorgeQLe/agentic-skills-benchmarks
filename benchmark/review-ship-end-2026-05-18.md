# Agent Review: ship-end Benchmark Outputs

Date: 2026-05-18

Target skill: `ship-end`

Source benchmark report: `benchmark/test-ship-end-2026-05-18.md`

Reviewed runs:

- Claude: `tests/benchmarks/runs/ship-end-claude-9bf5f843/`
- Codex: `tests/benchmarks/runs/ship-end-codex-d7d92d34/`

## Benchmark Context

The benchmark prompt asked the agent to write `session-handoff.md` from fixture task files, not from git activity. Fixture facts:

- `tasks/todo.md` marks `Step 1.1 complete` and leaves `Step 1.2 next` unchecked.
- `tasks/history.md` records `Completed Step 1.1 with tests.`
- The final Next command should contain exactly one active-runner command: `/run` for Claude or `$run` for Codex.

Deterministic benchmark result:

| Agent | Hard Assertions | Deterministic Quality | Infrastructure Blocks |
| --- | ---: | ---: | ---: |
| Claude | 3/3 | 100.0% | 0 |
| Codex | 3/3 | 100.0% | 0 |

## Subjective Verdict

The retained outputs are excellent overall. All six artifacts preserve the fixture source of truth, identify Step 1.1 as completed, carry Step 1.2 forward as the next work, avoid invented git/deploy/service facts, and now end with exactly one active-runner next command.

The remaining differences are ergonomic rather than material. Claude outputs are consistently concise and precise about validation limits. Codex run 000 is more terse than the others and gives less detail about the missing test command/output, but it is still usable and correctly scoped. Codex runs 001 and 002 include stronger source-of-truth and residual-risk language.

No remediation is recommended from this review. The previous dual-route handoff weakness is resolved in the retained Codex artifacts and enforced by the benchmark assertion `Output uses single active-runner final route`.

## Score Table

| Reviewer | Runner | Run | Score | Grade | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex review | Claude | 0 | 95 | Excellent | Clear fixture grounding, single `/run` route, and useful risk notes about missing test output. |
| Codex review | Claude | 1 | 95 | Excellent | Strongest validation-depth caveat and concise next-work handoff. |
| Codex review | Claude | 2 | 94 | Excellent | Precise source mapping and route; slightly less explicit about broader fixture limitations. |
| Codex review | Codex | 0 | 89 | Good | Correct and actionable, but terse residual-risk language. |
| Codex review | Codex | 1 | 93 | Excellent | Strong source-of-truth framing, validation limitation, and single `$run` handoff. |
| Codex review | Codex | 2 | 94 | Excellent | Best Codex output: explicit source files, no-git constraint, validation caveat, and single `$run` route. |

Median subjective score: 94

Score range: 89-95

## Common Strengths

- Every retained artifact names or uses `tasks/todo.md` and `tasks/history.md`.
- Every artifact carries forward Step 1.1 completion and Step 1.2 as next work.
- Validation claims are constrained to the fixture evidence instead of inventing fresh test output.
- No artifact invents deploys, commits, service state, GitHub Actions, or hidden repository activity.
- Every final handoff contains exactly one active-runner next command.

## Common Weaknesses

- Codex run 000 is concise enough that a next operator gets less context about what validation evidence is missing than in the other five artifacts.

This is not material enough to require remediation because the output remains correct, scoped, and actionable.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| No material weakness remains after the single active-runner rerun. | none | none | No repository change recommended. | Existing focused layer1 coverage and fresh benchmark artifacts already prove the prior dual-route issue is fixed. | none |

## Deterministic Rubric Notes

No rubric tightening is needed from this review. The deterministic setup now surfaces the previously missed active-runner route issue, and the retained outputs match the intended behavior.

## Recommendation

**Next work:** none

**Recommended next command:** `$ship`
