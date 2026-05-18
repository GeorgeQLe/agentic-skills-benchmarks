# Triage: benchmark-agent-review Codex Owner Table Labels (2026-05-18)

## Target

- Scope: `$session-triage benchmark-agent-review benchmark failure`
- Target skill: `benchmark-agent-review`
- Benchmark report: `benchmark/test-benchmark-agent-review-2026-05-18.md`
- Raw run directory: `tests/benchmarks/runs/benchmark-agent-review-codex-9c6219ef/`
- Relevant contracts:
  - `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`
  - `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`
- Relevant benchmark setup:
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
  - `tests/layer1/bench-setups.test.ts`
- Relevant prior evidence:
  - `benchmark/triage-benchmark-agent-review-2026-05-18-claude-quality.md`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-agent-review` run produced a benchmark quality failure and routed to `$session-triage benchmark-agent-review benchmark failure`.

## Verification Verdict

Verified as a benchmark quality-evaluator false negative, with a minor retained output-quality weakness in run 2.

The benchmark report shows Codex passed all hard assertions, but the configured output-quality evaluator reported 2 threshold failures and 2 critical failures:

- `benchmark-agent-review-remediation-owner-target`: 33.3%
- `benchmark-agent-review-validation-specificity`: 33.3%

Raw Codex evidence shows:

- Run 0 passed quality at 98.3%.
- Run 1 failed quality at 73.3% because the evaluator reported `missing owner target label` and `missing remediation owner target`.
- Run 2 failed quality at 71.7% for the same owner-label dependent criteria and also missed the `rubric` reference trait.

Run 1 and run 2 both contain remediation tables with exact owner files and validation checks:

- Run 1 table header: `Owner target / owner file`
- Run 2 table header: `Exact owner target / files`
- Both tables name exact owner files including `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`, `packs/agentic-skills-bench/claude/benchmark-agent-review/SKILL.md`, and/or `tests/layer4/setups/packs/pack-workflows.setup.ts`.
- Both tables include concrete validation checks tied to placeholder residual-risk evidence from `ship-manifest.md`.

The evaluator's owner-label helper currently accepts labels such as `Owner target:`, `Owner target / file:`, and `Exact owner files.`, but it does not accept slash-composed table headers such as `Owner target / owner file` or `Exact owner target / files`. Because validation-specificity reuses owner-label detection, the validation criterion fails secondarily even when validation checks are present.

## Timeline

1. `$benchmark-test-skill benchmark-agent-review` ran after owner-specificity benchmark tolerance work.
2. Verify passed: layer1 PASS in 3.4s, layer2 SKIP because no target-specific layer2 tests matched.
3. Claude produced 2 evaluated passing runs and 1 infrastructure block for agent runner budget.
4. Codex produced 3 evaluated hard-assertion passing runs.
5. Codex output-quality failed in runs 1 and 2 on owner-label dependent criteria.
6. Inspection of retained `pack-benchmark-output.md` artifacts showed the outputs did include exact owner files and validation checks, but used unrecognized table-header wording.

## Root Cause

The root cause is a benchmark rubric/setup calibration gap in `tests/layer4/setups/packs/pack-workflows.setup.ts`, not a primary `benchmark-agent-review` skill-contract failure.

The `benchmark-agent-review` skill contracts already require implementation-ready remediation rows with owner targets, proposed changes, and validation checks. The failed Codex artifacts followed that contract using table columns, but the quality evaluator recognized only a narrower set of owner-label syntaxes.

The exact missing tolerance is table-header owner labels with slash-composed target/file language:

- `Owner target / owner file`
- `Exact owner target / files`

The validation-specificity failure is derivative because that criterion treats `hasBenchmarkAgentReviewOwnerLabel(output)` as required proof of remediation ownership.

Run 2 also missed the `rubric` reference trait, but that is non-critical and not the threshold driver by itself.

## Responsible Contract Gap

Benchmark setup and layer1 coverage:

- `tests/layer4/setups/packs/pack-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

No mirrored skill-contract drift was found between the Codex and Claude `benchmark-agent-review` pack contracts for this issue. Both already require exact owner files or narrow owner surfaces plus validation checks.

## Recommended Fix

Use `$targeted-skill-builder benchmark-agent-review benchmark owner-table-label tolerance`.

Implement the smallest benchmark-harness update:

1. Extend `hasBenchmarkAgentReviewOwnerLabel(output)` so remediation table headers count as owner labels when they clearly name owner target, owner file, owner files, owner surface, exact owner target, or exact owner files, including slash-composed forms:
   - `| Owner target / owner file |`
   - `| Exact owner target / files |`
   - `| Owner target / files |`
2. Keep the existing exact-owner-path or scoped-owner-plus-lookup requirement in `benchmarkAgentReviewOwnerTargetCriterion`; do not let broad labels such as `Owner target: benchmark-agent-review skill behavior` pass without an exact known owner path or scoped lookup note.
3. Add focused layer1 coverage for the two failed Codex table-header forms from `benchmark-agent-review-codex-9c6219ef`.
4. Keep existing broad-owner and broad-only remediation rejection tests intact.

Suggested rule text for the benchmark setup:

> Treat remediation table headers as owner labels when a column header clearly names owner target, owner file, owner files, owner surface, exact owner target, or exact owner files, including slash-composed combinations such as `Owner target / owner file` and `Exact owner target / files`. Still require exact known owner paths or scoped owner-plus-lookup evidence before awarding owner-target credit.

## Validation Plan

Run:

```bash
pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill benchmark-agent-review
pnpm --dir tests bench --skill benchmark-agent-review --agent codex --runs 1 --chunk-size 1 --pause 0
rg -n "Owner target / owner file|Exact owner target / files|hasBenchmarkAgentReviewOwnerLabel|benchmarkAgentReviewOwnerTargetCriterion|benchmarkAgentReviewValidationSpecificityCriterion" tests/layer4/setups/packs/pack-workflows.setup.ts tests/layer1/bench-setups.test.ts
git diff --check
```

Expected proof:

- The two new layer1 cases pass owner-target and validation-specificity criteria when exact owner paths plus validation checks are present.
- Broad owner targets without exact known owner paths or scoped lookup notes still fail owner-target quality.
- The focused Codex smoke benchmark no longer fails quality solely because of table-header owner-label syntax.

## Confidence And Evidence Gaps

Confidence: high.

Evidence is local and direct: the curated report, raw `report.json`, retained Codex `run-*.json` artifacts, benchmark setup, layer1 tests, mirrored skill contracts, and prior owner-label triage were inspected. No broad `$analyze-sessions` recurrence scan is needed; this is a scoped benchmark evaluator gap.

## Recommended Next Skill

Recommended next skill: `$targeted-skill-builder benchmark-agent-review benchmark owner-table-label tolerance`
