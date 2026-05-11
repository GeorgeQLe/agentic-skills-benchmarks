# Benchmark Custom Coverage

## Overview

Build custom benchmark test setups for every repository skill in `agentic-skills`, while keeping the existing generic smoke fallback as temporary coverage until each skill has domain-specific assertions.

The current benchmark harness can run every repository skill because unknown skills fall back to `genericBenchSetup(skill)`. That fallback proves invocation and basic handoff compliance, but it does not prove that a skill performs its actual workflow. This spec turns custom benchmark coverage into a repository-wide quality contract.

## Goals

- Provide custom Codex benchmark setups for every skill under `global/` and `packs/`.
- Prioritize highest-use and highest-risk skills first, without changing the end state: all skills get custom setups.
- Keep generic smoke benchmarks available while rollout is incomplete.
- Record coverage status in a durable matrix so custom, generic, and blocked states are visible.
- Add a forward contract so every future skill creation includes a benchmark test setup or a documented blocked status.
- Keep benchmark work local to the existing harness and skill contracts.

## Non-Goals

- GitHub Actions or CI workflow creation.
- Claude custom benchmark parity in the first pass.
- Removing the generic fallback before all skills have custom setups.
- Rewriting the whole benchmark runner before the custom setup pattern is proven.
- Benchmarking the Skills Showcase website, docs site, or product surface.

## Users and Workflow

Primary users are repository maintainers and agents modifying skills.

The intended workflow is:

1. A skill exists or is created.
2. `pnpm verify --skill <skill>` checks static contracts and target-specific tests when present.
3. `$benchmark-test-skill <skill>` runs the harness.
4. If the skill has a custom setup, the benchmark validates domain-specific behavior.
5. If the skill is not yet custom-covered, the generic setup runs and the report clearly marks it as weaker coverage.
6. Missing or blocked custom coverage routes to `$targeted-skill-builder <skill> benchmark coverage`.

## Coverage Model

Add a durable coverage registry or generated matrix with one row per skill name.

Required fields:

| Field | Purpose |
|---|---|
| `skill` | Frontmatter skill name. |
| `source_paths` | Claude/Codex/global/pack skill source paths that share the skill name. |
| `coverage_status` | `custom`, `generic`, or `blocked`. |
| `setup_path` | Custom layer4 setup path when present. |
| `priority_tier` | Rollout priority tier. |
| `agent_scope` | `codex`, `claude`, or `both`; first pass defaults to `codex`. |
| `fixture_type` | Artifact, planning, interview, research, mutation-safe, external-blocked, or other local category. |
| `blocked_reason` | Required when status is `blocked`. |
| `next_command` | Recommended next command when status is `blocked`. |
| `last_verified` | Date or report reference for the last successful custom benchmark validation. |

The matrix is implemented as a TypeScript constant array in `tests/harness/bench-coverage.ts` with compile-time validation.

## Custom Setup Pattern

Custom setups should follow the existing `SkillBenchSetup` interface unless the first slice proves metadata belongs in the type.

Each setup must define:

- A deterministic prompt that exercises the skill's actual workflow.
- Fixture project files or inputs created inside the temp benchmark project.
- Assertions that inspect generated files, routing text, structured data, or other observable outputs.
- A realistic `perRunBudgetUsd` and `timeoutMs`.
- A next-step or routing assertion when the skill contract requires one.

Assertion guidance by skill type:

| Skill type | Preferred assertion shape |
|---|---|
| Artifact-producing skills | Assert exact output files, key sections, structured frontmatter, and route text. |
| Planning/interview skills | Assert evidence brief, assumptions, checkpoint, and durable log/spec/task artifact shape without requiring fake user approval. |
| Execution/shipping skills | Assert plan reading, verification/shipping manifest, and safe temp-project mutation behavior; do not require real remote push in benchmark runs. |
| Debug/triage skills | Assert root-cause evidence, scoped recommendation, and route to the right next command. |
| Research skills | Use deterministic local fixtures and assert citations/evidence coverage; mark external-only cases blocked until a safe fixture exists. |
| Pack routing skills | Assert command resolution, pack availability checks, and next-step routing. |

## Priority Tiers

Tier 1: highest-use global execution and planning skills.

- `run`
- `ship`
- `ship-end`
- `roadmap`
- `plan-phase`
- `feature-interview`
- `spec-interview`
- `investigate`
- `session-triage`
- `targeted-skill-builder`
- `benchmark-test-skill`

Tier 2: repository maintenance and quality skills.

- `sync`
- `handoff`
- `codebase-status`
- `debug`
- `expert-review`
- `regression-check`
- `spec-drift`
- `reconcile-dev-docs`
- `dead-code`
- `hygiene`
- `commit-and-push-by-feature`

Tier 3: skill and pack lifecycle skills.

- `create-agentic-skill`
- `create-local-skill`
- `install-agentic-skills`
- `pack`
- `skills`
- `provision-agentic-config`
- `scaffold`
- `bootstrap-repo`
- `plugin-creator`
- `skill-creator`
- `skill-installer`

Tier 4: domain pack skills.

Cover pack skills by pack, starting with packs used by this repository's active workflows:

- `agentic-skills-bench`
- `monorepo`
- `alignment-loop`
- `project-fleet`
- `code-quality`
- `devtool`
- `business-discovery`
- `business-growth`
- `business-ops`
- `creator-foundation`
- `youtube-ops`
- `remotion`
- `game`
- `*-kanban` packs

## Future Skill Creation Contract

Any workflow that creates a new skill must also create or update benchmark coverage.

Required behavior:

- Add the new skill to the coverage matrix.
- Create a custom layer4 setup for the skill in the same change whenever practical.
- If a custom setup cannot be created immediately, record `coverage_status: blocked` with a concrete reason and next command.
- Update skill creation workflows so they mention benchmark coverage as part of done criteria.
- Keep the generic fallback only as an interim safety net, not as the expected final state.

Applicable workflows include:

- `$create-agentic-skill`
- `$create-local-skill`
- `$targeted-skill-builder`
- `$plugin-creator` when it creates skill-like workflows in this repository
- Any pack-local skill creation workflow added later

## Implementation Plan

### Phase A: Coverage Registry and Contract

- Add the coverage matrix source.
- Add validation that every repository skill appears in the matrix.
- Add validation that every `custom` row points to an existing setup.
- Add validation that every `blocked` row has a non-empty reason and recommended next command.
- Update `benchmark-test-skill` to report whether the requested skill is custom, generic, or blocked.
- Update skill creation/update workflows with the future skill creation contract.

### Phase B: Reusable Setup Helpers

- Extract helpers for common artifact assertions.
- Add helpers for section/assertion checks, next-command checks, file creation, and Markdown/frontmatter parsing.
- Add fixture naming conventions under `tests/fixtures/inputs/`.
- Add budget and timeout tiers.

### Phase C: Tier 1 Custom Codex Coverage

- Add custom setups for the Tier 1 skills.
- Run focused layer1 registry/setup tests.
- Run one-run Codex benchmarks for representative Tier 1 setups before broadening.
- Record pass/fail and coverage status.

### Phase D: Tier 2 and Tier 3 Coverage

- Add repository maintenance, quality, and lifecycle skill setups.
- Prioritize skills that mutate files or route other workflows.
- Keep blocked statuses honest for workflows that need safer fixture design.

### Phase E: Pack Coverage

- Add custom setups pack by pack.
- Prefer shared setup factories for pack families with similar workflow shapes.
- Record pack-level coverage progress in the matrix.

### Phase F: Claude Parity Decision

- After Codex custom coverage is stable, decide whether each custom setup can run unchanged against Claude or needs Claude-specific assertions.
- Do not make Claude parity a blocker for Codex-first completion.

## Acceptance Criteria

- [ ] A committed coverage matrix lists every repository skill.
- [ ] Validation fails when a repository skill is missing from the coverage matrix.
- [ ] Validation fails when a `custom` coverage row points to a missing setup.
- [ ] Validation fails when a `blocked` row lacks a reason and next command.
- [ ] `$benchmark-test-skill <skill>` reports custom/generic/blocked coverage status.
- [ ] Future skill creation/update workflows require benchmark coverage handling.
- [ ] Tier 1 skills have custom Codex benchmark setups.
- [ ] Tier 2 and Tier 3 skills have custom Codex benchmark setups or explicit blocked statuses.
- [ ] Pack skills are covered by custom Codex benchmark setups or explicit blocked statuses.
- [ ] Generic fallback remains available until all skills have custom coverage.
- [ ] No GitHub Actions are created, modified, or recommended.

## Validation

Run focused validation during implementation:

```bash
pnpm --dir tests test:layer1 -- bench-setups.test.ts bench-report.test.ts runner.test.ts
pnpm --dir tests verify --skill benchmark-test-skill
pnpm --dir tests bench --list-skills
git diff --check
```

Run targeted one-run Codex benchmarks as each tier lands:

```bash
pnpm --dir tests bench --skill <skill> --agent codex --runs 1 --chunk-size 1 --pause 0
```

Do not add GitHub Actions for this validation.

