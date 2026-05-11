# Benchmark Custom Coverage Feature Interview

## Feature Evidence Brief

**Feature seed:** `$feature-interview benchmark custom coverage`

**Evidence sources consulted:**
- `tasks/roadmap.md`
- `tasks/todo.md`
- `tests/harness/bench-setups.ts`
- `tests/harness/bench-types.ts`
- `tests/harness/bench-runner.ts`
- `tests/bench.ts`
- `tests/layer4/setups/design-system.setup.ts`
- `tests/layer4/setups/design-system-draftstonk.setup.ts`
- `tests/layer1/bench-setups.test.ts`
- `packs/agentic-skills-bench/PACK.md`
- `packs/agentic-skills-bench/codex/benchmark-test-skill/SKILL.md`
- Recent git commits: `d96baae`, `76467d0`, `83062fa`

## Claim Validation

| Claim or hypothesis | Verdict | Evidence |
|---|---|---|
| Benchmark custom coverage is already planned. | Confirmed | `tasks/roadmap.md` has `Planned Benchmark Work: Codex Custom Coverage` with unchecked acceptance criteria. |
| Generic smoke coverage exists for repository skills. | Confirmed | `tests/harness/bench-setups.ts` resolves known repository skills to `genericBenchSetup(skill)` when no custom setup exists. |
| Custom benchmark coverage is currently narrow. | Confirmed | `CUSTOM_BENCH_SETUPS` only registers `design-system` and `design-system-draftstonk`. |
| Codex-first priority is already stated. | Confirmed | The roadmap says to use current Codex token headroom and defer Claude custom coverage. |
| This needs planning before implementation. | Confirmed | `tasks/todo.md` queues this feature interview because the current roadmap block has no numbered phase, no coverage matrix, and no implementation steps. |
| The end state should be all skills, not a permanent subset. | Confirmed by user | User said: "I want to build for all of them. Priority can be for the highest-use skills, but ultimately I want all of them to have the test setups." |
| Future skill creation must include benchmark setup handling. | Confirmed by user | User said: "I also want for each future skill that gets created for there to be a benchmark test setup created for that new skill." |
| GitHub Actions are allowed for this work. | Rejected by user | User explicitly said: "no github actions." |

## Assumptions Manifest

- [from roadmap] Codex custom coverage should land before Claude parity because current planning names a Codex-first pass.
- [from codebase] Custom setups should continue to use the `SkillBenchSetup` shape unless the first implementation slice proves the interface needs metadata.
- [from codebase] The generic fallback should remain available while custom setups are rolled out.
- [from codebase] Coverage status needs a machine-readable source because the harness currently only distinguishes custom setup registry entries from generic fallback at runtime.
- [inferred] The safest way to cover every skill is tiered rollout: high-use global skills first, then benchmark/planning/debug workflows, then pack skills.
- [inferred] Future skill scaffolding and skill update workflows should require either a custom setup or a deliberate recorded exception so new skills cannot silently rely on generic smoke coverage.
- [from user] GitHub Actions must not be introduced, modified, or suggested for this work.

## Technical Gotchas

- The current custom setup pattern is hand-coded under `tests/layer4/setups/`; scaling to every skill needs fixture, assertion, naming, and budget conventions.
- Many planning and interview skills require user confirmation. Their custom benchmark prompts must exercise evidence intake, artifact writing, or routing behavior without pretending a real user approved implementation.
- Some skills are mutation-capable and expect commit/push behavior. Benchmarks must run in disposable temp projects and assert the safe planning/report artifact, not real remote mutation.
- Some pack skills depend on external research, browser access, GitHub state, or local apps. Their custom setups may need deterministic fixtures and explicit blocked statuses.
- Mirrored Claude/Codex skills share behavior but command syntax differs. The Codex-first pass should avoid making Claude parity a blocker.
- Benchmark budgets need tiers. A single default will be too low for complex planning skills and too high for simple lint-style workflows.

## Journey Placement

This belongs in the repository skill-quality measurement workflow:

1. A skill exists or is created.
2. `pnpm verify --skill <skill>` validates static and target-specific tests where available.
3. `$benchmark-test-skill <skill>` runs the benchmark harness.
4. Custom layer4 setup evaluates domain-specific behavior when available.
5. Generic smoke fallback remains only as temporary invocation/compliance evidence.
6. Benchmark reports route failures to `$session-triage` and missing custom coverage to `$targeted-skill-builder <skill> benchmark coverage`.

## Questions Asked and Answers Received

**Question:** Should the plan target a few representative high-use skills first, or all skills eventually?

**Answer:** Build custom benchmark setups for all skills eventually. Prioritize highest-use skills first.

**Question:** Can GitHub Actions be part of the solution?

**Answer:** No GitHub Actions.

**Question:** Should future skills automatically get benchmark setup coverage?

**Answer:** Yes. Each future skill that gets created should also get a benchmark test setup.

## Options Presented

1. **Small representative slice only**
   - Pros: fast and low risk.
   - Cons: leaves most repository skills generic-only and does not satisfy the user's end state.

2. **Full repository coverage plan with tiered implementation**
   - Pros: matches the user's desired end state while preserving incremental delivery.
   - Cons: needs a coverage matrix and careful fixture design to avoid one-off sprawl.

3. **Harness rewrite first**
   - Pros: could improve metadata, reporting, and setup discovery.
   - Cons: higher risk before the custom setup pattern is proven across varied skill types.

**Recommendation:** Option 2. Add only the small harness affordances needed for coverage status and future-skill gating, then implement custom setups in priority tiers.

## Planning Destination + Priority Checkpoint

**Decision:** Create a durable spec plus roadmap/task updates.

**Target artifacts:**
- `specs/benchmark-custom-coverage-feature-interview.md`
- `specs/benchmark-custom-coverage.md`
- `tasks/roadmap.md`
- `tasks/todo.md`

**Scope to include now:**
- Custom benchmark setup coverage for every repository skill under `global/` and `packs/`.
- Codex-first implementation order.
- A coverage matrix/status model distinguishing `custom`, `generic`, `blocked`, and `not started`.
- Priority tiers: highest-use global/execution/planning skills first, then pack workflows, then lower-traffic or duplicate/mirrored variants.
- Reusable fixture/assertion conventions.
- Forward contract requiring future skill creation to add benchmark setup coverage or record an explicit blocked status.
- No GitHub Actions.

**Scope deferred:**
- Claude custom coverage parity until Codex-first coverage proves the setup pattern.
- Large harness rewrites unless needed by implementation.
- Production CI integration or GitHub Actions.

**Recommended next command:** `$roadmap`

