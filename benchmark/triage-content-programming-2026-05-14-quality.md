# Triage: content-programming Benchmark Quality Failure

Date: 2026-05-14

## Target

- Scope: `$session-triage content-programming benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under review: `packs/creator-foundation/{claude,codex}/content-programming/SKILL.md`
- Benchmark report: `benchmark/test-content-programming-2026-05-14.md`
- Raw sessions:
  - `tests/benchmarks/runs/content-programming-claude-d041146e/`
  - `tests/benchmarks/runs/content-programming-codex-f56f9728/`
- Benchmark setup: `tests/layer4/setups/packs/pack-workflows.setup.ts`
- Related lesson: `tasks/lessons.md` entry `2026-05-11 — Benchmarks must respect Claude slash and Codex dollar route conventions`

## User-Identified Issue

The fresh `content-programming` benchmark still needs triage after the rerun: hard assertions passed, but Claude recorded one output-quality critical failure.

## Verification Verdict

Verified.

The fresh benchmark report shows:

- Verify passed: layer1 PASS in 3.9s; layer2 SKIP because no target-specific layer2 tests matched.
- Claude session `d041146e`: 3/3 evaluated hard assertions passed, output quality 89.2%, and 1 output-quality critical failure.
- Codex session `f56f9728`: 3/3 evaluated hard assertions passed, output quality 98.3%, and 0 critical failures.
- No infrastructure-blocked runs.

Raw Claude run evidence narrows the failure to `run-002.json`: hard assertions all passed, quality threshold passed at 75.0%, and the only critical failure was `pack-fixture-evidence` with note `missing required fact: local-fixture`.

The generated artifact in that same run did cite concrete fixture evidence:

- `fixtures/local-evidence.md`
- `pack-input.md`
- audience input: practical build notes
- cadence input: weekly
- local-only/no external lookup constraint

The artifact used the heading `## Local Fixture Evidence`, but did not include the exact hyphenated token `local-fixture`.

## Timeline

1. `$benchmark-test-skill content-programming` was rerun after the benchmark next-route coverage fix.
2. Verify passed; the both-agent benchmark ran with `--agent both --runs 3 --chunk-size 3 --pause 0`.
3. Claude and Codex both passed 3/3 hard assertions, including runner-specific `/series-spec` and `$series-spec` route checks.
4. Claude run 002 produced `pack-benchmark-output.md` with fixture-backed content but omitted the exact token `local-fixture`.
5. The quality rubric counted that omission as a critical `pack-fixture-evidence` failure.
6. The benchmark report routed here for triage because a critical quality failure remained.

## Root Cause

Benchmark quality-rubric brittleness.

`tests/layer4/setups/packs/pack-workflows.setup.ts` defines the critical `pack-fixture-evidence` criterion as required fact coverage for:

- `local-fixture`
- the first two skill-specific fixture inputs

That makes the rubric require an exact hyphenated implementation marker even when the output references the actual fixture files and fixture facts. The Claude 002 artifact used valid fixture citations (`fixtures/local-evidence.md`, `pack-input.md`, practical build notes, weekly cadence), so this is not evidence that the mirrored `content-programming` contracts are missing a required behavior.

The mirrored Claude and Codex skill contracts are aligned on the relevant behavior:

- report-first approval gate
- output artifact `research/youtube/content-programming-<slug>.md`
- evidence-backed pillars and cadence
- post-write handoff
- runner-specific default successor: `/series-spec` for Claude, `$series-spec` for Codex

## Responsible Contract Gap

Responsible gap: benchmark harness quality rubric in `tests/layer4/setups/packs/pack-workflows.setup.ts`.

Not responsible:

- Mirrored `content-programming` skill contracts: adequate and aligned.
- Runner infrastructure: no blocked runs or API errors.
- Hard benchmark assertions: passed for both agents.
- One-off agent noncompliance: the artifact cited fixture evidence; the failure is the rubric's exact-token requirement.

## Recommended Fix

Route to a narrow benchmark harness update:

Recommended next skill: `$targeted-skill-builder content-programming benchmark fixture-evidence rubric`

Smallest durable change:

- In `tests/layer4/setups/packs/pack-workflows.setup.ts`, update `pack-fixture-evidence` so it accepts concrete fixture references rather than the literal `local-fixture` token.
- Prefer a criterion that passes when output includes at least one concrete fixture path such as `pack-input.md` or `fixtures/local-evidence.md` plus the skill-specific input facts.
- Keep the criterion critical; the benchmark should still fail outputs that only say generic "local evidence" without citing the fixture or its facts.

Proposed behavior wording:

> `pack-fixture-evidence` should require concrete local fixture evidence by accepting `pack-input.md`, `fixtures/local-evidence.md`, or equivalent retained fixture facts, plus the skill-specific input constraints. It should not require the exact phrase `local-fixture`.

## Validation Plan

After the targeted harness update:

1. Add layer1 coverage in `tests/layer1/bench-setups.test.ts` proving:
   - an output with `fixtures/local-evidence.md`, `pack-input.md`, `Audience wants practical build notes`, and `Cadence target: weekly` passes `pack-fixture-evidence`;
   - a generic output with no concrete fixture path or input facts still fails the critical criterion;
   - the existing next-route checks for Claude `/series-spec` and Codex `$series-spec` still pass.
2. Run:
   - `pnpm --dir tests exec vitest run --project layer1 bench-setups`
   - `pnpm --dir tests bench:coverage`
   - `pnpm --dir tests verify --skill content-programming`
   - `pnpm --dir tests bench --skill content-programming --agent both --runs 1 --chunk-size 1 --pause 0`
   - `git diff --check`
3. If the one-run smoke passes cleanly, run `$benchmark-test-skill content-programming` for fresh 3-run evidence.

## Confidence And Evidence Gaps

Confidence: high.

The raw run JSON identifies one critical failure and names the exact missing token. The retained artifact shows concrete fixture references were present. The mirrored skill contracts are aligned and do not require the literal token `local-fixture`.

No broad `$analyze-sessions` scan is needed. This is a focused benchmark-rubric defect with direct raw evidence.

Recommended next skill: `$targeted-skill-builder content-programming benchmark fixture-evidence rubric`
