# Session Triage: benchmark-test-skill Benchmark Failure

Date: 2026-05-12
Target: `$benchmark-test-skill benchmark-test-skill`
Scope: current repository, persisted benchmark reports, target skill contracts, tier1 benchmark setup, and current conversation.

## Evidence Sources

- `benchmark/test-benchmark-test-skill-2026-05-12.md`
- `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-206e38a7/run-002.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-325ca1dc/run-002.json`
- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer4/setup-helpers/routing.ts`
- `tests/harness/bench-quality.ts`
- `tasks/lessons.md`

## User-Identified Issue

The deterministic benchmark for `benchmark-test-skill` failed and needs triage.

## Verification Verdict

Verified.

The benchmark report shows the verify gate passed, the both-agent benchmark completed with no infrastructure-blocked runs, Claude failed 0/3 hard assertions, and Codex passed 3/3 hard assertions but still had output-quality threshold or critical failures. The persisted run files confirm:

- Claude created the required report file and included `$ship`, but its final response said variants such as "`$ship` as the Next command" rather than the exact `Next command:` shape, so `assertNextCommand` failed.
- Codex generated stronger reports and final responses, but the output-quality evaluator still flagged missing concrete file references, often because the generated report did not name `benchmark/test-run-2026-05-11.md` inside its own body or because quality scoring was applied to the runner-facing final response rather than the generated report artifact.
- Both mirrored `benchmark-test-skill` contracts already require final next-step routing, report verification, raw session evidence, latency, cost, pass-rate or blocked-run data, and quality-summary reporting.

## Timeline

1. User invoked `$benchmark-test-skill benchmark-test-skill`.
2. The command resolved to the project-local bench pack skill.
3. Preflight found custom coverage in `tests/layer4/setups/tier1-workflows.setup.ts`.
4. Verify passed layer1 in 8.4s and skipped layer2 because no target-specific layer2 tests matched.
5. Both-agent benchmark ran 3 iterations each.
6. Claude completed all runs but failed the hard next-command assertion.
7. Codex completed all runs and passed hard assertions, but output-quality checks still reported threshold or critical failures.

## Root Cause

The primary root cause is benchmark harness/rubric drift, not a missing `benchmark-test-skill` contract requirement.

The hard assertion in `tests/layer4/setup-helpers/routing.ts` requires a final-output shape matching `Next command`, while the `benchmark-test-skill` contract allows either `Recommended next skill: <command>` or the two-line `Next work` / `Recommended next command` pair. The hard assertion is stricter than the current skill output contract and does not recognize all valid routing shapes.

The secondary root cause is a weak quality evaluation target. The quality rubric expects file references and exact fixture facts, but the run evidence suggests quality is evaluated against the final runner response in addition to, or instead of, the generated benchmark report artifact. This makes the rubric penalize otherwise acceptable generated reports for not repeating every source filename in the chat summary.

## Responsible Contract Gap

Responsible area: benchmark harness and tier1 setup.

Files:

- `tests/layer4/setup-helpers/routing.ts`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- potentially `tests/harness/bench.ts` or the quality-output extraction path that feeds `tests/harness/bench-quality.ts`

Not responsible: mirrored `packs/agentic-skills-bench/{codex,claude}/benchmark-test-skill/SKILL.md`; the contract already contains the required output and next-step routing language.

## Recommended Fix

Route to `$targeted-skill-builder benchmark-test-skill benchmark failure` for a narrow harness update.

Proposed behavior changes:

1. Broaden `assertNextCommand` or add a benchmark-specific routing assertion so it accepts all contract-valid final route shapes:
   - `Next command: $ship`
   - `Recommended next command: $ship`
   - `Recommended next skill: $ship`
   - the two-line `Next work:` plus `Recommended next command:` shape
2. Make `benchmark-test-skill` quality evaluation read the generated `qualityOutputPath` artifact as the primary quality target. Use final runner stdout only for final-response routing assertions.
3. Tighten the tier1 benchmark prompt or rubric so generated reports explicitly name the source files and output file when those are required by the quality rubric:
   - `bench-output.txt`
   - `verify-output.txt`
   - `benchmark/test-run-2026-05-11.md`
4. Add a layer1 regression case that proves the route assertion accepts the mirrored contract's allowed output shapes and rejects missing handoffs.

## Validation Plan

- `pnpm --dir tests test:layer1 -- bench-setups routing`
- `pnpm --dir tests verify --skill benchmark-test-skill`
- `pnpm --dir tests bench --skill benchmark-test-skill --agent codex --runs 1 --chunk-size 1 --pause 0`
- Targeted `rg` checks:
  - `rg -n "Recommended next skill|Recommended next command|Next work|Next command" tests/layer4/setup-helpers tests/layer4/setups`
  - `rg -n "qualityOutputPath|readGeneratedFile|qualityEvaluator" tests/harness tests/layer4`

## Confidence And Evidence Gaps

Confidence: high for the hard-assertion diagnosis; moderate for the quality-evaluation target diagnosis.

The persisted run JSON includes final stdout and quality notes, but not a separate captured copy of each generated markdown artifact. The Codex stderr embeds generated diffs, which strongly indicates generated reports sometimes contained the required facts while the quality notes still penalized missing file references. Confirming the exact quality input path requires inspecting the benchmark harness implementation during the targeted fix.

No broad `$analyze-sessions` run is needed. The issue is localized to one benchmark setup and its assertion/rubric behavior.

Recommended next skill: `$targeted-skill-builder benchmark-test-skill benchmark failure`
