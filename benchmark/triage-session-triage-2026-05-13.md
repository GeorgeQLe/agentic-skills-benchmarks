# Session Triage: session-triage Benchmark Failure

Date: 2026-05-13
Command: `$session-triage session-triage benchmark failure`

## Target

Scope:

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Current persisted benchmark artifacts:
  - `tests/benchmarks/runs/session-triage-claude-7a8b6de9/`
  - `tests/benchmarks/runs/session-triage-codex-fbec4404/`
- Skill contracts:
  - `global/codex/session-triage/SKILL.md`
  - `global/claude/session-triage/SKILL.md`
- Benchmark fixture and tests:
  - `tests/layer4/setups/tier1-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Relevant lessons:
  - `tasks/lessons.md`, "Review reports need remediation-ready next steps"
  - `tasks/lessons.md`, "Benchmark execution and subjective review are separate steps"

## User-Identified Issue

The current `$benchmark-test-skill session-triage` run failed and routed to `$session-triage session-triage benchmark failure`.

## Verification Verdict

Verdict: verified.

Evidence:

- Verify passed before benchmarking: layer1 passed 1,350 tests in 8.4s; layer2 was skipped because no target-specific layer2 tests matched `session-triage`.
- The current report shows no infrastructure-blocked runs.
- Claude passed 3/3 hard assertions but had 68.4% output quality, 3 threshold failures, and 4 critical failures.
- Codex passed 2/3 hard assertions with one failed assertion: `session-triage-report.md created in project root`.
- `tests/benchmarks/runs/session-triage-codex-fbec4404/run-000.json` shows Codex exited successfully after reading the `session-triage` contract, `session-log.md`, `tasks/lessons.md`, and git status, but produced no `session-triage-report.md`.
- The same Codex run hit the 180,000ms benchmark timeout exactly enough to return an exit code of 0 without the required artifact, making this a hard benchmark failure rather than an infrastructure-blocked run.
- Quality evidence across current runs repeatedly flags `no-over-remediation-route`; Claude runs and Codex run #1 still recommended or conditionally steered toward skill/contract changes after framing the incident as one-off noncompliance or an adequate existing contract.

## Timeline

1. `$benchmark-test-skill session-triage` confirmed `session-triage` has custom benchmark coverage in `tests/layer4/setups/tier1-workflows.setup.ts`.
2. `pnpm verify --skill session-triage` passed layer1 and skipped layer2.
3. `pnpm bench --skill session-triage --agent both --runs 3 --chunk-size 3 --pause 0` ran Claude and Codex with 3 iterations each.
4. Claude completed all 3 hard-assertion runs but received low output-quality scores for over-remediation.
5. Codex run #0 read narrow evidence but did not write `session-triage-report.md`, causing the hard failure.
6. Codex runs #1 and #2 wrote reports; run #1 still failed the over-remediation quality criterion, while run #2 matched the intended no-skill-change branch.
7. The benchmark report routed to this triage because deterministic hard assertions did not fully pass.

## Root Cause

Primary root cause: benchmark fixture robustness gap.

The `session-triage` skill contracts already require the behavior the benchmark wants: start narrow, verify evidence, classify agent noncompliance with an adequate contract directly, and do not recommend a skill change for one-off noncompliance. The current hard failure is that one Codex run spent the whole 180s benchmark window gathering narrow evidence and never wrote the required report artifact. The fixture prompt asks for a report, but it does not force a bounded evidence pass or "write before optional exploration" behavior.

Secondary root cause: the benchmark fixture still leaves too much ambiguity around the no-skill-change branch. The fixture evidence is intentionally small: `session-log.md` says `$run` skipped coverage matrix validation, and `tasks/lessons.md` says required validation must run before shipping. That is enough to diagnose a validation-skip incident, but the benchmark expects agents to infer that this is one-off noncompliance with an adequate validation contract. Some runs still over-remediate by recommending `$targeted-skill-builder` or `/targeted-skill-builder` for `$run` even after recognizing the existing validation contract.

This is not a mirrored `session-triage` contract drift. The Claude and Codex contracts are aligned except for expected slash versus dollar command syntax.

## Responsible Contract Gap

Responsible gap: benchmark setup and layer1 regression coverage, not the global `session-triage` skill contract.

Files:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

No project instruction or task-doc change is needed for the target skill itself.

## Recommended Fix

Route to `$targeted-skill-builder session-triage benchmark fixture robustness` for a narrow harness update.

Recommended behavior change:

- Update the `session-triage` benchmark prompt in `tests/layer4/setups/tier1-workflows.setup.ts` to force a bounded evidence pass and report creation before optional exploration. Suggested wording:

  ```text
  You have the session-triage skill installed. Read session-log.md and tasks/lessons.md, then write session-triage-report.md in the project root before doing any optional exploration. Keep the report evidence-bound. Include Target, User-identified issue, Verification verdict, Timeline, Root cause, Responsible contract gap, Recommended fix, Validation plan, Confidence and evidence gaps, and Recommended next skill. If the evidence points to one-off agent noncompliance with an adequate existing validation rule, recommend no skill change.
  ```

- Add layer1 coverage proving the prompt contains an explicit root artifact requirement and a no-skill-change branch for one-off noncompliance.
- Keep the current `no-over-remediation-route` criterion. It is catching real output-quality regressions and should not be weakened.
- Do not edit `global/codex/session-triage/SKILL.md` or `global/claude/session-triage/SKILL.md` unless a future run shows the same failure despite the bounded fixture prompt.

## Validation Plan

After the targeted fixture update:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests verify --skill session-triage
pnpm --dir tests bench --skill session-triage --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Specific checks:

- Layer1 asserts the fixture prompt requires `session-triage-report.md` in the project root.
- Layer1 asserts the fixture prompt or rubric preserves the no-skill-change branch for one-off noncompliance with an adequate existing validation rule.
- The one-run Codex smoke creates `session-triage-report.md` and includes the required triage sections.
- The quality summary still reports over-remediation failures when outputs recommend unconditional skill changes after finding adequate existing validation rules.

## Confidence And Evidence Gaps

Confidence: high for the hard-failure diagnosis and medium-high for the prompt robustness fix.

Known:

- The failed Codex run did not create the required artifact.
- The benchmark did not classify the run as infrastructure-blocked.
- The current skill contract already contains the no-over-remediation rule.
- Current run artifacts show both successful and failed examples, so the fixture is close but not reliable enough.

Evidence gaps:

- The benchmark retained transcript JSON, not a standalone partial report for failed Codex run #0, because no report was created.
- A single failed Codex run does not prove the skill contract is broadly defective; recurrence analysis is not needed before a fixture prompt hardening pass.

Recommended next skill: `$targeted-skill-builder session-triage benchmark fixture robustness`
