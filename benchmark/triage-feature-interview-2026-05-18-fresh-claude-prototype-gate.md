# Triage: feature-interview Fresh Claude Prototype Gate Failure

> Date: 2026-05-18
> Trigger: `$session-triage feature-interview benchmark failure`
> Target: `feature-interview`
> Fresh benchmark: `benchmark/test-feature-interview-2026-05-18.md`

## Target

Scope was limited to the fresh deterministic benchmark failure for `feature-interview`, the retained evaluated Claude run, the corresponding Codex run summary, mirrored `feature-interview` contracts, the Tier 1 benchmark setup, focused layer1 coverage, task notes, and relevant lessons.

Evidence sources:

- `benchmark/test-feature-interview-2026-05-18.md`
- `tests/benchmarks/runs/feature-interview-claude-e499a20d/report.json`
- `tests/benchmarks/runs/feature-interview-claude-e499a20d/run-002.json`
- `tests/benchmarks/runs/feature-interview-codex-e6208aac/report.json`
- `global/codex/feature-interview/SKILL.md`
- `global/claude/feature-interview/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`
- `tasks/lessons.md`
- Current conversation context

## User-Identified Issue

The user requested triage for the fresh `$benchmark-test-skill feature-interview` benchmark failure. The visible failure was the Claude lane's `prototype-first-product-gate` output-quality failure, with two additional Claude infrastructure-blocked runs.

## Verification Verdict

Verdict: **verified** as generated-output noncompliance plus partial infrastructure blocking, not a `feature-interview` skill-contract gap and not a benchmark-rubric false negative.

Supporting evidence:

- Fresh benchmark report: Claude session `feature-interview-claude-e499a20d` had 1 evaluated run, 2 infrastructure blocks from `agent runner budget exceeded`, 1/1 hard assertion pass rate, 77.8% output quality, and one critical failure on `prototype-first-product-gate`.
- Retained Claude artifact `run-002.json` created `specs/benchmark-reporting-feature-interview.md`, passed all hard assertions, and included a prototype gate, fake/static data boundary, deferred infrastructure, and promotion criteria.
- The same retained artifact omitted the fixture-requested multiple route experiments. It chose a single dashboard route and did not preserve the fixture's table-first, board-first, and command-first experiment routes.
- The current benchmark fixture explicitly says: `prototype multiple routes such as table-first, board-first, and command-first experiments`.
- The current benchmark prompt explicitly asks for `route-based experiments`.
- Both mirrored `feature-interview` contracts require multiple route-based experiments when direction is uncertain and a prototype-first gate for new product/substantial feature work.
- Focused layer1 coverage expects `multiple route experiments`, `Prototype Phase 0`, and experiment routes such as `/experiments/table-first`, `/experiments/board-first`, and `/experiments/command-first`.
- Codex session `feature-interview-codex-e6208aac` completed 3/3 evaluated runs with 100.0% hard assertion pass rate and 100.0% output quality, showing the fixture and rubric are executable by at least one runner.

## Timeline

1. A prototype-gate benchmark tolerance update landed for `feature-interview`.
2. `$benchmark-test-skill feature-interview` ran verify and a both-agent benchmark.
3. Verify passed with layer1 PASS and layer2 SKIP.
4. Claude runs 0 and 1 were infrastructure-blocked by agent runner budget.
5. Claude run 2 completed and passed hard assertions but failed the critical `prototype-first-product-gate` quality criterion.
6. Codex completed 3 evaluated runs and passed both hard assertions and output-quality scoring.
7. The curated benchmark report routed to `$session-triage feature-interview benchmark failure`.

## Root Cause

The immediate root cause is **one evaluated Claude output ignored an adequate route-experiment requirement**. It captured a prototype-first gate in general terms but collapsed the requested multi-route experiment plan into a single dashboard route. That misses the current benchmark's stronger prototype workflow requirement: a separate prototype/experiment phase plus route-based alternatives before production infrastructure is promoted.

The two other Claude runs were infrastructure-blocked and should not be counted as skill failures.

## Responsible Contract Gap

Responsible gap: **none in the mirrored `feature-interview` skill contract**.

The Codex and Claude skill contracts are substantively aligned. They differ only in command notation (`$skill` for Codex and `/skill` for Claude). Both include:

- clickable local/static prototype default for new product or substantial feature work
- fake, fixture, or in-memory data boundary
- deferred durable storage, auth, payments, analytics, deployment, admin tooling, multi-tenancy, and production observability
- multiple route-based experiments when feature direction is uncertain
- a final prototype-first checkpoint before roadmap/task routing

The benchmark setup and focused layer1 coverage are also aligned with the current contract. The retained Claude output did not satisfy them.

## Recommended Fix

Do not change `global/codex/feature-interview/SKILL.md`, `global/claude/feature-interview/SKILL.md`, or the Tier 1 benchmark rubric based on this run alone.

Smallest durable action:

1. Treat `feature-interview-claude-e499a20d/run-002.json` as a retained generated-output miss.
2. Re-run `$benchmark-test-skill feature-interview` after Claude runner budget is available, so the Claude lane has enough evaluated samples to distinguish one-off variance from recurring noncompliance.
3. If a second evaluated Claude run again omits route-based experiments while Codex passes, route to `$targeted-skill-builder feature-interview claude route-experiment prompt reinforcement`.

If reinforcement becomes justified, the narrow wording should go in the shared `feature-interview` contract near the prototype-first gate:

> When the source idea names or implies route experiments, preserve those route alternatives in the Feature Evidence Brief and Planning Destination checkpoint. Do not collapse multiple named prototype routes into a single implementation route unless the user explicitly chooses one.

## Validation Plan

For this triage report:

```bash
rg -n "Verification Verdict|Root Cause|Responsible Contract Gap|Recommended Fix|Validation Plan|Recommended next skill" benchmark/triage-feature-interview-2026-05-18-fresh-claude-prototype-gate.md
git diff --check
```

For any future targeted fix, validation should include:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill feature-interview
```

Then re-run:

```bash
pnpm --dir tests bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0
```

## Confidence And Evidence Gaps

Confidence: **high** that this fresh failure is not a mirrored skill-contract gap and not a benchmark false negative.

Evidence gaps:

- Only one Claude run was evaluated; two were infrastructure-blocked.
- This triage did not inspect broad historical Claude behavior because the issue is sufficiently scoped and current evidence supports a one-run generated-output miss.
- `$analyze-sessions` is not needed unless route-experiment omissions recur across future evaluated runs.

Recommended next skill: `none`

Recommended next command: `$benchmark-test-skill feature-interview`
