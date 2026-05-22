# Triage: provision-agentic-config benchmark failure

Date: 2026-05-22

## Target

- Scope: `provision-agentic-config` benchmark failure from `benchmark/test-provision-agentic-config-2026-05-21.md`.
- Skill contracts reviewed: `global/codex/provision-agentic-config/SKILL.md` and `global/claude/provision-agentic-config/SKILL.md`.
- Benchmark setup reviewed: `tests/layer4/setups/tier23-global-workflows.setup.ts`.
- Run evidence reviewed:
  - Claude: `tests/benchmarks/runs/provision-agentic-config-claude-5b8c49e8/`
  - Codex: `tests/benchmarks/runs/provision-agentic-config-codex-982f6b9d/`
- Prior lessons reviewed: `tasks/lessons.md`, especially the 2026-05-05 AGENTS/CLAUDE split lesson.

## User-identified issue

`provision-agentic-config` remained at 0% hard assertion pass rate in the post-fixture-remediation benchmark rerun and needs focused triage.

## Verification verdict

Partially verified.

The benchmark failure is real: all six evaluated runs failed hard assertions. The reported failed assertions were:

- `Output includes orchestration rules`
- `Output includes monorepo safety` for five of six runs

The underlying skill output failure is not verified. Retained `AGENTS.md` artifacts include the substantive sections required by the skill:

- `## Workflow Orchestration`
- `### 4. Verification Before Done`
- `### 7. Monorepo Parallel-Work Safety`
- direct-to-primary shipping guidance
- no-GitHub-Actions guidance
- `Recommended next command: $run`

Example Codex run `run-000.json` wrote `AGENTS.md` with `## Workflow Orchestration`, verification guidance, benchmark coverage validation, `### 7. Monorepo Parallel-Work Safety`, shipping rules, and the expected route. Example Claude run `run-000.json` wrote the same substantive sections.

## Timeline

1. Phase 43 added explicit route guidance to global workflow fixtures.
2. Phase 41 Batch 41.3 Group 2 reran `provision-agentic-config` with both agents.
3. Both agents produced `AGENTS.md` artifacts and exited successfully.
4. The benchmark marked all six runs failed because the generated artifact did not include literal shorthand fixture phrases `orchestration rules` and, for five runs, `monorepo safety`.
5. Retained artifacts show the agents used the canonical section names instead: `Workflow Orchestration` and `Monorepo Parallel-Work Safety`.

## Root cause

This is primarily a benchmark fixture false negative caused by phrase-level assertions on shorthand prompt terms.

The fixture in `tests/layer4/setups/tier23-global-workflows.setup.ts` sets:

```ts
expectedIncludes: ["orchestration rules", "verification", "shipping", "monorepo safety"]
```

Those terms are checked against the generated `AGENTS.md` artifact with literal content includes. The skill contract, however, requires writing canonical policy blocks whose headings say `Workflow Orchestration` and `Monorepo Parallel-Work Safety`, not the exact shorthand phrases `orchestration rules` or `monorepo safety`.

The same mismatch also drags down `workflow-fixture-facts` quality because it reuses `expectedIncludes` as required facts.

Secondary issue: the global forbidden-fabrication quality gate flags `package-lock.json` when the generated monorepo safety block correctly includes the canonical shared-lockfile warning. For this fixture, `package-lock.json` is not a fabrication; it is required by the provisioned policy block.

## Responsible contract gap

Benchmark setup gap, not a verified skill-contract gap.

The Codex and Claude skill contracts are not identical, but the drift does not explain this specific failure. Both require `AGENTS.md`, verification/shipping rules, monorepo safety, and no-GitHub-Actions guidance. The 2026-05-05 lesson about keeping Claude and Codex agent config blocks separate is already reflected in the current contracts.

## Recommended fix

Route to `$targeted-skill-builder provision-agentic-config benchmark fixture false negative`.

Change `tests/layer4/setups/tier23-global-workflows.setup.ts` for the `provision-agentic-config` definition:

- Replace brittle `expectedIncludes` shorthand with canonical artifact facts:
  - `Workflow Orchestration`
  - `Verification Before Done`
  - `Direct-To-Primary Git Flow`
  - `Monorepo Parallel-Work Safety`
- Add explicit expected evidence for fixture-specific requirements:
  - `/No GitHub Actions/i`
  - `/benchmark coverage/i`
  - `/Recommended next command:\s*\$run/i`
- Add `allowedFixtureTerms: ["package-lock.json"]` for this fixture because the canonical monorepo safety block legitimately names shared lockfiles.
- Add focused layer1 coverage proving the fixture accepts canonical headings and rejects outputs that merely echo `orchestration rules` and `monorepo safety` without the actual policy sections.

No `provision-agentic-config` skill contract change is justified by the current evidence.

## Validation plan

Run:

```sh
pnpm --dir tests test -- --run layer1/bench-setups.test.ts --testNamePattern "provision-agentic-config"
pnpm --dir tests verify --skill provision-agentic-config
pnpm --dir tests bench --skill provision-agentic-config --agent both --runs 3 --chunk-size 3 --pause 0
pnpm --dir tests bench:coverage
git diff --check
```

Expected outcome:

- Layer1 proves the benchmark fixture checks canonical policy sections, not shorthand prompt words.
- `verify --skill provision-agentic-config` passes layer1 and continues to layer4 coverage.
- Both-agent benchmark pass rate should improve if agents keep producing the retained artifact shape seen in the 2026-05-21 rerun.

## Confidence and evidence gaps

Confidence: high for benchmark false-negative diagnosis.

Evidence gaps:

- I did not rerun the benchmark during triage; this report diagnoses existing retained artifacts.
- The fix should still be implemented and rerun through `$targeted-skill-builder` because changing benchmark assertions affects scoring behavior.
- Broad recurrence analysis is not needed yet. There are two dated benchmark reports for this skill, but this triage found a concrete fixture-level mismatch rather than a same-family pattern requiring generalized semantic evaluation.

## Recommended next skill

`$targeted-skill-builder provision-agentic-config benchmark fixture false negative`
