# Session Triage: session-triage Benchmark Failure

Date: 2026-05-13
Command: `$session-triage session-triage benchmark failure`

## Target

Scope:

- Benchmark report: `benchmark/test-session-triage-2026-05-13.md`
- Persisted benchmark artifacts:
  - `tests/benchmarks/runs/session-triage-claude-49cd4515/`
  - `tests/benchmarks/runs/session-triage-codex-2717976e/`
  - `tests/benchmarks/runs/session-triage-claude-790af5f0/`
  - `tests/benchmarks/runs/session-triage-codex-1bc38d04/`
- Skill contracts:
  - `global/codex/session-triage/SKILL.md`
  - `global/claude/session-triage/SKILL.md`
- Benchmark fixture and route helpers:
  - `tests/layer4/setups/tier1-workflows.setup.ts`
  - `tests/layer4/setup-helpers/routing.ts`
  - `tests/layer4/setup-helpers/quality.ts`
- Relevant lesson: `tasks/lessons.md`, "Benchmarks must respect Claude slash and Codex dollar route conventions"

## User-Identified Issue

The fresh `$benchmark-test-skill session-triage` run failed its deterministic hard assertions and routed to `$session-triage session-triage benchmark failure`.

## Verification Verdict

Verdict: verified.

Evidence:

- Verify passed before benchmarking: layer1 passed, layer2 was skipped because no target-specific layer2 tests matched `session-triage`.
- Initial benchmark results:
  - Claude: 0/2 evaluated hard assertions, 1 infrastructure-blocked run.
  - Codex: 2/3 evaluated hard assertions.
- Latest persisted benchmark results reflected by `benchmark/test-session-triage-2026-05-13.md`:
  - Claude: 0/2 evaluated hard assertions, 1 infrastructure-blocked run.
  - Codex: 3/3 evaluated hard assertions.
- Every evaluated hard assertion failure was `Output recommends $targeted-skill-builder`.
- The `session-triage` skill contract says not to recommend a skill change when evidence points only to one-off agent noncompliance and the contract is already clear.
- The fixture scenario is exactly that shape: `session-log.md` says an agent skipped planned validation, and `tasks/lessons.md` already says to run required validation before shipping.
- The fixture nevertheless hard-codes `recommendedRoute: "$targeted-skill-builder"` and quality `nextRoute: "$targeted-skill-builder"`.
- Claude outputs recommended `/targeted-skill-builder ...`, which follows the Claude slash-command convention but failed the hard assertion because `assertRecommendedRoute` checks for the literal dollar route.
- One earlier Codex run recommended `none` / rerun validation instead of `$targeted-skill-builder`, which is consistent with the no-contract-change branch of the `session-triage` contract but inconsistent with the fixture's hard-coded route. The latest Codex session passed all hard assertions.

## Timeline

1. `$benchmark-test-skill session-triage` confirmed custom benchmark coverage through `tests/layer4/setups/tier1-workflows.setup.ts`.
2. `pnpm verify --skill session-triage` passed layer1 and skipped layer2.
3. `pnpm bench --skill session-triage --agent both --runs 3 --chunk-size 3 --pause 0` executed both runners.
4. The initial Codex session passed 2/3 evaluated runs; the latest Codex session passed 3/3 evaluated runs.
5. Claude produced evaluated reports that otherwise matched the fixture but used `/targeted-skill-builder`.
6. Each Claude session had one infrastructure-blocked run due to agent runner budget.
7. The harness marked Claude slash-route outputs as failures because it required the literal dollar route.

## Root Cause

Primary root cause: benchmark harness fixture mismatch with the `session-triage` skill contract.

The fixture asks `session-triage` to investigate a one-off validation skip where the existing `$run` contract and `tasks/lessons.md` are already adequate. The `session-triage` contract explicitly says not to recommend a skill change in that situation. A report that recommends no skill change can therefore be contract-compliant, but the benchmark hard assertion requires `$targeted-skill-builder`.

Secondary root cause: the tier1 fixture does not use runner-specific route expectations for `session-triage`. Claude slash-command outputs failed because `assertRecommendedRoute` looked only for `$targeted-skill-builder`, despite the existing project lesson that Claude benchmarks should expect slash commands and Codex benchmarks should expect dollar commands.

## Responsible Contract Gap

Responsible gap: benchmark setup, not the `session-triage` skill contract.

Files:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

No mirrored drift was found in the `global/codex/session-triage` and `global/claude/session-triage` contracts beyond expected `$` versus `/` command syntax.

## Recommended Fix

Route to `$targeted-skill-builder session-triage benchmark fixture routing` for a narrow harness update.

Recommended implementation options, in priority order:

1. Align the fixture with the current `session-triage` contract by removing the hard-coded `recommendedRoute` for `session-triage` and allowing a final next route of `none` when the report finds one-off noncompliance with an adequate contract.
2. If the benchmark intentionally wants `$targeted-skill-builder`, rewrite the fixture evidence so the incident contains a real skill-contract gap. For example, make `tasks/lessons.md` show no existing lesson and make the relevant skill contract omit a required validation gate.
3. If the fixture keeps a route assertion, use runner-specific route expectations:
   - Claude: `/targeted-skill-builder`
   - Codex: `$targeted-skill-builder`
   Also update the quality route criterion to accept both forms where both runners are benchmarked.

The cleanest fix is option 1 because it preserves the current fixture's actual evidence and the `session-triage` contract's "do not recommend a skill change for one-off noncompliance" rule.

## Validation Plan

After the targeted fixture update:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests verify --skill session-triage
pnpm --dir tests bench --skill session-triage --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Specific checks:

- Layer1 asserts `session-triage` no longer hard-requires `$targeted-skill-builder` for the current one-off noncompliance fixture, or asserts a rewritten fixture that actually justifies that route.
- If route assertions remain, layer1 covers Claude `/targeted-skill-builder` and Codex `$targeted-skill-builder` separately.
- The quality rubric no longer marks a contract-compliant `Recommended next skill: none` report as a route failure for the current fixture.

## Confidence And Evidence Gaps

Confidence: high.

Evidence is sufficient from the benchmark report, run artifacts, skill contracts, fixture definition, and existing lessons. No broad `$analyze-sessions` recurrence scan is needed.

Evidence gap: the benchmark did not retain full generated report files for the Claude runs as standalone artifacts, but stdout and assertion data were enough to verify the route mismatch.

Recommended next skill: `$targeted-skill-builder session-triage benchmark fixture routing`
