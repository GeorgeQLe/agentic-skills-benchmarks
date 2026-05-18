# Triage: feature-interview Latest Route and Prototype Gate Failure

> Date: 2026-05-18
> Trigger: `$session-triage feature-interview benchmark failure`
> Target: `feature-interview`
> Fresh benchmark: `benchmark/test-feature-interview-2026-05-18.md`

## Target

Scope was limited to the latest deterministic benchmark failure for `feature-interview`, the retained evaluated Claude and Codex run artifacts, mirrored `feature-interview` contracts, the Tier 1 benchmark setup, focused layer1 coverage, relevant lessons, and current conversation context.

Evidence sources:

- `benchmark/test-feature-interview-2026-05-18.md`
- `tests/benchmarks/runs/feature-interview-claude-3efd3354/report.json`
- `tests/benchmarks/runs/feature-interview-claude-3efd3354/run-000.json`
- `tests/benchmarks/runs/feature-interview-codex-bcc5f678/report.json`
- `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-000.json`
- `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-001.json`
- `tests/benchmarks/runs/feature-interview-codex-bcc5f678/run-002.json`
- `global/codex/feature-interview/SKILL.md`
- `global/claude/feature-interview/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`
- `tasks/lessons.md`

## User-Identified Issue

The user requested triage for the latest `$benchmark-test-skill feature-interview` benchmark failure. The visible failures were:

- Claude hard assertion failure: `Output recommends /roadmap`
- Claude and Codex output-quality failures on `prototype-first-product-gate`
- two Claude infrastructure blocks from `agent runner budget exceeded`

## Verification Verdict

Verdict: **partially verified**.

Verified generated-output noncompliance:

- Claude session `feature-interview-claude-3efd3354` had one evaluated run and two infrastructure-blocked runs.
- The evaluated Claude artifact ended with `## Next Command` set to `/run`.
- The benchmark prompt told the runner to treat roadmap sequencing as confirmed and not route directly to spec-interview.
- The Claude `feature-interview` contract routes a ready interview artifact to `/roadmap`, not `/run`.
- The Claude hard assertion failure is therefore valid agent output noncompliance, not an infrastructure-only issue.

Verified benchmark/rubric sensitivity:

- All three Codex runs recommended `$roadmap` and preserved the named route experiments.
- Codex run 2 explicitly included clickable local/static prototype routes, fake or fixture-backed data, `/experiments/table-first`, `/experiments/board-first`, `/experiments/command-first`, deferred infrastructure, and promotion evidence.
- The quality evaluator still scored all three Codex runs as failing `prototype-first-product-gate` because its separate-phase detector accepts phrases such as `Prototype Phase 0`, `prototype/experiment phase`, or `separate prototype`, but not semantically close wording such as `prototype-first phase`.
- This makes the Codex quality failure best classified as a benchmark quality-evaluator false negative or over-narrow wording tolerance, not verified `feature-interview` output failure.

Partially verified skill-contract gap:

- The existing mirrored contracts require a prototype-first gate, multiple route-based experiments, and deferred infrastructure.
- The contracts do not consistently force the exact separate-phase wording that the benchmark quality evaluator now requires.
- `tasks/lessons.md` does require product and feature planning to separate prototype exploration from production implementation.

## Timeline

1. `$benchmark-test-skill feature-interview` ran against the current repository state.
2. Verify passed with layer1 PASS in 3.6s and layer2 SKIP.
3. Claude session `feature-interview-claude-3efd3354` completed one evaluated run, failed `Output recommends /roadmap`, and had two infrastructure-blocked runs.
4. The retained Claude artifact recommended `/run` even though the prompt and skill contract pointed to roadmap sequencing.
5. Codex session `feature-interview-codex-bcc5f678` completed three evaluated runs and passed all hard assertions.
6. All evaluated Codex runs failed the configured `prototype-first-product-gate` quality criterion.
7. Retained Codex artifacts showed the prototype-first gate semantics were mostly present, but not in the narrow separate-phase wording the evaluator expects.
8. The curated benchmark report routed to `$session-triage feature-interview benchmark failure`.

## Root Cause

There are two root causes:

1. **Claude generated-output noncompliance with an adequate route contract.** The prompt and Claude skill contract were clear enough for this fixture: write the interview log and route to `/roadmap`. The retained Claude run instead routed to `/run`.
2. **Benchmark quality-evaluator wording mismatch for prototype phase evidence.** The `prototype-first-product-gate` criterion requires an exact separate-phase signal. Valid retained Codex outputs used `prototype-first phase`, `roadmap-sequenced prototype phase`, and equivalent phase sequencing language, but the detector did not accept those forms.

This is not a broad mirrored-contract drift. Claude and Codex `feature-interview` contracts are substantively aligned except for command notation.

## Responsible Contract Gap

Responsible gap: **Tier 1 benchmark quality evaluator**, with a small supporting wording gap in the mirrored `feature-interview` contracts.

Primary file:

- `tests/layer4/setups/tier1-workflows.setup.ts`

Supporting files if the fix chooses to reinforce the skill contract as well:

- `global/codex/feature-interview/SKILL.md`
- `global/claude/feature-interview/SKILL.md`

The route failure does not justify a skill-contract change by itself; it is one evaluated Claude output ignoring an adequate contract.

## Recommended Fix

Route to a narrow targeted update:

Recommended next skill: `$targeted-skill-builder feature-interview benchmark prototype-first phase wording tolerance`

Smallest durable fix:

1. Update `prototypeFirstProductGateCriterion` in `tests/layer4/setups/tier1-workflows.setup.ts` so `hasSeparatePhase` accepts semantically valid wording, including:
   - `prototype-first phase`
   - `prototype phase`
   - `roadmap-sequenced prototype phase`
   - `prototype-first benchmark reporting phase`
2. Add focused layer1 regression cases using the retained Codex shapes from `feature-interview-codex-bcc5f678`.
3. Keep negative coverage that rejects shallow outputs that merely say `defer later` without route experiments, fixture data, and promotion evidence.
4. Optionally reinforce both mirrored `feature-interview` contracts with wording near the prototype-first gate:

> When routing user-facing product or substantial feature work into roadmap sequencing, name the prototype work as a distinct prototype/experiment phase before any production implementation phase. If the source idea names route experiments, preserve those route alternatives in the evidence brief and planning checkpoint.

Do not treat the Claude `/run` output as a reason to weaken routing expectations. It should remain a failed retained run.

## Validation Plan

For this triage report:

```bash
rg -n "Verification Verdict|Root Cause|Responsible Contract Gap|Recommended Fix|Validation Plan|Recommended next skill" benchmark/triage-feature-interview-2026-05-18-latest-route-and-gate.md
git diff --check
```

For the targeted fix:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill feature-interview
```

Then rerun the deterministic benchmark after the fix:

```bash
pnpm --dir tests bench --skill feature-interview --agent both --runs 3 --chunk-size 3 --pause 0
```

## Confidence And Evidence Gaps

Confidence: **high** for the Claude route noncompliance and **high** for the Codex quality false negative.

Evidence gaps:

- Only one Claude run was evaluated; two were infrastructure-blocked. This limits confidence about whether Claude route noncompliance is recurring.
- This triage did not scan broad session history because the current benchmark artifacts are sufficient to classify the immediate failure.
- `$analyze-sessions` is not needed unless similar prototype-phase wording or route handoff failures recur across multiple skills or sessions.

Recommended next skill: `$targeted-skill-builder feature-interview benchmark prototype-first phase wording tolerance`
