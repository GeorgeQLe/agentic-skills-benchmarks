# Session Triage: icon-handler benchmark failure

Date: 2026-05-13
Invocation: `$session-triage icon-handler benchmark failure`

## Target

Scope: `icon-handler` benchmark failure from `$benchmark-test-skill icon-handler`.

Evidence sources:

- `benchmark/test-icon-handler-2026-05-13.md`
- `tests/benchmarks/runs/icon-handler-claude-34290a7e/report.json`
- `tests/benchmarks/runs/icon-handler-claude-34290a7e/run-000.json`
- `tests/benchmarks/runs/icon-handler-claude-34290a7e/run-001.json`
- `tests/benchmarks/runs/icon-handler-codex-eff077f4/report.json`
- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- `tests/layer4/setup-helpers/routing.ts`
- `tests/layer4/setup-helpers/quality.ts`
- `global/codex/icon-handler/SKILL.md`
- `global/claude/icon-handler/SKILL.md`
- `tasks/lessons.md`

## User-Identified Issue

The deterministic `icon-handler` benchmark failed and needs triage.

## Verification Verdict

Partially verified.

The benchmark failure is real: Claude reported 0.0% hard assertion pass rate across 2 evaluated runs, with 1 infrastructure-blocked run, while Codex reported 100.0% across 3 evaluated runs.

The failure is not verified as an `icon-handler` skill-contract defect. The Codex and Claude skill contracts are mirrored except for their intended command syntax: Codex uses `$icon-handler`, while Claude uses `/icon-handler`. The passing Claude artifact in `run-000.json` created `icon-audit.md`, included the required fixture facts, and recommended `/icon-handler fix calc-mascot-icon.png`, which matches the Claude skill contract.

## Timeline

1. `$benchmark-test-skill icon-handler` resolved `icon-handler` as a custom-covered skill using `tests/layer4/setups/tier23-global-workflows.setup.ts`.
2. Verify passed layer1 in 8.7s; layer2 skipped because no target-specific layer2 tests matched `icon-handler`.
3. Claude benchmark session `34290a7e` ran 3 iterations.
4. Claude run #0 created `icon-audit.md` and produced a valid audit, but failed the hard assertion `Output recommends $icon-handler`.
5. Claude run #1 exited with `API Error: 400 Could not process image` and did not create `icon-audit.md`.
6. Claude run #2 was classified as infrastructure-blocked with reason `agent runner budget exceeded`.
7. Codex benchmark session `eff077f4` ran 3 evaluated iterations and passed all hard assertions.

## Root Cause

There are two distinct causes:

1. Benchmark setup route mismatch: `tests/layer4/setups/tier23-global-workflows.setup.ts` defines `recommendedRoute: "$icon-handler"` for `icon-handler`. `assertRecommendedRoute` then checks `content.includes("$icon-handler")` for every runner. That is wrong for Claude, whose mirrored skill contract explicitly routes to `/icon-handler fix <asset>`.
2. Runner/input failure: Claude run #1 failed before skill execution completed with `API Error: 400 Could not process image`. The fixture intentionally writes placeholder text to `calc-mascot-icon.png`, and successful runs treat that as an invalid PNG to audit. This one failure should be tracked as runner/input handling or benchmark-fixture fragility, not as proof that the `icon-handler` contract is wrong.

The existing lesson `2026-05-11 - Benchmarks must respect Claude slash and Codex dollar route conventions` already covers the route-mismatch pattern. This incident is another instance of that lesson, not a novel lesson requiring `tasks/lessons.md` changes.

## Responsible Contract Gap

Responsible gap: benchmark harness setup, not `global/codex/icon-handler/SKILL.md` or `global/claude/icon-handler/SKILL.md`.

Exact files:

- `tests/layer4/setups/tier23-global-workflows.setup.ts`
- `tests/layer4/setup-helpers/routing.ts`
- `tests/layer4/setup-helpers/quality.ts`

The setup model allows only a single `recommendedRoute` string for shared Claude/Codex benchmarks. Some Tier 1 setups already handle runner-specific routes, but the Tier 2/3 global workflow helper does not.

## Recommended Fix

Route this to a narrow benchmark coverage repair, not an `icon-handler` rewrite.

Proposed behavior:

- Allow global workflow benchmark definitions to express runner-specific routes, for example `{ claude: "/icon-handler", codex: "$icon-handler" }`, or to accept a route set when both command syntaxes are valid for the assertion.
- Update `assertRecommendedRoute` and `nextRouteCriterion` usage so the expected route is selected from the active runner, rather than hard-coded as a Codex dollar command.
- Update the `icon-handler` benchmark definition to expect `/icon-handler` for Claude and `$icon-handler` for Codex.
- Consider classifying `API Error: 400 Could not process image` as infrastructure-blocked when the runner fails before producing an artifact, because the skill contract explicitly supports auditing invalid placeholder image files as stale/invalid assets.

Do not change the `icon-handler` skill contract unless a later replay fails after the route expectation is fixed.

## Validation Plan

1. Static route check:

   ```sh
   rg -n 'skill: "icon-handler"|recommendedRoute|/icon-handler|\\$icon-handler' tests/layer4/setups/tier23-global-workflows.setup.ts tests/layer4/setup-helpers
   ```

2. Contract alignment check:

   ```sh
   rg -n 'Recommended next command|\\$icon-handler|/icon-handler' global/codex/icon-handler/SKILL.md global/claude/icon-handler/SKILL.md
   ```

3. Harness verification:

   ```sh
   pnpm verify --skill icon-handler
   ```

4. Benchmark replay after the harness fix:

   ```sh
   pnpm bench --skill icon-handler --agent both --runs 3 --chunk-size 3 --pause 0
   ```

Expected result after the route fix: Claude run #0-style outputs should no longer fail solely for recommending `/icon-handler`; any remaining failures should be separated into runner infrastructure, artifact creation, or genuine skill-output defects.

## Confidence and Evidence Gaps

Confidence: high that the route assertion is a benchmark setup bug. The failed assertion demanded `$icon-handler`, while the Claude skill contract says `/icon-handler` and the Claude output used `/icon-handler`.

Confidence: medium on the `API Error: 400 Could not process image` classification. The raw run shows the error before artifact creation, but it does not expose the runner internals that caused Claude to treat the placeholder image as an image-processing request. A targeted harness replay after the route fix is needed to confirm whether this is intermittent or fixture-induced.

No broad `$analyze-sessions` scan is needed because `tasks/lessons.md` already records the runner-specific route convention failure pattern.

Recommended next skill: `$targeted-skill-builder icon-handler benchmark coverage`
