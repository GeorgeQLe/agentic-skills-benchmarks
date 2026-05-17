# Agent Review: benchmark-agent-review (2026-05-17)

## Summary

This review covers the latest persisted `$benchmark-test-skill benchmark-agent-review` outputs from `benchmark/test-benchmark-agent-review-2026-05-17.md`.

The generated artifacts are good overall, with three excellent Claude outputs and three usable-to-good Codex outputs. All six evaluated outputs inspected retained `ship-manifest.md` artifact text directly, treated hard assertions and deterministic quality as context, focused on the generated artifact's residual-risk-awareness gap rather than benchmark laxness, and routed to the runner-specific targeted-skill-builder handoff. The main remaining weakness is remediation specificity: some Codex outputs identify the placeholder risk and monitoring sections but do not name a durable owner file, assertion, or validation check with enough precision for the next operator.

**Next work:** Strengthen `benchmark-agent-review` remediation output expectations so retained-artifact reviews must name the owner target and validation check when they find placeholder residual-risk or monitoring sections.

**Recommended next command:** `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity`

## Source Evidence

- Curated benchmark report: `benchmark/test-benchmark-agent-review-2026-05-17.md`
- Claude run directory: `tests/benchmarks/runs/benchmark-agent-review-claude-3378af86/`
- Codex run directory: `tests/benchmarks/runs/benchmark-agent-review-codex-0ceac781/`
- Claude raw report: `tests/benchmarks/runs/benchmark-agent-review-claude-3378af86/report.json`
- Codex raw report: `tests/benchmarks/runs/benchmark-agent-review-codex-0ceac781/report.json`

## Benchmark Context

| Agent | Hard Assertion Pass Rate | Deterministic Output Quality | Infrastructure Blocks | Reviewed Run Indexes |
|---|---:|---:|---:|---|
| Claude | 100.0% (3/3) | 99.2% | 0 | 0, 1, 2 |
| Codex | 100.0% (3/3) | 99.2% | 0 | 0, 1, 2 |

The benchmark expected `pack-benchmark-output.md`. All six evaluated runs retained `pack-benchmark-output.md`, `pack-input.md`, and `ship-manifest.md` in `run-*.json` artifact snapshots. No runs were infrastructure-blocked.

## Reviewed Artifact Facts

The retained fixture artifact is `ship-manifest.md`. It records shipped route prompt alignment, deterministic route assertions passing for Claude and Codex, Layer1 route checks passing, and one Codex smoke benchmark passing. Its `Residual Risks` section says `Not captured.` Its `Post-Ship Monitoring` section says `Not specified.` Its only known unknown is whether future subjective reviews can inspect actual artifact text.

Those facts make this a direct test of the `benchmark-agent-review` workflow: a good output should grade the artifact's residual-risk-awareness gap, avoid blaming benchmark laxness as the primary issue, cite retained local evidence, and hand off a targeted remediation route.

## Score Table

| Reviewer | Runner | Run | Subjective Score | Grade Band | Notes |
|---|---|---:|---:|---|---|
| Codex | Claude | 0 | 94 | excellent | Strongest run. Directly cites `ship-manifest.md` placeholder lines, distinguishes output quality from gating, and proposes specific rubric additions with placeholder detection, residual-risk minimums, monitoring minimums, and scope checks. |
| Codex | Claude | 1 | 88 | good | Clear and operator-useful. It grades the artifact consistently with the 78.6% fixture score and suggests concrete prompt changes, but the owner target is framed as the skill prompt rather than a precise repository file or setup target. |
| Codex | Claude | 2 | 90 | excellent | Concise and well grounded. It identifies empty residual-risk, monitoring, and known-unknown behavior and gives a regression-fixture idea; slightly less concrete about validation command shape than run 0. |
| Codex | Codex | 0 | 82 | good | Correctly uses retained artifact evidence and includes a remediation table. It is useful, but the scoring is shallow and the owner target remains broad. |
| Codex | Codex | 1 | 78 | usable but meaningfully incomplete | Correctly identifies the gap and route, but remediation is mostly acceptance criteria and lacks an owner file, exact assertion, or concrete validation command. |
| Codex | Codex | 2 | 84 | good | Clear local evidence and route ergonomics. Better than run 1 because it names the subjective score and owner behavior, but still stops short of a precise owner file or test target. |

Median subjective score: 86/100.

Score range: 78-94.

## Common Strengths

- All reviewed outputs inspected `ship-manifest.md` directly and cited retained artifact facts, including `Residual Risks: Not captured` and `Post-Ship Monitoring: Not specified`.
- All outputs correctly made the generated artifact quality the review object, rather than treating benchmark pass/fail laxness as the primary issue.
- All outputs stayed within local fixture evidence and avoided external systems, fabricated metrics, or unsupported repository claims.
- All outputs preserved runner-specific next-route ergonomics: Claude outputs used `/targeted-skill-builder ...`, and Codex outputs used `$targeted-skill-builder ...`.
- The strongest outputs converted the weakness into implementation-ready behavior: placeholder detection, concrete residual-risk requirements, monitoring requirements, and regression fixture expectations.

## Common Weaknesses

- Some outputs still stop at broad behavior changes like "update the skill" without naming `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md`, its Claude mirror, or the benchmark setup file that should enforce the behavior.
- Weaker Codex outputs do not give a validation command or assertion shape beyond rerunning the fixture.
- A few outputs lean on the fixture's 78.6% deterministic score as the grade anchor instead of independently applying the review rubric to the retained artifact.
- The remediation table quality is inconsistent across runners: Claude run 0 is ready for implementation; Codex run 1 would require the next operator to rediscover owner targets and test points.

## Remediation

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
|---|---|---|---|---|---|
| Some generated reviews identify placeholder residual-risk and monitoring sections but do not name the durable owner target or exact validation check. | target-skill contract gap | `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md` and Claude mirror | Tighten the remediation handoff section to require owner target, proposed behavior change, and validation command or assertion whenever the review finds placeholder risk or monitoring text. | Run `$benchmark-test-skill benchmark-agent-review` and inspect generated `pack-benchmark-output.md` artifacts for owner targets and validation checks; add layer1 contract coverage if the mirrored skill text can be linted. | `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity` |
| The benchmark quality rubric rewards direct artifact evidence but only weakly distinguishes implementation-ready remediation from broad advice. | benchmark rubric gap | `tests/layer4/setups/packs/pack-workflows.setup.ts` quality criteria for `benchmark-agent-review` | Extend deterministic quality scoring for this setup so top-band outputs must name a responsible owner target and concrete validation check, not only the residual-risk gap and final route. | Focused layer1 quality test: a generic "update the skill" remediation should lose top-band credit; an output naming owner target plus validation check should pass. | `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity` |
| Some outputs use the fixture's 78.6% score as the subjective grade anchor rather than clearly applying the agent-review rubric. | target-skill contract gap | `packs/agentic-skills-bench/codex/benchmark-agent-review/SKILL.md` and Claude mirror | Add a scoring instruction that deterministic quality is context only; the report must justify the subjective score from the retained artifact against task selection clarity, specificity, validation strength, scope control, route ergonomics, invented-fact avoidance, and residual-risk awareness. | Contract or layer1 check asserts review reports separate deterministic quality from subjective score rationale. | `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity` |

## Deterministic Rubric Notes

The deterministic rubric correctly caught retained artifact evidence and runner-specific routes, and all outputs were usable or better. It did not surface the quality gap between Claude run 0's implementation-ready remediation and Codex run 1's broader acceptance-criteria handoff. That is a rubric precision issue, not a reason to reclassify the skill as failed.

## Verdict

The latest `benchmark-agent-review` benchmark outputs are good enough to use, and the retained-artifact fixture fix worked: every evaluated output inspected `ship-manifest.md` directly. The next durable improvement is narrower than the previous retained-evidence gap. Strengthen the review skill and benchmark rubric so future outputs must turn retained artifact weaknesses into owner-specific, validation-ready remediation.

**Next work:** Strengthen `benchmark-agent-review` remediation output expectations so retained-artifact reviews must name the owner target and validation check when they find placeholder residual-risk or monitoring sections.

**Recommended next command:** `$targeted-skill-builder benchmark-agent-review remediation-owner validation specificity`
