# Session Triage: benchmark-test-skill Benchmark Failure Rerun

Date: 2026-05-12
Target: `$session-triage benchmark-test-skill benchmark failure`
Scope: current repository, fresh benchmark report, persisted Claude/Codex run artifacts, mirrored `benchmark-test-skill` contracts, tier1 benchmark setup, and relevant lessons.

## Evidence Sources

- `benchmark/test-benchmark-test-skill-2026-05-12.md`
- `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/run-000.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/run-001.json`
- `tests/benchmarks/runs/benchmark-test-skill-claude-e7904239/run-002.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-6b3807bf/report.json`
- `tests/benchmarks/runs/benchmark-test-skill-codex-6b3807bf/run-000.json`
- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer4/setup-helpers/routing.ts`
- `tests/harness/bench-runner.ts`
- `tasks/lessons.md`

## User-Identified Issue

The fresh `$benchmark-test-skill benchmark-test-skill` rerun still reports a benchmark failure and needs triage.

## Verification Verdict

Verified.

The benchmark report shows `benchmark-test-skill` had custom coverage and passed verify: layer1 passed 1,256 tests in 8.5s, while layer2 was skipped because no target-specific layer2 tests matched. The both-agent benchmark had no infrastructure-blocked runs. Claude failed 0/3 hard assertions; Codex passed 3/3.

Claude failures are concrete:

- Run 0 exited successfully, created `benchmark/test-run-2026-05-11.md`, included the required evidence fields, matched the expected benchmark pattern, and recommended `$ship`, but failed `Output includes next command handoff`.
- Run 1 created the report and matched the same content assertions, but exited `143` and also failed `Output includes next command handoff`.
- Run 2 exited successfully and matched the evidence assertions, but failed `Output includes next command handoff`.

The failure is not an infrastructure block, not an unknown-skill preflight failure, and not mirrored contract drift.

## Timeline

1. The prior harness/rubric fix routed back to `$benchmark-test-skill benchmark-test-skill`.
2. The fresh rerun confirmed `benchmark-test-skill` is known with custom tier1 coverage.
3. `pnpm verify --skill benchmark-test-skill` passed layer1 and skipped layer2.
4. `pnpm bench --skill benchmark-test-skill --agent both --runs 3 --chunk-size 3 --pause 0` completed both agent batches.
5. Claude generated the requested benchmark report and mentioned `$ship`, but did not produce a label matching the route-handoff pattern in the generated report.
6. Codex generated a report with `Next command: $ship`, passing the hard assertion.

## Root Cause

The immediate failure is Claude output noncompliance with a route-label requirement in the benchmark fixture.

The underlying durable gap is that the fixture and contract do not make the exact artifact-level route label explicit enough for a benchmark whose hard assertion checks the generated report file rather than only the final assistant response. The mirrored skill contracts clearly require a final next-step route in completion output, but Step 4's report verification checklist does not explicitly list "recommended next route" as a required report field. The tier1 fixture prompt asks for "Next command" in the generated report, and the hard assertion correctly uses `assertNextCommand(content)` against `benchmark/test-run-2026-05-11.md`; however, Claude treated the route as prose (`$ship` as Next) instead of a literal `Next command:` / `Recommended next command:` label.

Run 1 also exited with code 143, but it still created the report and failed the same route-label assertion. Treat that as a secondary runner/process stability issue, not the primary skill-contract failure.

## Responsible Contract Gap

Primary owner: benchmark coverage for `benchmark-test-skill`.

Files to update:

- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- `packs/agentic-skills-bench/claude/benchmark-test-skill/SKILL.md`
- `tests/layer4/setups/tier1-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts` or the nearest existing layer1 benchmark setup contract test

This is not a new skill. It is not a broad session-history trend. It is not a GitHub Actions issue.

## Recommended Fix

Use `$targeted-skill-builder benchmark-test-skill benchmark failure` for a narrow update:

1. In both mirrored `benchmark-test-skill` contracts, update Step 4's report verification list to include a required final route field:

   ```md
   - recommended next route, using a literal label such as `Recommended next command:` or `Recommended next skill:`
   ```

2. In the Output section, make the artifact/final-response distinction explicit:

   ```md
   The Markdown report and the final assistant response must both include a literal next-route label accepted by the harness, such as `Recommended next skill: $benchmark-agent-review <skill>` or `Recommended next command: $ship`.
   ```

   Use slash-command equivalents in the Claude mirror.

3. In `tests/layer4/setups/tier1-workflows.setup.ts`, strengthen the `benchmark-test-skill` prompt from:

   ```text
   ... report path, and Next command. Use `$ship` as the Next command.
   ```

   to:

   ```text
   ... report path, and a literal line `Recommended next command: $ship`.
   ```

   For Claude-runner convention, either keep the fixture route as `$ship` only if this fixture is intentionally testing neutral report content, or make `recommendedRoute` runner-aware so Claude expects `/ship` and Codex expects `$ship`. The existing lesson on runner-specific routing says shared benchmark setups should respect slash vs dollar conventions when the route represents an agent command.

4. Add or extend layer1 setup-alignment coverage so `benchmark-test-skill`'s fixture prompt, expected route assertion, and mirrored contracts all mention a literal report-level route label.

## Validation Plan

Run:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill benchmark-test-skill
pnpm --dir tests bench --skill benchmark-test-skill --agent claude --runs 1 --chunk-size 1 --pause 0
pnpm --dir tests bench --skill benchmark-test-skill --agent codex --runs 1 --chunk-size 1 --pause 0
git diff --check
```

Success criteria:

- layer1 fails if the mirrored contracts omit a report-level literal route label requirement.
- The Claude one-run benchmark passes the next-route hard assertion or exposes a true runner failure after the prompt is unambiguous.
- Codex remains passing.
- Quality scoring no longer treats a report with the literal route label as missing `actionable-next-route`.

## Confidence And Evidence Gaps

Confidence: high for the route-label diagnosis. The persisted run artifacts show the generated report existed and satisfied most evidence assertions, while all Claude runs failed the same next-command handoff assertion. The mirrored contracts are aligned on final route requirements, but the report field checklist is not explicit enough for this benchmark fixture.

Evidence gap: the benchmark runner deletes each temporary workdir after saving JSON, so the exact Claude-generated Markdown body is not available for direct inspection. The run JSON records the assertion outcomes, stdout summary, file list, and quality results, which are sufficient for this triage.

No broad `$analyze-sessions` pass is needed.

Recommended next skill: `$targeted-skill-builder benchmark-test-skill benchmark failure`
