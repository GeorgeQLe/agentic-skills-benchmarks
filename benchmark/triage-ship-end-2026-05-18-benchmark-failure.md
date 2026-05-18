# Triage: ship-end Benchmark Failure

Date: 2026-05-18

Target: `ship-end`

Issue: `$benchmark-test-skill ship-end` produced Claude hard assertion failures while Codex passed.

## Evidence Sources

- `benchmark/test-ship-end-2026-05-18.md`
- `tests/benchmarks/runs/ship-end-claude-edad4640/report.md`
- `tests/benchmarks/runs/ship-end-claude-edad4640/run-000.json`
- `tests/benchmarks/runs/ship-end-claude-edad4640/run-001.json`
- `tests/benchmarks/runs/ship-end-claude-edad4640/run-002.json`
- `tests/benchmarks/runs/ship-end-codex-558a21dc/report.md`
- `tests/benchmarks/runs/ship-end-codex-558a21dc/run-000.json`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `global/codex/ship-end/SKILL.md`
- `global/claude/ship-end/SKILL.md`
- `tasks/lessons.md`

## User-Identified Issue

The `ship-end` benchmark failed and needs triage before Phase 41 Batch 41.1 continues.

## Verification Verdict

Verified.

Claude session `ship-end-claude-edad4640` completed three evaluated, non-infrastructure-blocked runs with 0/3 hard assertion pass rate. The failed assertions were:

- Run 0: `Output includes Step 1.2`; `Output recommends $run`
- Run 1: `Output recommends $run`
- Run 2: `Output includes Step 1.2`; `Output recommends $run`

Codex session `ship-end-codex-558a21dc` completed three evaluated, non-infrastructure-blocked runs with 3/3 hard assertion pass rate.

## Timeline

1. Phase 41 Batch 41.1 selected `ship-end` as one of the remaining Tier 1 benchmark targets.
2. `pnpm verify --skill ship-end` passed layer1 and skipped layer2 because no target-specific layer2 tests matched.
3. `pnpm bench --skill ship-end --agent both --runs 3 --chunk-size 3 --pause 0` ran both agents.
4. The benchmark fixture asked the agent to read fixture `tasks/todo.md` and `tasks/history.md`, then write `session-handoff.md` with completed work, validation evidence, remaining risks, next work, and Next command.
5. Two Claude runs treated the sandbox session as having no substantive prior work and did not preserve `Step 1.2` from the fixture.
6. One Claude run did preserve `Step 1.2` and correctly used the Claude-native `/run` handoff, but the benchmark expected `$run`, so it still failed hard assertions.

## Root Cause

Split root cause:

1. Benchmark setup drift: `tests/layer4/setups/tier1-workflows.setup.ts` uses `recommendedRoute: "$run"` for `ship-end`, so the hard assertion expects `$run` for both Claude and Codex. This conflicts with the mirrored skill contracts: Claude `ship-end` next-step routing uses slash commands, while Codex `ship-end` uses dollar commands. Nearby Tier 1 fixtures already use `recommendedRoutes` for runner-specific handoffs, so `ship-end` is stale relative to the benchmark pattern.
2. Prompt ambiguity: the `ship-end` benchmark prompt says "Next command" but does not explicitly require runner-native route spelling. It also says "Do not run git" without reinforcing that fixture task files are the source of truth. Two Claude outputs therefore summarized the benchmark session itself instead of the fixture state.

## Responsible Contract Gap

Responsible surface: benchmark setup, not the `ship-end` skill contracts.

The mirrored `global/codex/ship-end/SKILL.md` and `global/claude/ship-end/SKILL.md` both require next-step routing, and their route conventions intentionally differ. The benchmark fixture failed to encode that runner-specific difference.

No new `tasks/lessons.md` rule is required from this triage. The existing lesson about clean shipped investigations avoiding mechanical `ship-end` routing is adjacent but not the root issue here.

## Recommended Fix

Use `$targeted-skill-builder ship-end benchmark runner route and fixture source-of-truth` to make a narrow benchmark update:

1. In `tests/layer4/setups/tier1-workflows.setup.ts`, change `ship-end` from:

   `recommendedRoute: "$run"`

   to runner-specific routes:

   ```ts
   recommendedRoutes: {
     claude: "/run",
     codex: "$run",
   }
   ```

2. Update the `ship-end` benchmark prompt to require runner-native final routing and fixture-grounded handoff content. Suggested wording:

   "Use the fixture task files as the source of truth, not the benchmark session's lack of git activity. The final Next command must be `/run` when running as Claude and `$run` when running as Codex."

3. Update the `ship-end` quality evaluator route expectation to accept runner-native routes, likely by passing `nextRoutes: ["/run", "$run"]` to `workflowQualityEvaluator`.

4. Add focused layer1 coverage proving:
   - Claude `/run` passes for the `ship-end` fixture.
   - Codex `$run` passes for the `ship-end` fixture.
   - A handoff that ignores `Step 1.2` still fails.
   - A Claude output recommending `/ship-end` still fails.

## Validation Plan

After the targeted update:

```sh
pnpm --dir tests exec vitest run --project layer1 bench-setups --testNamePattern ship-end
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill ship-end
pnpm --dir tests bench --skill ship-end --agent both --runs 3 --chunk-size 3 --pause 0
scripts/validate-skills-showcase-data.sh
git diff --check
```

The final benchmark may still expose generated-output noncompliance if Claude continues to ignore fixture `tasks/todo.md`, but the known false negative for `/run` must be removed first.

## Confidence And Evidence Gaps

Confidence: high for benchmark setup drift, medium for prompt ambiguity as a contributing factor.

Evidence gap: this triage did not rerun after a fixture change, because this step is analysis-only. No broad `$analyze-sessions` scan is needed; the failure is localized to one benchmark fixture and its raw run artifacts.

## Recommendation

Recommended next skill: `$targeted-skill-builder ship-end benchmark runner route and fixture source-of-truth`
