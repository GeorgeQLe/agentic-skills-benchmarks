# Agent Review: benchmark-agent-review (2026-05-17)

## Summary

This review covers the latest persisted `$benchmark-test-skill benchmark-agent-review` outputs from `benchmark/test-benchmark-agent-review-2026-05-17.md`.

The generated artifacts are good to excellent. All six evaluated outputs correctly treat hard assertions and deterministic quality as context, focus on the generated artifact's residual-risk-awareness gap rather than benchmark laxness, use local fixture evidence, and route to the runner-specific targeted-skill-builder handoff. The main limitation is retained evidence: the fixture summarizes `ship-manifest.md` but does not include the full reviewed artifact text, so every output has to grade from the fixture summary rather than the source artifact.

**Next work:** Add retained source-artifact evidence for `ship-manifest.md` to the `benchmark-agent-review` benchmark fixture so subjective reviews can inspect the actual artifact text instead of only the fixture summary.

**Recommended next command:** `$targeted-skill-builder benchmark-agent-review retained-artifact evidence gap`

## Source Evidence

- Curated benchmark report: `benchmark/test-benchmark-agent-review-2026-05-17.md`
- Claude run directory: `tests/benchmarks/runs/benchmark-agent-review-claude-10351b11/`
- Codex run directory: `tests/benchmarks/runs/benchmark-agent-review-codex-558b7ba6/`
- Claude raw report: `tests/benchmarks/runs/benchmark-agent-review-claude-10351b11/report.json`
- Codex raw report: `tests/benchmarks/runs/benchmark-agent-review-codex-558b7ba6/report.json`

## Benchmark Context

| Agent | Hard Assertion Pass Rate | Deterministic Output Quality | Infrastructure Blocks | Reviewed Run Indexes |
|---|---:|---:|---:|---|
| Claude | 100.0% (3/3) | 100.0% | 0 | 0, 1, 2 |
| Codex | 100.0% (3/3) | 98.3% | 0 | 0, 1, 2 |

The benchmark expected `pack-benchmark-output.md`. All six evaluated runs retained that artifact text plus `pack-input.md`; Claude run 0 also retained `fixtures/local-evidence.md` in the artifact snapshot. No runs were infrastructure-blocked.

## Score Table

| Reviewer | Runner | Run | Subjective Score | Grade Band | Notes |
|---|---|---:|---:|---|---|
| Codex | Claude | 0 | 95 | excellent | Strongest output. Gives a full residual-risk diagnosis, local evidence, assumptions, concrete remediation directives, and both runner-specific routes. |
| Codex | Claude | 1 | 94 | excellent | Clear and operator-useful. Strong distinction between compliance and qualitative risk, with concrete remediation steps and acceptance signal. |
| Codex | Claude | 2 | 93 | excellent | Excellent evidence grounding and remediation scope. Slightly more verbose, but useful and precise. |
| Codex | Codex | 0 | 82 | good | Correctly grades the retained artifact as usable but incomplete and includes a remediation table-like section. Less implementation-specific than the Claude outputs. |
| Codex | Codex | 1 | 86 | good | Solid local evidence and clear residual-risk gap. Good route ergonomics, but notes the missing source artifact and does not name an owner file. |
| Codex | Codex | 2 | 85 | good | Concise and well-scoped. It identifies the retained-evidence limitation, but the validation check is less concrete than the strongest outputs. |

Median subjective score: 89.5/100.

Score range: 82-95.

## Common Strengths

- All reviewed outputs focus on output quality rather than treating benchmark laxness as the primary problem.
- All outputs use the local fixture facts: hard assertions at 100%, deterministic quality score at 78.6%, and `ship-manifest.md` lacking residual-risk awareness.
- All outputs preserve the correct targeted-skill-builder remediation route for the active runner mode.
- The best outputs convert the weakness into concrete behavior: add residual-risk sections, require specificity, preserve hard-assertion compliance, and validate against the same fixture.

## Common Weaknesses

- The full `ship-manifest.md` artifact is not retained, so the review cannot verify whether the fixture summary fully represents the artifact's actual wording.
- Some Codex outputs stop at behavior-level remediation and do not identify an owner file or harness setup target.
- The weaker outputs use broad validation language, such as rerunning the fixture, without naming the exact assertion or retained artifact check that would prove the gap is closed.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
|---|---|---|---|---|---|
| Reviews rely on a summary of `ship-manifest.md`, not the actual source artifact text. | retained-evidence gap | `tests/layer4/setups/packs/pack-workflows.setup.ts` fixture for `benchmark-agent-review` | Add a retained `ship-manifest.md` fixture artifact or embed the artifact text in the benchmark workspace so generated reviews can quote and inspect the real reviewed output. | Layer1 setup test asserts the `benchmark-agent-review` fixture includes retained source-artifact evidence for `ship-manifest.md`; rerun `$benchmark-test-skill benchmark-agent-review` and confirm outputs reference artifact-specific residual-risk evidence. | `$targeted-skill-builder benchmark-agent-review retained-artifact evidence gap` |
| Some generated reviews do not name an owner file or concrete assertion to prove remediation. | benchmark rubric gap | `tests/layer4/setups/packs/pack-workflows.setup.ts` quality criteria for `benchmark-agent-review` | Extend the output-quality rubric to reward owner-target and validation-check specificity in remediation handoffs. | Layer1 quality test with a generic "rerun the fixture" handoff should score below the top band; a report naming owner target plus validation check should pass. | `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity` |

## Deterministic Rubric Notes

The deterministic rubric did not miss a failing output; all reviewed artifacts are usable or better. It did, however, grade Codex runs 1 and 2 at 97.5% while the retained-evidence limitation materially caps human confidence. That limitation belongs primarily to benchmark fixture evidence capture, not to the generated review artifacts themselves.

## Verdict

The latest `benchmark-agent-review` benchmark outputs are good enough for operators and show the route-prompt fix worked. The next durable improvement is to give future review outputs the actual reviewed artifact text, so subjective grading can evaluate the artifact directly instead of relying on a summary.

**Next work:** Add retained source-artifact evidence for `ship-manifest.md` to the `benchmark-agent-review` benchmark fixture so subjective reviews can inspect the actual artifact text instead of only the fixture summary.

**Recommended next command:** `$targeted-skill-builder benchmark-agent-review retained-artifact evidence gap`
