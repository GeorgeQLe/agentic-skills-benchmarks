# Triage: content-programming Benchmark Failure

Date: 2026-05-14

## Target

- Scope: `$session-triage content-programming benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under test: `content-programming`
- Evidence sources:
  - `benchmark/test-content-programming-2026-05-14.md`
  - `tests/benchmarks/runs/content-programming-claude-20ea1edd/report.json`
  - `tests/benchmarks/runs/content-programming-claude-20ea1edd/run-000.json`
  - `tests/benchmarks/runs/content-programming-claude-20ea1edd/run-001.json`
  - `tests/benchmarks/runs/content-programming-claude-20ea1edd/run-002.json`
  - `tests/benchmarks/runs/content-programming-codex-cb044e72/report.json`
  - `tests/benchmarks/runs/content-programming-codex-cb044e72/run-000.json`
  - `tests/benchmarks/runs/content-programming-codex-cb044e72/run-001.json`
  - `tests/benchmarks/runs/content-programming-codex-cb044e72/run-002.json`
  - `packs/creator-foundation/claude/content-programming/SKILL.md`
  - `packs/creator-foundation/codex/content-programming/SKILL.md`
  - `tests/layer4/setups/packs/pack-workflows.setup.ts`
  - `tests/layer4/setup-helpers/routing.ts`
  - `tests/layer4/setup-helpers/quality.ts`
  - `tasks/lessons.md`

## User-Identified Issue

The fresh `content-programming` benchmark failed and needs triage before deciding what to fix.

## Verification Verdict

Verified.

The benchmark report shows verification passed, no runs were infrastructure-blocked, Claude failed hard assertions at 0/3, and Codex passed at 3/3. All three Claude runs failed only `Output includes next command handoff`; every other hard assertion passed. The persisted Claude outputs wrote `pack-benchmark-output.md`, named `creator-foundation` and `content-programming`, matched the expected content/calendar/cadence pattern, and included local fixture evidence and risk/assumption details.

The run artifacts show Claude did include a next-step section, but used `## Next` followed by `Next: /content-programming ...`, `Next: /pack run ...`, or `Next: /run ...`. The hard assertion requires the stricter `nextCommandHandoffPattern`, which accepts labels such as `Recommended next command`, `Next command`, `Recommended next skill`, or `Next work`, but not bare `Next:`.

## Timeline

- `$benchmark-test-skill content-programming` confirmed `content-programming` has custom benchmark coverage through `tests/layer4/setups/packs/pack-workflows.setup.ts`.
- `pnpm verify --skill content-programming` passed layer1 in 4.5s and skipped layer2 because no target-specific tests matched.
- `pnpm bench --skill content-programming --agent both --runs 3 --chunk-size 3 --pause 0` completed without infrastructure blocks.
- Claude wrote valid benchmark artifacts but used bare `Next:` labels, causing 0/3 hard assertion failures.
- Codex wrote `Next Command Line` sections and passed hard assertions, but both runners scored 0.0% on the `pack-next-route` quality criterion because the generic pack quality rubric expected `$run`.

## Root Cause

The failure is a benchmark coverage defect in the generic pack workflow setup, not a proven `content-programming` skill-contract defect.

There are two separate harness issues:

1. The pack benchmark prompt asks for "a Next command line" but does not require the literal handoff labels that the hard assertion accepts. Claude responded with a plausible but non-matching `Next:` label, so the hard assertion failure is caused by prompt/assertion misalignment.
2. The pack quality evaluator defaults every pack skill's expected next route to `$run` unless a setup definition overrides `nextRoute`. That is inconsistent with mirrored `content-programming` contracts, which require `Recommended next skill: /series-spec` for Claude and `Recommended next skill: $series-spec` for Codex after writing the programming artifact.

The mirrored `content-programming` contracts are aligned across Claude and Codex: both include the report-first approval gate, approved artifact handoff, intent-aware routing, and default next-skill routing to `series-spec` using runner-specific command syntax.

## Responsible Contract Gap

Responsible gap: benchmark harness coverage for pack workflow next-route expectations.

Files:

- `tests/layer4/setups/packs/pack-workflows.setup.ts`
- `tests/layer1/bench-setups.test.ts`

No immediate change is recommended to:

- `packs/creator-foundation/claude/content-programming/SKILL.md`
- `packs/creator-foundation/codex/content-programming/SKILL.md`

## Recommended Fix

Route a narrow benchmark coverage update through `$targeted-skill-builder`.

Proposed changes:

- In `tests/layer4/setups/packs/pack-workflows.setup.ts`, change the generic pack prompt from "a Next command line" to require a literal accepted label such as `Recommended next command:` or `Recommended next skill:`.
- Add runner-aware route expectations for `content-programming`: Claude should accept `/series-spec`; Codex should accept `$series-spec`.
- Avoid defaulting all pack workflow quality checks to `$run` when the skill contract defines a known successor. Either add per-skill `nextRoute` values or make the default quality criterion check only for a valid handoff label when no route is known.
- Add layer1 regression coverage proving `content-programming`'s setup prompt requires an accepted next-route label and the quality evaluator rewards `/series-spec` and `$series-spec` rather than `$run`.

Candidate wording for the benchmark prompt:

```text
Include a literal final handoff label accepted by the harness, such as `Recommended next skill: <command>` or `Recommended next command: <command>`. Use the runner's command convention when a skill route is known.
```

For `content-programming`, the expected route should be:

```text
Claude: Recommended next skill: /series-spec
Codex: Recommended next skill: $series-spec
```

## Validation Plan

- `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality`
- `pnpm --dir tests verify --skill content-programming`
- `pnpm --dir tests bench --skill content-programming --agent claude --runs 1 --chunk-size 1 --pause 0`
- `pnpm --dir tests bench --skill content-programming --agent codex --runs 1 --chunk-size 1 --pause 0`
- Targeted checks:
  - `rg -n "Recommended next skill|series-spec|content-programming" tests/layer4/setups/packs tests/layer1`
  - `git diff --check`

## Confidence And Evidence Gaps

Confidence: high for a benchmark harness defect. The persisted run artifacts, assertions, mirrored skill contracts, and setup code all point to prompt/rubric misalignment.

Evidence gaps: this triage did not run a repaired benchmark fixture, because the requested workflow is investigation and the smallest durable fix belongs in a separate targeted update. Broad `$analyze-sessions` recurrence analysis is not needed for this incident.

Recommended next skill: `$targeted-skill-builder content-programming benchmark next-route coverage`
