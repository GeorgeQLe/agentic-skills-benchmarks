# Triage: benchmark-agent-review Claude Quality Failure (2026-05-18)

## Target

- Scope: `$session-triage benchmark-agent-review benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under investigation: `benchmark-agent-review`
- Source benchmark report: `benchmark/test-benchmark-agent-review-2026-05-18.md`
- Raw run directory: `tests/benchmarks/runs/benchmark-agent-review-claude-f72e03c7/`
- Contracts inspected:
  - `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`
  - `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`
- Benchmark setup inspected:
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Lessons checked: `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-agent-review` run reported a benchmark failure that needs triage. The curated report shows no hard-assertion failures, but the Claude lane had deterministic output-quality threshold and critical failures.

## Verification Verdict

Verified as a benchmark quality-rubric false negative with a secondary wording-tolerance gap in the harness.

Evidence:

- `benchmark/test-benchmark-agent-review-2026-05-18.md` reports Claude hard assertions at 100.0% (3/3), no infrastructure blocks, 81.7% output quality, 2 threshold failures, and 2 critical failures.
- `tests/benchmarks/runs/benchmark-agent-review-claude-f72e03c7/report.json` confirms the failed quality criteria:
  - `benchmark-agent-review-remediation-owner-target`: 33.3% average score
  - `benchmark-agent-review-validation-specificity`: 33.3% average score
- `run-000.json` passed all quality criteria, proving the setup can score valid remediation.
- `run-001.json` and `run-002.json` include exact owner files and concrete validation checks, but fail the owner/validation criteria because the labels do not match the evaluator's narrow syntax.
- The mirrored `benchmark-agent-review` contracts already require exact owner targets, behavior changes, validation checks, and implementation-ready remediation rows.

## Timeline

1. `$benchmark-test-skill benchmark-agent-review` ran after the owner-specificity tolerance update.
2. Verify passed with layer1 PASS and layer2 SKIP.
3. Claude session `benchmark-agent-review-claude-f72e03c7` completed three evaluated runs with all hard assertions passing.
4. Claude run #0 scored 100.0% quality.
5. Claude runs #1 and #2 failed deterministic quality on owner-target and validation-specificity criteria.
6. Inspection showed those outputs still named concrete owner files and validation checks, using Markdown labels such as `**Owner target / file:**` and `**Exact owner files.**`.
7. The current evaluator only accepts labels shaped like `Owner target:` / `Owner file:` / `Owner surface:` / `Owner:` or a table header `| Owner target |`.

## Root Cause

The benchmark quality evaluator is too syntactically brittle for valid remediation-owner wording.

The failing Claude artifacts are substantively remediation-ready:

- Run #1 names:
  - `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`
  - `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
- Run #1 includes validation checks such as a layer-level assertion for non-placeholder risk sections and a grader failure when no quote is present.
- Run #2 names the same exact owner files and includes a layer4 setup validation check for placeholder residual-risk content, score ceiling, and cross-runner parity.

The evaluator misses these because `benchmarkAgentReviewOwnerTargetCriterion` and `benchmarkAgentReviewValidationSpecificityCriterion` require a narrow owner-label regex:

```text
(owner target|owner file|owner surface|owner)\s*:
```

That rejects common Markdown labels where the label has a qualifier before the colon, including:

- `Owner target / file:`
- `Owner target / owner file:`
- `Exact owner files.`
- `Owner files:`

The owner-file path detection already succeeds; the failure is the required label shape.

## Responsible Contract Gap

Responsible surface: benchmark harness/rubric, not the `benchmark-agent-review` skill contract.

Exact owner files:

- `tests/layer4/setups/packs/pack-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

The mirrored skill contracts are adequate and already say remediation rows must name exact owner files when known, proposed behavior changes, and validation checks. The failing outputs followed that contract closely enough that classifying them as critical failures is misleading.

## Recommended Fix

Use `$targeted-skill-builder benchmark-agent-review benchmark owner-label tolerance`.

Smallest durable change:

1. Update `benchmarkAgentReviewOwnerTargetCriterion` to accept Markdown owner labels that include qualifiers before the colon, especially:
   - `Owner target / file:`
   - `Owner target / owner file:`
   - `Owner files:`
   - `Exact owner files.`
2. Update `benchmarkAgentReviewValidationSpecificityCriterion` to reuse the same owner-label helper so validation-specificity does not fail when owner files are present under a valid Markdown label.
3. Keep rejecting broad-only remediation such as `Owner target: benchmark-agent-review skill behavior` when no exact owner file or scoped lookup note exists.
4. Add focused layer1 coverage using the two failing forms from the latest Claude artifacts:
   - `**Owner target / file:** ...`
   - `**Exact owner files.** ...`

Proposed behavior wording for the harness:

> Treat a remediation owner label as present when the output uses a Markdown label or table header that clearly names owner target, owner file, owner files, owner surface, exact owner file, or exact owner files, including labels with qualifiers before the colon. Still require either an exact known owner path or a scoped owner-plus-lookup note.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill benchmark-agent-review
pnpm --dir tests bench --skill benchmark-agent-review --agent claude --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Targeted checks:

```bash
rg -n "Owner target / file|Exact owner files|benchmarkAgentReviewOwnerTargetCriterion|benchmarkAgentReviewValidationSpecificityCriterion" tests/layer4/setups/packs/pack-workflows.setup.ts tests/layer1/bench-setups.test.ts
```

Expected proof:

- The two new layer1 cases pass owner-target and validation-specificity criteria.
- Existing broad-owner and broad-only remediation tests still fail.
- `benchmark-agent-review` verify still passes.
- A one-run Claude smoke benchmark no longer fails quality solely because of owner-label syntax.

## Confidence And Evidence Gaps

Confidence: high.

Known:

- The failure reproduced in persisted quality results.
- The failing artifacts include concrete owner files and validation checks.
- The evaluator's label regex explains the exact false negative.
- The mirrored skill contracts already require the right behavior.

Evidence gaps:

- This triage did not rerun the benchmark after a fix because no fix was implemented in this analysis step.
- No broad recurrence scan was needed; the issue is localized to one setup and its layer1 coverage.

Recommended next skill: `$targeted-skill-builder benchmark-agent-review benchmark owner-label tolerance`
