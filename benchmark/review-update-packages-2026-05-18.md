# Benchmark Agent Review: update-packages - 2026-05-18

**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Reviewed run directories:**

- `tests/benchmarks/runs/update-packages-claude-a767ae3e/`
- `tests/benchmarks/runs/update-packages-codex-337a5d5e/`

## Benchmark Context

The current deterministic benchmark passed all evaluated hard assertions. Claude completed two evaluated runs and had one infrastructure block from `agent runner budget exceeded`; the blocked run is excluded from subjective scoring. Codex completed three evaluated runs.

| Agent | Hard assertion pass rate | Deterministic output-quality score | Infrastructure-blocked runs |
|---|---:|---:|---:|
| Claude | 100.0% (2/2) | 95.2% | 1 |
| Codex | 100.0% (3/3) | 100.0% | 0 |

The benchmark prompt asked each runner to create `package-update-plan.md` from `package.json`, `npm-view-times.json`, and `package-lock-note.md`, including pnpm migration, npm/pnpm age-gate config, eligible and skipped versions, React 18 to 19 and Vitest 1 to 3 risk handling, verification commands, and the runner-native next command.

## Agent-Review Verdict

The evaluated outputs are useful, but not uniformly excellent. The Codex artifacts are good to excellent and usually give the next operator concrete mutation commands, verification commands, stop gates, and enough expected proof to proceed batch by batch. The Claude artifacts preserve the important facts and route correctly, but they are materially less ergonomic: both use lettered batch labels instead of the explicit Batch 0/1/2 checklist shape, and neither consistently attaches expected proof or artifacts to each batch.

This is not a skill-contract failure: both mirrored `update-packages` contracts already require a batch execution checklist with mutation command/edit, verification command, expected proof/artifact, and stop gate. The remaining gap is mostly benchmark-rubric calibration. The deterministic report correctly records `workflow-actionability` at 0.0% for Claude, but the aggregate Claude quality score still appears as 95.2%, which overstates operator readiness.

## Score Table

| Reviewer | Runner | Run index | Score | Grade band | Notes |
|---|---|---:|---:|---|---|
| Codex agent-review | Claude | 0 | 78 | usable | Good fixture facts, age-gate evidence, pnpm selection, and broad risk handling. Weaker because batches are A/B/C rather than Batch 0/1/2, expected proof is mostly separated into generic verification, and broad compatibility routes to bare `/migrate` instead of target-specific migrate commands. |
| Codex agent-review | Claude | 1 | 76 | usable | Preserves age-gate and skipped-version facts, but the execution sequence is less clean: pnpm migration proof is not attached per batch, React and Vitest checks include broad claims beyond the fixture, and stop routes are generic. |
| Codex agent-review | Codex | 0 | 95 | excellent | Strong plan with explicit Batch 0 through Batch 3, mutation commands, verification commands, expected proof, focused smoke checks, and target-specific `$migrate` routes. |
| Codex agent-review | Codex | 1 | 94 | excellent | Clear retained evidence and safe batch flow. Slightly weaker than run 0 because some expected proof is implied through verification text rather than consistently first-class per batch. |
| Codex agent-review | Codex | 2 | 88 | good | Safe and complete enough, with correct version evidence and routes. Less ergonomic because Batch 0 lacks an explicit expected-proof line, and the Vitest `--passWithNoTests` note adds a version-support caveat a next operator must verify. |

**Median subjective score:** 88
**Score range:** 76-95

## Common Strengths

- Correctly selected age-eligible versions: `pnpm@10.11.0`, `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4`.
- Correctly skipped fresh versions inside the 8-day safety window, including `pnpm@10.22.0`, `react@19.3.0`, `zod@4.1.12`, and `vitest@4.0.0`.
- Avoided unqualified `pnpm@latest` and retained publish-time proof for the selected package-manager pin.
- Kept npm and pnpm age-gate ownership clear with `min-release-age=8`, `minimum-release-age=11520`, and `minimumReleaseAge: 11520`.
- Preserved runner-native next routing: `/run` for Claude and `$run` for Codex.

## Common Weaknesses

- Claude evaluated outputs do not satisfy the current best ergonomic shape for this skill: explicit Batch 0/1/2 checklist sections with mutation, verification, expected proof/artifact, and stop gate attached to each batch.
- Generic migrate routes reduce handoff quality. The best outputs route to `$migrate react`, `$migrate vitest`, `$migrate pnpm`, or equivalent target-specific routes.
- The deterministic aggregate quality score is misleading for Claude. `workflow-actionability` failed at 0.0%, but aggregate quality still reported 95.2%, hiding a meaningful operator-readiness issue.
- Some output text makes plausible but unsupported compatibility claims beyond fixture evidence, especially around Vitest/React details. These do not break the artifact, but they should be framed as checks to perform rather than facts already known from the fixture.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| Missing per-batch expected-proof structure can still appear near-perfect in aggregate quality. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` quality evaluator for `update-packages` | Make `workflow-actionability` a threshold or critical quality criterion for `update-packages`, or otherwise cap run-level quality when it fails. Keep the expected pattern focused on explicit Batch 0/1/2-style sections with mutation command/edit, verification command, expected proof/artifact, and a stop gate. | Add focused layer1 coverage using the retained Claude run-000/run-001 shapes as negative quality examples and retained Codex run-000/run-001 shapes as positive examples; run `pnpm --dir tests exec vitest run --project layer1 bench-setups` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages benchmark actionability threshold` |
| Generic migrate routing weakens next-route ergonomics for major-upgrade failures. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` major-upgrade risk and next-route quality criteria for `update-packages` | Give full quality credit only when broad compatibility stop routes name the target package or tool, such as `/migrate react`, `/migrate vitest`, `$migrate react`, `$migrate vitest`, or `$migrate pnpm`; reduce quality for bare `/migrate` or `$migrate` when a target is known. | Add runner-specific layer1 examples that accept target-specific migrate routes and lower quality for bare migrate routes in `update-packages` artifacts; run `pnpm --dir tests exec vitest run --project layer1 bench-setups`. | `$targeted-skill-builder update-packages benchmark actionability threshold` |
| Plausible compatibility details can read as facts even when the fixture only supports them as checks to perform. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` no-overreach or domain-specificity quality criteria for `update-packages` | Require generated plans to distinguish retained fixture facts from compatibility checks. For example, React renderer presence and Vitest config/API changes should be phrased as "inspect/check if present" unless the fixture contains those files. | Add focused layer1 retained-artifact cases that reduce quality when outputs assert unobserved framework/config facts as known; run `pnpm --dir tests exec vitest run --project layer1 bench-setups`. | `$targeted-skill-builder update-packages benchmark actionability threshold` |

## Deterministic-Rubric Notes

The hard assertions are doing their job: all evaluated outputs are compliant enough to pass. The quality rubric also detects the primary Claude weakness through `workflow-actionability`, but the weighting makes the aggregate score too optimistic. Because the issue is visible in a quality criterion but muted in the headline score, the right follow-up is rubric calibration rather than target-skill contract rewriting.

## Next

**Next work:** tighten the `update-packages` benchmark quality rubric so missing batch actionability and generic migrate routes materially lower output-quality results.

**Recommended next command:** `$targeted-skill-builder update-packages benchmark actionability threshold`
