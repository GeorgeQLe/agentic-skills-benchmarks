# Triage: analyze-sessions Benchmark Failure

Date: 2026-05-15

## Target

- Scope: `$session-triage analyze-sessions benchmark failure`
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under review: `global/{claude,codex}/analyze-sessions/SKILL.md`
- Benchmark report: `benchmark/test-analyze-sessions-2026-05-15.md`
- Raw sessions:
  - `tests/benchmarks/runs/analyze-sessions-claude-6b8dbd1e/`
  - `tests/benchmarks/runs/analyze-sessions-codex-afaf2f22/`
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Routing helpers: `tests/layer4/setup-helpers/routing.ts` and `tests/layer4/setup-helpers/quality.ts`
- Related lessons:
  - `tasks/lessons.md` entry `2026-05-11 — Benchmarks must respect Claude slash and Codex dollar route conventions`
  - `tasks/lessons.md` entry `2026-05-05 — Avoid singular/plural skill name ambiguity`

## User-Identified Issue

The fresh deterministic `analyze-sessions` benchmark failed and needs triage before remediation or subjective review.

## Verification Verdict

Verified.

The benchmark report records verify passing before benchmark execution:

- layer1 PASS in 3.8s with 1,195 tests across 15 files
- layer2 SKIP because no target-specific layer2 tests matched `analyze-sessions`

The both-agent benchmark then completed without infrastructure-blocked runs:

- Claude session `6b8dbd1e`: 0/3 evaluated hard assertions passed, output quality 71.2%, 3 threshold failures, and 3 critical failures.
- Codex session `afaf2f22`: 2/3 evaluated hard assertions passed, output quality 80.3%, 1 threshold failure, and 2 critical failures.

The raw run evidence shows two separate causes:

1. The Claude runs created `session-analysis.md`, included fixture facts, and routed the single concrete incident to `/session-triage`, but the benchmark expected `$targeted-skill-builder` for every runner.
2. Codex run #1 exited 0 but created no `session-analysis.md`; adjacent Codex runs #0 and #2 passed all hard assertions.

The benchmark route parser also rejects a label shape explicitly allowed by the skill contracts. A direct regex probe showed:

| Sample | `nextCommandHandoffPattern` | `/session-triage` recommended route |
| --- | ---: | ---: |
| `**Recommended next command:** /session-triage` | false | false |
| `Recommended next command: /session-triage` | true | true |

## Timeline

1. `$benchmark-test-skill analyze-sessions` ran verify and the both-agent 3-run benchmark.
2. The custom setup used one fixture file, `sessions/log-1.md`, containing: `Skipped validation twice after task-doc edits. User corrected missing lessons update.`
3. The setup prompt asked the runner to analyze that one file and write `session-analysis.md`.
4. The setup expected `recurring patterns`, `automation opportunities`, `risks`, a route handoff, and `$targeted-skill-builder`.
5. Claude treated the source as one concrete incident with insufficient broad trend evidence and routed to `/session-triage`, matching the mirrored Claude `analyze-sessions` contract for concrete incidents.
6. Codex passed the expected `$targeted-skill-builder` route in runs #0 and #2, but run #1 produced no report artifact.
7. The benchmark report routed here because hard assertions and quality thresholds failed.

## Root Cause

Benchmark fixture and routing mismatch.

The `analyze-sessions` contracts are aligned on a key distinction:

- broad cross-session trends and verified workflow gaps belong in `analyze-sessions` and may route to `targeted-skill-builder`;
- one current session, one mistake, one correction, one repo incident, or one skill failure should route to `session-triage`.

The current benchmark fixture uses a single short incident note but hard-requires `$targeted-skill-builder`. That makes the expected route conflict with the skill contract for outputs that correctly treat the evidence as a concrete incident needing triage.

The benchmark also repeats the known runner-route convention issue: it expects the Codex dollar route for both agents. Claude outputs should use slash routes such as `/targeted-skill-builder` or `/session-triage`, not `$targeted-skill-builder`.

A second harness gap is the next-route parser. `global/{claude,codex}/analyze-sessions/SKILL.md` allows the final routing pair with bold labels such as `**Next work:**` and `**Recommended next command:**`, but `tests/layer4/setup-helpers/routing.ts` only accepts plain labels. That made otherwise recognizable Claude final-route labels fail `Output includes next command handoff`.

Codex run #1 is a separate runner/agent noncompliance event: it exited 0 without creating the requested artifact. It is not enough by itself to justify changing the `analyze-sessions` skill contract because the adjacent Codex runs passed with the same prompt and setup.

## Responsible Contract Gap

Responsible gaps:

- `tests/layer4/setups/tier23-global-workflows.setup.ts`: the `analyze-sessions` fixture is too narrow for a required `$targeted-skill-builder` next route and does not use runner-specific route expectations.
- `tests/layer4/setup-helpers/routing.ts`: next-route detection does not accept bold Markdown labels that the skill contracts explicitly allow.
- `tests/layer1/bench-setups.test.ts`: coverage does not protect `analyze-sessions` fixture scope, runner-specific route conventions, or bold-label next-route parsing.

Not responsible:

- Mirrored `global/claude/analyze-sessions/SKILL.md` and `global/codex/analyze-sessions/SKILL.md`: the route distinction is clear and aligned.
- Runner infrastructure capacity: no rate limits, quota failures, or blocked runs were recorded.
- A broad user-history recurrence issue: no `$analyze-sessions` sweep is needed to classify this narrow benchmark failure.

## Recommended Fix

Route to a narrow benchmark harness update:

Recommended next skill: `$targeted-skill-builder analyze-sessions benchmark fixture routing`

Smallest durable change:

- In `tests/layer4/setups/tier23-global-workflows.setup.ts`, make the `analyze-sessions` fixture genuinely broad if it continues to require `targeted-skill-builder`: use multiple session/history files or multiple dated entries showing the same validation/lessons failure across sessions, and update the prompt to analyze the selected sessions directory rather than one incident file.
- Replace the single `recommendedRoute: "$targeted-skill-builder"` with runner-specific routes:
  - Claude: `/targeted-skill-builder`
  - Codex: `$targeted-skill-builder`
- Alternatively, if the benchmark intentionally keeps the single-incident fixture, change the expected routes to Claude `/session-triage` and Codex `$session-triage`. Do not keep a single concrete incident fixture while requiring `targeted-skill-builder`.
- In `tests/layer4/setup-helpers/routing.ts`, allow optional bold Markdown markers around accepted next-route labels, including `**Next work:**` and `**Recommended next command:**`.
- Add layer1 coverage for both route parser behavior and the `analyze-sessions` setup route expectation.

Proposed behavior wording for the setup:

> `analyze-sessions` benchmark fixtures that require `targeted-skill-builder` must provide broad repeated-history evidence, not a single incident note. The setup must use runner-specific route expectations and accept the bold next-route labels permitted by the skill default shipping contract.

## Validation Plan

After the targeted harness update:

1. Add focused layer1 coverage in `tests/layer1/bench-setups.test.ts` proving:
   - `nextCommandHandoffPattern` and `recommendedNextRoutePattern` accept `**Recommended next command:** /session-triage` and `**Recommended next command:** $targeted-skill-builder`;
   - the `analyze-sessions` setup uses runner-specific route expectations;
   - the fixture either provides broad repeated-history evidence when expecting `targeted-skill-builder`, or expects `session-triage` for a single incident.
2. Run:
   - `pnpm --dir tests exec vitest run --project layer1 bench-setups`
   - `pnpm --dir tests bench:coverage`
   - `pnpm --dir tests verify --skill analyze-sessions`
   - `pnpm --dir tests bench --skill analyze-sessions --agent both --runs 1 --chunk-size 1 --pause 0`
   - `git diff --check`
3. If the one-run smoke passes without route or artifact failures, rerun `$benchmark-test-skill analyze-sessions` for fresh 3-run evidence.

## Confidence And Evidence Gaps

Confidence: high.

The raw run data directly shows that Claude wrote the expected artifact and routed to `/session-triage` because the source looked like one concrete incident. The mirrored skill contracts explicitly support that routing distinction. The route-helper regex probe independently verifies that bold accepted labels are rejected by the harness.

Evidence gap: Codex run #1 exited 0 without creating an artifact, and the persisted stderr does not explain why the runner stopped after the prompt. Because the adjacent Codex runs passed the same setup, treat that as runner/agent no-op evidence to watch during the next smoke, not as the primary root cause.

No broad `$analyze-sessions` scan is needed. This is a focused benchmark-harness mismatch with direct raw evidence.

Recommended next skill: `$targeted-skill-builder analyze-sessions benchmark fixture routing`
