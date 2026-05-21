# Agent Review: desk-flip

**Date**: 2026-05-20
**Skill**: desk-flip
**Benchmark report**: `benchmark/test-desk-flip-2026-05-20.md`

## Source Evidence

| Agent | Session | Runs Evaluated | Hard Pass Rate | Quality Score |
|-------|---------|----------------|----------------|---------------|
| Claude | 6d95553a | 3/3 | 100% | 84.1% |
| Codex | 2b6d7e15 | 3/3 | 100% | 88.6% |

- Claude runs: `tests/benchmarks/runs/desk-flip-claude-6d95553a/`
- Codex runs: `tests/benchmarks/runs/desk-flip-codex-2b6d7e15/`

## Benchmark Fixture

**Prompt**: Autopsy the stuck project. Read README.md and git-log.txt. Write desk-flip-report.md with Project Summary, What Went Wrong, Salvageable Specs & Designs, Salvageable Assets, Lessons for the Fresh Start, and Recommended Bootstrap Input. End with Next work and Recommended next command: /bootstrap-repo.

**Fixture files**:
- `README.md`: "A todo app that never shipped. Started 6 months ago."
- `git-log.txt`: 6 commits — auth before UI, CI pipeline, CI flake x2, upgrade deps, database migrations
- `specs/mvp.md`: "Basic CRUD todos with user accounts."

## Output-Quality Review

### Claude Outputs (runs 0-2)

All three Claude outputs are structurally complete with the required sections. The writing is sharp and opinionated — phrases like "classic infrastructure-first failure mode" and "same yak, second shave" demonstrate genuine diagnostic voice rather than template fill.

**Task selection clarity**: Excellent. All three correctly identify the infrastructure-first stall as the core failure and trace each commit to the pattern. No ambiguity about what went wrong.

**Implementation specificity**: Good. The bootstrap input sections provide concrete scope (CRUD operations, explicit non-goals, stack preference, first milestone). Run 2 is the most specific with "One hardcoded user. Pages: list + create + complete + delete todos." Runs 0-1 are slightly less prescriptive about UI shape.

**Validation strength**: Weak. None of the outputs define acceptance criteria, testable assertions, or a "definition of done" for the bootstrap input. The lessons section advises "ship a vertical slice" but doesn't tell the next operator what proves the slice works. The skill contract doesn't require acceptance criteria in the report, but the Recommended Bootstrap Input would be materially more useful with them.

**Scope control**: Excellent. All outputs correctly avoid carrying forward code, deps, or infra. All correctly note the MVP spec is valid but the execution ordering was wrong. No over-extension into fixing the old project.

**Next-route ergonomics**: Good. All three end with `/bootstrap-repo`. Runs 0-1 include the route in a dedicated section. Run 2 embeds it inline — still clear but slightly less scannable.

**No invented facts**: Excellent. Every claim traces to the fixture files. No hallucinated services, frameworks, or repository structure.

**Residual-risk awareness**: Weak. No output names meaningful uncertainty: "we don't know why auth was prioritized — was it a hard requirement?", "the spec is thin enough that the next team might repeat the same underspecification." The reports treat the diagnosis as settled rather than acknowledging gaps in the fixture evidence.

| Run | Score | Grade |
|-----|-------|-------|
| 0 | 82 | Good |
| 1 | 80 | Good |
| 2 | 84 | Good |

**Median**: 82 | **Range**: 80-84

### Codex Outputs (runs 0-2)

Codex outputs are structurally complete and slightly longer. The tone is more measured and consultative. All three include explicit acceptance criteria in the bootstrap input, which is a meaningful ergonomic advantage over Claude outputs.

**Task selection clarity**: Excellent. Same correct diagnosis — infrastructure-first stall, CI flake drag, no vertical slice. Run 1 adds the useful observation that the spec was underspecified enough to let infrastructure feel productive.

**Implementation specificity**: Excellent. All three bootstrap inputs include concrete entity definitions (User, Todo with fields), required screens, and explicit acceptance checks. Run 0 lists six acceptance criteria. Run 1 describes the UI shell. Run 2 provides numbered milestones. A next operator could act on any of these without further discovery.

**Validation strength**: Good. Codex outputs include acceptance checks in the bootstrap input (e.g., "A signed-in user can create a todo"). However, run 2's milestones are sequencing guidance, not testable assertions. Runs 0-1 are stronger here.

**Scope control**: Good. Runs 0-1 retain user accounts in the bootstrap input ("A signed-in user can..."), which contradicts the lesson of deferring auth. The reports acknowledge deferring auth in the lessons section but then include sign-in flows in the bootstrap spec. Run 2 correctly defers auth ("Start with a single-user local workflow"). This internal contradiction in runs 0-1 is a minor scope-control flaw.

**Next-route ergonomics**: Good. All three end with the correct route. Run 2 wraps it in a "Next work" + "Recommended next command" pair matching the skill contract format most closely.

**No invented facts**: Excellent. No fabricated claims. Run 2 includes file paths pointing to the temp directory (`/private/var/folders/...`) which is technically accurate but exposes benchmark infrastructure — harmless but not ideal.

**Residual-risk awareness**: Weak. Same gap as Claude — no uncertainty surfaced about why auth was prioritized, whether the thin spec was a team choice or an oversight, or what might go wrong in the second attempt.

| Run | Score | Grade |
|-----|-------|-------|
| 0 | 83 | Good |
| 1 | 85 | Good |
| 2 | 82 | Good |

**Median**: 83 | **Range**: 82-85

## Agent-Review Score Table

| Reviewer | Runner | Run | Score | Grade |
|----------|--------|-----|-------|-------|
| main | claude | 0 | 82 | Good |
| main | claude | 1 | 80 | Good |
| main | claude | 2 | 84 | Good |
| main | codex | 0 | 83 | Good |
| main | codex | 1 | 85 | Good |
| main | codex | 2 | 82 | Good |

**Overall median**: 82.5 | **Range**: 80-85

## Common Strengths

1. **Diagnosis quality is high.** Both agents correctly identify infrastructure-first sequencing as the root cause and trace each commit to the pattern. The analysis is specific, not generic.
2. **Fixture grounding is solid.** Every claim maps to README, git-log.txt, or specs/mvp.md. No hallucinated services, files, or history.
3. **Bootstrap input is actionable.** Both agents produce a condensed brief that a next operator could hand to `/bootstrap-repo` without major editing.
4. **Scope discipline is strong.** No output tries to fix the old project, port code, or expand beyond the autopsy mandate.

## Common Weaknesses

1. **No residual-risk or uncertainty section.** The skill contract doesn't require one, but both agents present the diagnosis as fully settled despite thin fixture evidence (6 commits, 3 files). A single line acknowledging what the report can't determine would improve trust calibration.
2. **Codex runs 0-1 contradict their own lessons.** The lessons say "defer auth" but the bootstrap input includes sign-in flows. This inconsistency could confuse a next operator about whether auth belongs in the fresh start.
3. **Validation strength is the weakest axis.** Claude outputs provide no acceptance criteria; Codex outputs include some but inconsistently. The skill contract's "Recommended Bootstrap Input" section would benefit from requiring testable assertions.
4. **`workflow-artifact-reference` scores 0% across all runs.** The deterministic rubric checks for `desk-flip-report.md` as a literal string in the evaluated content, but the generated report file doesn't self-reference its own filename. The rubric is miscalibrated for this skill.

## Deterministic-Rubric Notes

The `workflow-artifact-reference` criterion (0% across all runs) is a setup calibration issue, not a skill defect. The criterion checks for the output filename within the quality-evaluated content (stdout + file contents). The desk-flip-report.md file correctly avoids self-referencing its own name, and the stdout reference uses backtick-wrapping which may not match the evaluator's text extraction. This should be fixed with an `artifactReferencePattern` in the setup definition.

The `workflow-actionability` criterion varies (25% Claude, 75% Codex) and correctly reflects the gap in acceptance criteria between the two agents.

## Remediation Table

| # | Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
|---|---------|---------------|--------------|-----------------|------------------|-------|
| 1 | `workflow-artifact-reference` scores 0% — false negative from evaluator not matching backtick-wrapped or stdout-only filename references | Benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` desk-flip entry | Add `artifactReferencePattern: /desk-flip-report\.md/i` to the desk-flip definition so the criterion matches the filename in stdout regardless of wrapping | `pnpm verify --skill desk-flip` passes and `pnpm bench --skill desk-flip --agent claude --runs 1` shows `workflow-artifact-reference` score > 0 | `/targeted-skill-builder desk-flip benchmark artifact-reference false-negative` |
| 2 | Codex runs 0-1 include sign-in flows in bootstrap input despite lessons section advising to defer auth | Target-skill contract | `global/claude/desk-flip/SKILL.md` § Recommended Bootstrap Input | Add guidance in the skill contract's process step 4 or output format: "The bootstrap input must be consistent with the lessons. If lessons advise deferring a capability, the bootstrap input must not include it as a first-slice requirement." | Manual review of 3 Codex benchmark runs for auth-deferral consistency between Lessons and Bootstrap Input sections | `/targeted-skill-builder desk-flip auth-deferral consistency between lessons and bootstrap input` |
| 3 | No residual-risk or known-unknowns section in any output | Target-skill contract | `global/claude/desk-flip/SKILL.md` § desk-flip-report.md template | Add an optional "Known Unknowns" section to the report template between "Lessons for the Fresh Start" and "Recommended Bootstrap Input": evidence gaps the autopsy cannot resolve from available fixtures (e.g., team context, external requirements, stakeholder decisions) | `pnpm bench --skill desk-flip --agent both --runs 1` and verify at least one output contains a "Known Unknowns" or "Residual Risk" heading | `/targeted-skill-builder desk-flip add known-unknowns section` |
| 4 | Claude outputs lack acceptance criteria in bootstrap input, reducing actionability for the next operator | Target-skill contract | `global/claude/desk-flip/SKILL.md` § Recommended Bootstrap Input | Add to the skill contract: "The Recommended Bootstrap Input must include 3-5 testable acceptance criteria for the first milestone." | `pnpm bench --skill desk-flip --agent claude --runs 3` and check all outputs for acceptance criteria patterns in the bootstrap input section | `/targeted-skill-builder desk-flip require acceptance criteria in bootstrap input` |

## Summary

Both agents produce good desk-flip reports (median 82.5, range 80-85). The diagnosis is consistently accurate and well-grounded in fixture evidence. The primary gaps are (1) a benchmark rubric false negative on artifact-reference, (2) internal consistency between lessons and bootstrap input in Codex outputs, and (3) missing acceptance criteria and residual-risk awareness across both agents. None of these are blocking — all outputs are usable by a next operator — but addressing them would lift outputs from "good" toward "excellent."

**Next work:** Fix the `workflow-artifact-reference` false negative by adding `artifactReferencePattern` to the desk-flip benchmark setup — this is the highest-impact fix because it's a verified false negative producing misleading rubric data, and it's a one-line change in a known file.
**Recommended next command:** /targeted-skill-builder desk-flip benchmark artifact-reference false-negative
