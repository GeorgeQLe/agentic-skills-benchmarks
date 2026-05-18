# Benchmark Agent Review: update-packages - 2026-05-18

**Workflow:** `$benchmark-agent-review update-packages`
**Source benchmark report:** `benchmark/test-update-packages-2026-05-18.md`
**Reviewed run directories:**

- `tests/benchmarks/runs/update-packages-claude-a767ae3e/`
- `tests/benchmarks/runs/update-packages-codex-337a5d5e/`

## Benchmark Context

The current benchmark report points to Claude session `a767ae3e` and Codex session `337a5d5e`. Claude completed two evaluated runs and had one infrastructure block from `agent runner budget exceeded`; the blocked run is excluded from subjective scoring. Codex completed three evaluated runs.

| Agent | Hard assertion pass rate | Deterministic output-quality score | Infrastructure-blocked runs |
|---|---:|---:|---:|
| Claude | 100.0% (2/2) | 95.2% | 1 |
| Codex | 100.0% (3/3) | 100.0% | 0 |

The benchmark prompt asked each runner to create `package-update-plan.md` from `package.json`, `npm-view-times.json`, and `package-lock-note.md`, including pnpm migration, npm/pnpm age-gate config, eligible and skipped versions, React 18 to 19 and Vitest 1 to 3 risk handling, verification commands, and the runner-native next command.

## Agent-Review Verdict

The evaluated outputs range from usable to excellent. All five evaluated artifacts preserve the core fixture facts, avoid unqualified `pnpm@latest`, select age-eligible package versions, explain npm-to-pnpm migration, and route with the correct runner-native next command.

The Codex outputs are consistently good to excellent, with runs 0 and 1 giving the strongest per-batch operator checklist. The Claude outputs are usable but materially less ergonomic: they pass hard assertions, but the batch structure is lettered rather than explicit `Batch 0` / `Batch 1` / `Batch 2`, and they do not attach expected proof/artifact to each batch. The deterministic rubric partially surfaced this through `workflow-actionability` scoring 0.0% for Claude, but the aggregate Claude quality score still read as 95.2%, which is too generous for an output with missing actionability structure.

## Score Table

| Reviewer | Runner | Run index | Score | Grade band | Notes |
|---|---|---:|---:|---|---|
| Codex agent-review | Claude | 0 | 78 | usable | Correct facts and safe major-upgrade thinking, but weak execution ergonomics: lettered batches, no explicit per-batch expected proof, and broad `/migrate` stop route instead of target-specific migration routes. |
| Codex agent-review | Claude | 1 | 76 | usable | Good package and age-gate evidence, but actionability is uneven: Vitest is placed before React without enough rationale, expected proof is absent, and several compatibility claims are broader than the fixture proves. |
| Codex agent-review | Codex | 0 | 95 | excellent | Strong plan with explicit `Batch 0` through `Batch 3`, mutation commands, verification commands, expected proof, focused smoke checks, and target-specific `$migrate` stop routes. |
| Codex agent-review | Codex | 1 | 96 | excellent | Best overall artifact: clear retained evidence, explicit expected proof for package-manager migration, package-specific smoke checks, and precise stop gates. |
| Codex agent-review | Codex | 2 | 90 | excellent | Strong and safe plan; slightly weaker because Batch 0 proof is expressed as expected edits and verification rather than an explicit expected-proof checklist. |

**Median subjective score:** 90
**Score range:** 76-96

## Common Strengths

- Correctly selected age-eligible versions: `pnpm@10.11.0`, `react@19.2.0`, `zod@3.25.76`, and `vitest@3.2.4`.
- Correctly skipped fresh versions inside the 8-day safety window, including `pnpm@10.22.0`, `react@19.3.0`, `zod@4.1.12`, and `vitest@4.0.0`.
- Kept age-gate ownership clear for `min-release-age=8`, `minimum-release-age=11520`, and `minimumReleaseAge: 11520`.
- Included React and Vitest major-upgrade compatibility checks and smoke checks.
- Used runner-native next commands: `/run` for Claude and `$run` for Codex.

## Common Weaknesses

- Claude evaluated outputs lack explicit per-batch expected proof/artifact, despite the current mirrored skill contracts requiring it.
- The benchmark quality summary is misleadingly high for Claude: `workflow-actionability` scored 0.0%, but the aggregate score still showed 95.2%.
- Some stop routes are too broad. Claude run 0 says route to `/migrate` without the target package or framework, which is less ergonomic than `/migrate react`, `/migrate vitest`, or `/migrate pnpm`.
- One Claude output makes broader compatibility claims about Vitest 2/3 behavior and React 19 typing than the retained fixture proves. The claims are plausible, but the artifact does not distinguish fixture evidence from general migration knowledge.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
|---|---|---|---|---|---|
| `workflow-actionability` can score 0.0% while the aggregate output-quality score remains above 95%, masking a material operator-quality issue. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` `update-packages` quality evaluator | Make actionability a critical or threshold criterion for `update-packages`, or lower the run-level quality score enough that missing per-batch expected proof cannot report as excellent. Require explicit `Batch 0` / `Batch 1` / major-batch checklist structure with mutation command/edit, verification command, expected proof/artifact, and stop gate. | Add focused layer1 coverage that uses the retained Claude run-000/run-001 shapes as negatives for excellent quality and the retained Codex run-000/run-001 shapes as positives; run `pnpm --dir tests exec vitest run --project layer1 bench-setups` and `pnpm --dir tests verify --skill update-packages`. | `$targeted-skill-builder update-packages benchmark actionability threshold` |
| Some valid outputs route broad compatibility breakage to bare `/migrate` rather than a target-specific migration command. | benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` runner-specific next-route and major-upgrade risk criteria | Tighten the `update-packages` quality rubric so major-upgrade stop routes name the target, such as `/migrate react`, `/migrate vitest`, `$migrate react`, or `$migrate vitest`, instead of accepting only generic migrate language for high-quality output. | Add focused layer1 assertions that generic `/migrate` alone receives reduced quality while target-specific routes pass for both Claude and Codex spellings. | `$targeted-skill-builder update-packages benchmark actionability threshold` |

## Deterministic-Rubric Notes

The deterministic hard assertions were useful and all evaluated outputs were compliant enough to pass. The quality rubric needs calibration, not a hard benchmark failure: a run with 0.0% actionability should not be summarized as near-perfect output quality when the task is specifically to hand the next operator a dependency-update plan.

## Next

**Next work:** tighten the `update-packages` benchmark quality rubric so missing actionability structure and generic migration routes materially lower quality.

**Recommended next command:** `$targeted-skill-builder update-packages benchmark actionability threshold`
