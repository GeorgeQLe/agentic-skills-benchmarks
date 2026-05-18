# Triage: benchmark-agent-review Quality Failure (2026-05-18)

## Target

- Scope: `$session-triage benchmark-agent-review benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under failure: `benchmark-agent-review`
- Source benchmark report: `benchmark/test-benchmark-agent-review-2026-05-18.md`
- Raw run evidence:
  - `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/report.json`
  - `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/run-000.json`
  - `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/run-001.json`
  - `tests/benchmarks/runs/benchmark-agent-review-codex-d0b564cf/run-002.json`
  - `tests/benchmarks/runs/benchmark-agent-review-claude-29400696/run-*.json`
- Contract and setup evidence:
  - `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`
  - `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
  - `benchmark/review-benchmark-agent-review-2026-05-17.md`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-agent-review` run produced a benchmark failure requiring triage.

## Verification Verdict

Partially verified.

The benchmark report and raw JSON verify that this was not an infrastructure block and not a hard-assertion failure. Both agents completed three evaluated runs and passed hard assertions 3/3. The verified failure is in deterministic output-quality scoring:

- Codex quality average: 82.2%.
- Codex threshold failures: 1.
- Codex critical failures: 1.
- Failing criterion: `benchmark-agent-review-validation-specificity` on run 001.
- Lowest-scoring criterion across Codex: `benchmark-agent-review-remediation-owner-target` at 0.0%.
- Claude also scored 0.0% on `benchmark-agent-review-remediation-owner-target` in all three runs, but stayed above threshold because validation-specificity passed.

The generated Codex artifacts did include retained `ship-manifest.md` evidence, owner-target language, proposed behavior changes, validation checks, and the correct runner-specific next route. The weakness is that owner targets remained broad, such as `benchmark-agent-review skill behavior`, `benchmark-agent-review skill output contract`, or `benchmark-agent-review in agentic-skills-bench`, rather than exact owner files like `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md` and the Claude mirror.

The benchmark quality failure is therefore partially valid as a signal that outputs are less implementation-ready than the current `benchmark-agent-review` contract wants, but the exact quality failure is also brittle. The setup prompt asks for an `owner target`, not a literal file path, while the quality criterion requires the literal fact `SKILL.md`. Run 001 also failed critical validation-specificity because it contained the phrase `update existing skill`, even though that phrase appeared in a benign `Preferred output: update existing skill.` line after several concrete validation checks.

## Timeline

1. `$benchmark-test-skill benchmark-agent-review` ran on 2026-05-18.
2. Verify passed: layer1 PASS in 3.5s; layer2 SKIP because no target-specific layer2 tests matched.
3. Both-agent benchmark completed without infrastructure blocks.
4. Claude session `benchmark-agent-review-claude-29400696` passed 3/3 hard assertions with 86.7% quality.
5. Codex session `benchmark-agent-review-codex-d0b564cf` passed 3/3 hard assertions with 82.2% quality.
6. Codex run 001 quality failed threshold and critical checks because the evaluator reported missing `SKILL.md` and forbidden phrase `update the skill`.
7. The curated benchmark report routed to `$session-triage benchmark-agent-review benchmark failure`.

## Root Cause

The root cause is a benchmark setup/rubric calibration gap, with a secondary generated-output specificity weakness.

The setup now correctly tests the intended behavior: retained artifact inspection, residual-risk-awareness remediation, and runner-specific targeted-skill-builder routing. However, the quality rubric uses token-level heuristics that are stricter and less contextual than the prompt and hard assertions:

- `benchmark-agent-review-remediation-owner-target` requires the facts `owner target`, `benchmark-agent-review`, and `SKILL.md`.
- The benchmark prompt requires naming the owner target, proposed behavior change, and validation check, but it does not tell the agent to name exact `SKILL.md` files.
- The current `benchmark-agent-review` contracts do require exact owner files or the narrowest known owner surface when known, but the pack smoke fixture does not expose the file paths.
- `benchmark-agent-review-validation-specificity` forbids the phrase `update the skill`, which catches broad advice but also catches benign wording such as `Preferred output: update existing skill` even when concrete validation checks are present.

This makes the latest failure unsafe to treat as a pure skill-contract failure. The generated outputs should improve owner specificity, but the durable fix should align the prompt, hard assertion, and quality rubric so they test the same behavior.

## Responsible Contract Gap

Responsible gap: `tests/layer4/setups/packs/pack-workflows.setup.ts` benchmark setup/rubric for `benchmark-agent-review`.

Secondary gap: the smoke prompt for `benchmark-agent-review` should explicitly require exact owner files when the quality rubric expects `SKILL.md` evidence.

No mirrored skill drift found: the pack-local Codex and Claude `benchmark-agent-review` contracts both require remediation rows to name exact owner files/surfaces and validation checks. The skill contract is directionally adequate.

## Recommended Fix

Use `$targeted-skill-builder benchmark-agent-review benchmark quality owner specificity tolerance`.

The targeted update should change the benchmark setup, not the skill contract as the primary fix:

1. In `tests/layer4/setups/packs/pack-workflows.setup.ts`, update the `benchmark-agent-review` prompt requirements to say:
   - Name exact owner files when known, including `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`, the Claude mirror, or the benchmark setup/rubric file when the remediation owns the harness.

2. Tighten the owner-target quality criterion so it accepts implementation-ready owner targets but does not depend only on the literal token `SKILL.md`. It should pass when the output names:
   - exact pack skill contract paths;
   - `tests/layer4/setups/packs/pack-workflows.setup.ts`;
   - or a clearly scoped owner surface plus a lookup note when the exact file is not available in the fixture.

3. Replace the broad `forbiddenPhrases: ["update the skill", ...]` behavior for validation specificity with a contextual check:
   - fail outputs where broad phrases are the only remediation or validation guidance;
   - pass outputs that include a concrete validation check, fixture/assertion/layer1 proof, and owner target even if they also say "update existing skill" as a label.

4. Add focused layer1 coverage in `tests/layer1/bench-setups.test.ts`:
   - output with exact `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`, Claude mirror, and validation assertion passes;
   - output with broad `benchmark-agent-review skill behavior` but no file or lookup note loses owner-target credit;
   - output containing `Preferred output: update existing skill` plus concrete validation should not trigger a critical failure;
   - output that only says `update the skill` / `rerun the fixture` still fails validation-specificity.

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality`
- `pnpm --dir tests bench:coverage`
- `pnpm --dir tests verify --skill benchmark-agent-review`
- `pnpm --dir tests bench --skill benchmark-agent-review --agent codex --runs 1 --chunk-size 1 --pause 0`
- Targeted checks:
  - `rg -n "benchmark-agent-review-remediation-owner-target|benchmark-agent-review-validation-specificity|Preferred output|update existing skill" tests/layer4/setups/packs/pack-workflows.setup.ts tests/layer1/bench-setups.test.ts`
  - `git diff --check`

## Confidence And Evidence Gaps

Confidence: high that the observed failure is quality-rubric/prompt calibration plus broad generated owner targets, not infrastructure or hard assertion failure.

Evidence gap: this triage did not run a patched fixture because the current workflow is analysis-only. `$targeted-skill-builder` should implement the setup/rubric change and prove it with focused layer1 coverage plus a Codex smoke benchmark.

No broad `$analyze-sessions` pass is needed. This is a localized benchmark setup issue already supported by the current run artifacts and the 2026-05-17 review report.

Recommended next skill: `$targeted-skill-builder benchmark-agent-review benchmark quality owner specificity tolerance`
