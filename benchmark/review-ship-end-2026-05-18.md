# Agent Review: ship-end Benchmark Outputs

Date: 2026-05-18

Target skill: `ship-end`

Source benchmark report: `benchmark/test-ship-end-2026-05-18.md`

Reviewed runs:

- Claude: `tests/benchmarks/runs/ship-end-claude-0190fdda/`
- Codex: `tests/benchmarks/runs/ship-end-codex-4fbde9d6/`

## Benchmark Context

The benchmark prompt asked the agent to write `session-handoff.md` from fixture task files, not from git activity. Fixture facts:

- `tasks/todo.md` marks `Step 1.1 complete` and leaves `Step 1.2 next` unchecked.
- `tasks/history.md` records `Completed Step 1.1 with tests.`
- The final Next command should be `/run` for Claude and `$run` for Codex.

Deterministic benchmark result:

| Agent | Hard Assertions | Deterministic Quality | Infrastructure Blocks |
| --- | ---: | ---: | ---: |
| Claude | 3/3 | 100.0% | 0 |
| Codex | 3/3 | 100.0% | 0 |

## Subjective Verdict

The retained outputs are good to excellent. All six artifacts preserve the fixture source of truth, name completed work, identify Step 1.2 as next work, avoid invented git/deploy facts, and surface the limited validation evidence honestly.

Claude outputs are excellent because they provide a single runner-native `/run` handoff and concise residual risk. Codex outputs are usable to good, but all three include both Claude and Codex route spellings in the final Next Command section. That is compliant with the current deterministic benchmark after the route fix, but it is less ergonomic for a real next operator because the handoff should contain one active-runner command, not a menu.

## Score Table

| Reviewer | Runner | Run | Score | Grade | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex review | Claude | 0 | 94 | Excellent | Clear source mapping, honest validation limitation, single `/run` handoff. |
| Codex review | Claude | 1 | 95 | Excellent | Best balance of concise next work and residual-risk context. |
| Codex review | Claude | 2 | 93 | Excellent | Strong, with slightly speculative regression-risk wording. |
| Codex review | Codex | 0 | 86 | Good | Useful artifact, but final route section lists both runner commands. |
| Codex review | Codex | 1 | 84 | Good | Clear evidence, but dual-route handoff adds operator friction and mentions absent config files from the fixture scan. |
| Codex review | Codex | 2 | 88 | Good | Strong source-of-truth section, but still emits dual route list. |

Median subjective score: 90.5

Score range: 84-95

## Common Strengths

- Every retained artifact names the fixture task files or their facts.
- Every artifact carries forward Step 1.1 completion and Step 1.2 as the next work.
- Validation claims are appropriately constrained to task-recorded evidence.
- No output invents a deploy, commit, git status, external service, or hidden test output.
- Residual risks are meaningful rather than generic: missing test command/output details, no git inspection, and limited fixture context.

## Common Weaknesses

- Codex runs list both `Claude: /run` and `Codex: $run` in the final Next Command section. A session handoff should preserve only the active runner route so a next operator can act without interpreting mode choices.
- One Codex run mentions that no project validation configuration files were present in the fixture scan. That is not harmful, but it is unnecessary because the fixture did not ask the output to inventory config files.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| Codex retained outputs emit a dual Claude/Codex route list instead of one final active-runner command. | Benchmark setup/rubric gap | `tests/layer4/setups/tier1-workflows.setup.ts`; `tests/layer1/bench-setups.test.ts` | Tighten the `ship-end` prompt to say the final Next Command section must contain exactly one command for the active runner and must not list alternate runner routes. Add a quality criterion or hard assertion that rejects outputs containing both `/run` and `$run` in the final handoff. | Add focused layer1 coverage where a Codex artifact with both route spellings fails and a Codex artifact with only `$run` passes; run `pnpm --dir tests exec vitest run --project layer1 bench-setups --testNamePattern ship-end`, then rerun `$benchmark-test-skill ship-end`. | `$targeted-skill-builder ship-end benchmark single active-runner final handoff` |

## Deterministic Rubric Notes

The deterministic benchmark correctly verifies fixture grounding and runner-compatible routes, but it does not currently distinguish a single active-runner final route from a dual-route handoff. The subjective review found that gap in all three Codex outputs, so the next remediation should tighten the fixture/rubric rather than change the `ship-end` skill contract.

## Recommendation

**Next work:** require `ship-end` benchmark artifacts to emit one active-runner final handoff

**Recommended next command:** `$targeted-skill-builder ship-end benchmark single active-runner final handoff`
