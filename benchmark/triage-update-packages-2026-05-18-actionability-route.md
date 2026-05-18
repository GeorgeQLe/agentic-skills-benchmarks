# Triage: update-packages Benchmark Actionability Route Failure - 2026-05-18

## Target

- Scope: `$session-triage update-packages benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Target skill: `update-packages`
- Source report: `benchmark/test-update-packages-2026-05-18.md`
- Raw sessions:
  - `tests/benchmarks/runs/update-packages-claude-3612131f/`
  - `tests/benchmarks/runs/update-packages-codex-d942a073/`
- Contracts and evaluator evidence:
  - `global/codex/update-packages/SKILL.md`
  - `global/claude/update-packages/SKILL.md`
  - `tests/layer4/setups/tier23-global-workflows.setup.ts`
  - `benchmark/review-update-packages-2026-05-18.md`
  - `tasks/lessons.md`

## User-Identified Issue

The latest `$benchmark-test-skill update-packages` run reports a benchmark failure and needs triage before deciding whether to change the skill, benchmark harness, or route.

## Verification Verdict

**Verified as a benchmark quality-rubric calibration gap, not a mirrored `update-packages` skill-contract failure.**

The fresh deterministic benchmark passed hard assertions for both agents:

- Claude session `update-packages-claude-3612131f`: 3/3 evaluated hard assertions passed, 0 infrastructure-blocked runs.
- Codex session `update-packages-codex-d942a073`: 3/3 evaluated hard assertions passed, 0 infrastructure-blocked runs.

The failure signal is in Claude output-quality criteria:

- `workflow-targeted-migration-routes`: 0.0% average, because all Claude artifacts used bare `/migrate` instead of target-specific routes such as `/migrate react`, `/migrate vitest`, or `/migrate pnpm`.
- `workflow-actionability`: 33.3% average, because two Claude artifacts missed the benchmark's expected per-batch actionability shape with explicit batch labels, mutation command or edit, verification command, expected proof/artifact, and a do-not-proceed/stop gate.

The mirrored `update-packages` contracts already require the behavior the benchmark wants:

- Both Codex and Claude contracts require a batch execution checklist for non-trivial updates.
- Each batch must include exact mutation command(s) or file edits, exact verification command(s), expected proof or artifact, and a do-not-proceed stop condition.
- Both contracts require broad compatibility failures to route to `/migrate <package or framework>`.

## Timeline

1. `$benchmark-test-skill update-packages` reran verify and both-agent custom benchmark coverage.
2. Verify passed with layer1 PASS and layer2 SKIP because no target-specific layer2 tests matched.
3. Claude session `3612131f` completed three evaluated runs with no infrastructure blocks.
4. Codex session `d942a073` completed three evaluated runs with no infrastructure blocks.
5. Both agents passed all hard assertions.
6. Claude run #0 missed only target-specific migrate routes in quality scoring.
7. Claude runs #1 and #2 missed target-specific migrate routes and the stricter actionability shape.
8. Prior agent review in `benchmark/review-update-packages-2026-05-18.md` independently identified the same weakness and recommended rubric calibration rather than skill-contract rewriting.

## Root Cause

The specific root cause is benchmark quality-rubric calibration.

The benchmark already detects the right weakness, but the scoring/reporting contract is still too soft and slightly underspecified:

- `workflow-targeted-migration-routes` is weighted but not critical, so bare `/migrate` routes can still yield near-passing aggregate output quality.
- `workflow-actionability` can fail while the run still looks mostly successful in the headline score.
- The current actionability pattern rewards the presence of required concepts, but it does not yet force those concepts into a per-batch operator-ready checklist in a way that consistently separates "usable but loose" from "ready to execute".

This is not runner infrastructure, not hard assertion failure, and not Codex/Claude mirrored skill drift.

## Responsible Contract Gap

Responsible contract gap: benchmark quality rubric in `tests/layer4/setups/tier23-global-workflows.setup.ts`.

No change is currently justified in:

- `global/codex/update-packages/SKILL.md`
- `global/claude/update-packages/SKILL.md`

Those contracts already contain the needed rules.

## Recommended Fix

Use `$targeted-skill-builder update-packages benchmark actionability threshold`.

Exact owner surface:

- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- focused layer1 benchmark setup tests, likely `tests/layer1/bench-setups.test.ts` or adjacent quality coverage

Proposed behavior change:

1. Make the `update-packages` benchmark quality rubric treat missing target-specific migrate routes as a material failure when major/framework/tooling upgrades are present.
2. Make `workflow-actionability` a threshold/critical criterion for this setup, or cap run-level quality when it fails, so aggregate quality cannot obscure missing per-batch execution structure.
3. Keep the expected actionability shape focused on batch sections that include:
   - explicit Batch 0/1/2 or equivalent ordered batch labels;
   - mutation command or exact file edit per batch;
   - verification command per batch;
   - expected proof or artifact per batch;
   - do-not-proceed/on-red gate and target-specific `$migrate` or `/migrate` stop route.
4. Add positive examples for target-specific routes such as `/migrate react`, `/migrate vitest`, `/migrate pnpm`, `$migrate react`, `$migrate vitest`, and `$migrate pnpm`.
5. Add negative examples for bare `/migrate` and `$migrate` when the fixture names React, Vitest, pnpm, or npm-to-pnpm migration targets.

## Validation Plan

Run after the targeted rubric update:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill update-packages
pnpm --dir tests bench --skill update-packages --agent both --runs 3 --chunk-size 3 --pause 0
```

Also run targeted evidence checks:

```bash
rg -n "workflow-actionability|workflow-targeted-migration-routes|UPDATE_PACKAGES_BATCH_ACTIONABILITY_PATTERN|UPDATE_PACKAGES_TARGETED_MIGRATION_ROUTE_PATTERN" tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer1
rg -n "Batch execution checklist|/migrate <package or framework>|expected proof" global/codex/update-packages/SKILL.md global/claude/update-packages/SKILL.md
```

Expected proof:

- retained Claude-like artifacts with bare `/migrate` routes score materially lower or fail the quality threshold;
- Codex-like artifacts with target-specific migrate routes and per-batch proof structure pass;
- verify still passes for `update-packages`;
- a fresh benchmark no longer reports a high aggregate quality score when per-batch actionability is missing.

## Confidence And Evidence Gaps

Confidence: high.

Evidence is direct from the latest benchmark report, raw run quality results, mirrored skill contracts, evaluator code, and the prior dated agent-review report.

Evidence gaps:

- This triage did not run a broad `$analyze-sessions` recurrence scan. It is not needed because the issue is localized to the current benchmark sessions and a prior focused review already documented the same rubric weakness.
- This triage did not modify the benchmark rubric; that should be handled by a narrow targeted-skill-builder task so the test examples and evaluator changes land together.

Recommended next skill: `$targeted-skill-builder update-packages benchmark actionability threshold`
