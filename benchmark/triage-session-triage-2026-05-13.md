# Session Triage: session-triage Benchmark Failure

Date: 2026-05-13
Command: `$session-triage session-triage benchmark failure`

## Target

Scope:

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Fresh persisted benchmark artifacts:
  - `tests/benchmarks/runs/session-triage-claude-865e8407/`
  - `tests/benchmarks/runs/session-triage-codex-d417810e/`
- Failed run evidence:
  - `tests/benchmarks/runs/session-triage-codex-d417810e/run-001.json`
- Skill contracts:
  - `global/codex/session-triage/SKILL.md`
  - `global/claude/session-triage/SKILL.md`
- Benchmark fixture and layer1 setup coverage:
  - `tests/layer4/setups/tier1-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Relevant prior reports and lessons:
  - `benchmark/triage-session-triage-2026-05-13.md` prior contents before this refresh
  - `benchmark/review-session-triage-2026-05-13.md`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill session-triage` run failed and routed to `$session-triage session-triage benchmark failure`.

## Verification Verdict

Verdict: verified.

Evidence:

- `benchmark/test-session-triage-2026-05-13.md` records verify passing before the benchmark: layer1 passed 1,350 tests in 8.9s, and layer2 was skipped because no target-specific layer2 tests matched `session-triage`.
- The fresh benchmark had no infrastructure-blocked runs.
- Claude session `865e8407` passed 3/3 hard assertions with 100.0% output quality, 0 threshold failures, and 0 critical failures.
- Codex session `d417810e` passed 2/3 hard assertions with 82.5% output quality, 1 threshold failure, and 2 critical failures.
- `tests/benchmarks/runs/session-triage-codex-d417810e/run-001.json` shows the failed assertion was `session-triage-report.md created in project root`.
- That failed Codex run exited with code 0 after reading the `session-triage` contract, `session-log.md`, and `tasks/lessons.md`, then emitted an `apply patch` marker without a completed patch or generated report artifact.
- Adjacent Codex runs #0 and #2 created `session-triage-report.md` and passed all hard assertions, so the failure is not an across-the-board impossibility in the fixture.

## Timeline

1. `$benchmark-test-skill session-triage` confirmed `session-triage` has custom benchmark coverage in `tests/layer4/setups/tier1-workflows.setup.ts`.
2. `pnpm verify --skill session-triage` passed layer1 and skipped layer2 because no target-specific layer2 tests matched.
3. `pnpm bench --skill session-triage --agent both --runs 3 --chunk-size 3 --pause 0` ran Claude and Codex with 3 iterations each.
4. Claude completed all 3 hard-assertion runs with 100.0% output quality.
5. Codex run #0 completed successfully and wrote the report.
6. Codex run #1 read the required evidence but did not create `session-triage-report.md` in the project root, causing the hard assertion failure.
7. Codex run #2 completed successfully and wrote the report.
8. The benchmark report routed to this triage because deterministic hard assertions did not fully pass.

## Root Cause

Primary root cause: runner noncompliance with an adequate fixture instruction, exposed by the benchmark hard assertion.

The benchmark prompt already says: read `session-log.md` and `tasks/lessons.md`, then write `session-triage-report.md` in the project root before optional exploration. The Codex run acknowledged the workflow and read the correct evidence, but it never completed the file write. This is not evidence that the `session-triage` skill contract is missing the expected behavior.

Secondary root cause: the benchmark fixture can still be hardened for this recurrent artifact-creation failure mode. The same class of missing-root-report failure appeared in earlier `session-triage` benchmark evidence, and a robustness fix already made the prompt more explicit. The fresh failure shows one remaining practical gap: the fixture asks for the root artifact, but it does not require a post-write existence check before final response. Adding that check is a small benchmark-fixture improvement that targets the observed failure without changing the production skill contract.

The output-quality failures on Codex run #1 are downstream of the same incomplete run and include scope-control, fabricated-fact, and over-remediation criteria. They do not currently justify editing `global/codex/session-triage/SKILL.md`, because the mirrored contracts already instruct narrow evidence gathering, verified diagnosis, no broad history scan by default, and no skill-change recommendation for one-off noncompliance with an adequate contract.

## Responsible Contract Gap

Responsible gap: benchmark fixture robustness in `tests/layer4/setups/tier1-workflows.setup.ts`, with layer1 coverage in `tests/layer1/bench-setups.test.ts`.

Not responsible:

- `global/codex/session-triage/SKILL.md`
- `global/claude/session-triage/SKILL.md`
- Project instruction files

The Claude and Codex skill contracts are aligned except for normal runner-specific command syntax (`/command` for Claude, `$command` for Codex) and section title wording.

## Recommended Fix

Route to `$targeted-skill-builder session-triage benchmark artifact verification` for a narrow benchmark fixture update.

Recommended fixture behavior:

- In `tests/layer4/setups/tier1-workflows.setup.ts`, update the `session-triage` benchmark prompt to require an explicit file-existence check after writing `session-triage-report.md` and before final response.
- Suggested wording to append to the prompt:

  ```text
  After writing the report, verify that session-triage-report.md exists in the project root. If it is missing, create it before responding.
  ```

- In `tests/layer1/bench-setups.test.ts`, add or extend coverage proving the prompt contains the post-write existence check while preserving the no-skill-change branch.
- Keep the hard assertion `session-triage-report.md created in project root`; it correctly caught the failure.
- Keep the `no-over-remediation-route` quality criterion; it is still the right rubric for this fixture.

Do not edit the mirrored `session-triage` skill contracts unless a later triage finds that the production skill instructions themselves are unclear or contradictory.

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
- Layer1 asserts the fixture prompt requires verifying that `session-triage-report.md` exists after writing.
- Layer1 asserts the no-skill-change branch remains intact for one-off agent noncompliance with an adequate validation rule.
- The Codex smoke benchmark creates `session-triage-report.md` and includes the required triage sections.
- The quality rubric still penalizes fabricated facts and unconditional skill/contract remediation when the report frames the incident as one-off noncompliance with an adequate contract.

## Confidence And Evidence Gaps

Confidence: high for the benchmark-failure verification and medium-high for the fixture hardening recommendation.

Known:

- The fresh failed run did not create the required artifact.
- The run was not infrastructure-blocked and exited with code 0.
- The run read the expected evidence before failing to write the report.
- Other runs in the same benchmark session did create the report.
- Mirrored `session-triage` contracts are not materially drifted.

Evidence gaps:

- Because the artifact was missing, there is no generated report text for failed Codex run #1.
- The run transcript does not explain why the `apply patch` action did not complete.
- This triage did not run broad session-history recurrence analysis; the current persisted benchmark evidence and prior same-day triage are sufficient for a narrow fixture-hardening recommendation.

Recommended next skill: `$targeted-skill-builder session-triage benchmark artifact verification`
