# Triage: feature-interview Prototype Gate Benchmark Quality Failure

> Date: 2026-05-18
> Workflow: `$session-triage feature-interview benchmark failure`
> Target skill: `feature-interview`
> Benchmark report: `benchmark/test-feature-interview-2026-05-18.md`

## Target

Scope was limited to the current repository, the `feature-interview` benchmark failure, mirrored `feature-interview` skill contracts, and retained benchmark artifacts.

Evidence sources:

- `benchmark/test-feature-interview-2026-05-18.md`
- `tests/benchmarks/runs/feature-interview-claude-02d30038/report.json`
- `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/report.json`
- `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-000.json`
- `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-001.json`
- `tests/benchmarks/runs/feature-interview-codex-ed08cfc2/run-002.json`
- `global/codex/feature-interview/SKILL.md`
- `global/claude/feature-interview/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tasks/lessons.md`

Evidence intentionally skipped:

- Broad session-history scan. This is one immediate benchmark failure with retained artifacts and does not need recurrence analysis.
- App/product UI review. The target is the skill benchmark output, not a built product surface.

## User-Identified Issue

The fresh `$benchmark-test-skill feature-interview` run did not produce a clean pass after the prototype-first gate update. The benchmark report recommended `$session-triage feature-interview benchmark failure`.

## Verification Verdict

Verified as a benchmark quality-evaluator false negative with a separate fully blocked Claude lane, not a verified `feature-interview` skill-contract failure.

Supporting evidence:

- Verify passed for `feature-interview`: layer1 PASS in 3.6s; layer2 SKIP because no target-specific layer2 tests matched.
- Claude session `feature-interview-claude-02d30038` had 0 evaluated runs and 3 infrastructure blocks, all `agent runner budget exceeded`.
- Codex session `feature-interview-codex-ed08cfc2` had 3 evaluated runs, all hard assertions passed.
- Codex quality averaged 75.9% with 1 threshold failure and 4 critical failures.
- All three Codex runs failed the critical `evidence-linked` criterion only because the evaluator required the exact stale fixture fact `Benchmark reports`.
- Codex run 2 additionally failed `prototype-first-product-gate` because the evaluator did not recognize semantically valid promotion evidence wording.

## Timeline

1. `$targeted-skill-builder product workflow prototype-first gate before SaaS infrastructure` updated `feature-interview` and related workflows to default new product work to clickable prototypes with deferred SaaS infrastructure.
2. `$benchmark-test-skill feature-interview` ran custom coverage from `tests/layer4/setups/tier1-workflows.setup.ts`.
3. Verify passed, so the harness ran both agents.
4. Claude fully blocked from runner budget exhaustion.
5. Codex generated three retained `specs/benchmark-reporting-feature-interview.md` artifacts and passed all hard assertions.
6. The quality rubric marked Codex output below clean-pass quality because of `evidence-linked` and `prototype-first-product-gate` criteria.

## Root Cause

The root cause is benchmark rubric/setup brittleness in `tests/layer4/setups/tier1-workflows.setup.ts`.

### `evidence-linked`

The current fixture text says:

```text
Build a SaaS dashboard where maintainers compare whether a skill has custom, generic, or blocked coverage.
Use fake rows first; do not build auth, Stripe, analytics, or a database until the dashboard flow feels right.
```

The quality evaluator still requires `Benchmark reports` as an exact fact:

```ts
evidenceFacts: ["custom", "generic", "blocked", "Benchmark reports"]
```

That phrase is stale from the older fixture shape. The retained Codex outputs repeatedly used close, relevant language such as `benchmark reporting dashboard`, `skill benchmark coverage`, and `coverage quality`, while preserving the actual fixture facts `custom`, `generic`, `blocked`, fake rows, and infrastructure deferral.

### `prototype-first-product-gate`

The quality criterion requires promotion evidence in a narrow shape:

```ts
/promotion criteria|promote[^.\n]{0,120}infrastructure|evidence[^.\n]{0,120}infrastructure|calibration[^.\n]{0,120}infrastructure/i
```

Codex run 2 wrote:

```text
Evidence that would justify promoting a deferred item into a later phase:
```

It then listed concrete promotion conditions for auth, database/storage, analytics, deployment, admin tooling, and multi-tenancy/billing. This satisfies the `feature-interview` contract's requirement to say what evidence justifies promoting deferred infrastructure, but the regex misses it because `infrastructure` is not adjacent to `evidence`, `promoting`, or `deferred item`.

## Responsible Contract Gap

Responsible gap: benchmark setup quality rubric, not mirrored skill contracts.

Files:

- `tests/layer4/setups/tier1-workflows.setup.ts`
- Focused layer1 coverage in `tests/layer1/bench-setups.test.ts`

The mirrored `feature-interview` skill contracts already require:

- prototype-first gate for user-facing SaaS/product work,
- fake/fixture/in-memory default,
- explicit infrastructure deferral,
- evidence required before promoting deferred infrastructure.

No Claude/Codex skill drift was found.

## Recommended Fix

Use `$targeted-skill-builder feature-interview benchmark prototype gate quality tolerance` to update the benchmark setup, not the skill contract.

Exact intended behavior:

1. Replace stale `evidenceFacts: ["custom", "generic", "blocked", "Benchmark reports"]` with either:
   - facts that are actually in the current fixture, such as `["SaaS dashboard", "custom", "generic", "blocked", "fake rows"]`, or
   - a `requiredPatternCriterion` that accepts `benchmark reporting dashboard`, `skill benchmark coverage`, or equivalent benchmark/coverage dashboard phrasing.
2. Broaden `prototypeFirstProductGateCriterion` so promotion evidence passes when output links evidence to deferred infrastructure in valid forms such as:
   - `Evidence that would justify promoting a deferred item into a later phase`,
   - `Promotion gate`,
   - `Only promote one deferred infrastructure item after...`,
   - per-item promotion conditions for auth, database/storage, analytics, deployment, admin tooling, multi-tenancy, billing, or observability.
3. Add focused layer1 examples proving:
   - retained Codex run 0/1 shape passes despite not using exact `Benchmark reports`,
   - retained Codex run 2 promotion wording passes,
   - missing prototype promotion evidence still fails,
   - premature infrastructure implementation still fails.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill feature-interview
pnpm --dir tests bench --skill feature-interview --agent codex --runs 1 --chunk-size 1 --pause 0
rg -n "prototypeFirstProductGateCriterion|feature-interview|Benchmark reports|fake rows" tests/layer4/setups/tier1-workflows.setup.ts tests/layer1/bench-setups.test.ts
git diff --check
```

After the fix, rerun:

```bash
$benchmark-test-skill feature-interview
```

## Confidence And Evidence Gaps

Confidence: high.

Known:

- The failed quality facts and notes are present in persisted `run-*.json` artifacts.
- The retained Codex artifacts satisfy the skill's product-intake contract more strongly than the current rubric credits.
- Claude had no evaluated outputs, so no Claude skill-output judgment is possible from this benchmark.

Unknown:

- Whether Claude would pass the same rubric after budget reset.
- Whether broader `feature-interview` examples expose additional rubric brittleness. A broad `$analyze-sessions` run is not needed for this immediate failure.

## Recommended Next Skill

Recommended next skill: `$targeted-skill-builder feature-interview benchmark prototype gate quality tolerance`
