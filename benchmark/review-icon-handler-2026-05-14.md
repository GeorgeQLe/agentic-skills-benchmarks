# Benchmark Agent Review: icon-handler

Date: 2026-05-14
Run label: latest post image-error classification rerun
Target skill: `icon-handler`
Active workflow: `$benchmark-agent-review icon-handler`

## Source Evidence

- Benchmark report: `benchmark/test-icon-handler-2026-05-14.md`
- Claude run directory: `tests/benchmarks/runs/icon-handler-claude-bccbdf8a/`
- Codex run directory: `tests/benchmarks/runs/icon-handler-codex-68b180e6/`
- Claude source report: `tests/benchmarks/runs/icon-handler-claude-bccbdf8a/report.json`
- Codex source report: `tests/benchmarks/runs/icon-handler-codex-68b180e6/report.json`
- Claude run files: `run-000.json`, `run-001.json`, `run-002.json`
- Codex run files: `run-000.json`, `run-001.json`, `run-002.json`
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Target skill contracts: `global/claude/icon-handler/SKILL.md`, `global/codex/icon-handler/SKILL.md`

## Benchmark Context

| Runner | Hard assertion pass rate | Deterministic quality score | Infrastructure-blocked runs | Retained artifact evidence |
| --- | ---: | ---: | ---: | --- |
| Claude | 3/3 (100.0%) | 84.1% | 0 | Full `icon-audit.md` artifact retained in each `run-*.json` |
| Codex | 3/3 (100.0%) | 84.8% | 0 | Full `icon-audit.md` artifact retained in each `run-*.json` |

The benchmark prompt asked each runner to audit a Next App Router fixture, write `icon-audit.md` before the final response, include framework, source asset, missing/stale icon surfaces, proposed fix, approval requirement, verification commands, and a final runner-specific icon-handler fix route. It also said build commands belong only under post-approval verification commands and prohibited file modification or external image-generation/image-analysis services.

The fixture facts were:

- `package.json` declares `next@15.5.15` and `build: next build`.
- `calc-mascot-icon.svg` is the root source asset.
- `src/app/layout.tsx` contains only `metadata = { title: 'Fixture' }`.
- `src/app/favicon.ico` is the text placeholder `stale-ico-placeholder`.
- `src/app/icon.png` is the text placeholder `old-icon-placeholder`.

## Output Verdict

Overall subjective verdict: good. All six retained outputs are useful audit artifacts, correctly preserve audit-only scope, identify the stale placeholder favicon/app icon files, include an approval gate, and end with the runner-specific fix command. None of the evaluated outputs invented external services, deployment systems, GitHub Actions, or unsupported repository state.

The strongest Codex outputs are close to excellent because they name the public install/touch surfaces expected by the skill contract, separate current audit checks from post-approval verification, and keep `$icon-handler fix calc-mascot-icon.svg` as the final route. Claude outputs are also good, but they are less consistent about the complete surface set and sometimes choose a narrower App Router-only manifest path.

The common quality gap is precision, not correctness. Several outputs under-specify exact generated sizes and conversion/tooling constraints, and the proposed manifest path varies between `src/app/manifest.ts`, `src/app/manifest.webmanifest`, `public/manifest.webmanifest`, and generic "manifest" language. That still leaves a next operator with useful direction, but it creates avoidable rediscovery before the approved fix.

## Agent-Review Scores

| Reviewer | Runner | Run index | Score | Grade band | Evidence basis | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Codex review | Claude | 0 | 84 | Good | full retained `icon-audit.md` | Correct audit and route; proposes a narrower surface set and says iOS falls back to downscaled `icon.png`, which is not established by fixture evidence |
| Codex review | Claude | 1 | 88 | Good | full retained `icon-audit.md` | Strong inventory, concrete stale-file evidence, correct route; validation remains a little generic and manifest location is App Router-only |
| Codex review | Claude | 2 | 86 | Good | full retained `icon-audit.md` | Concise and scoped with correct route; omits public `icon.png`, `app-icon.png`, and `apple-touch-icon.png` surfaces named by the skill contract |
| Codex review | Codex | 0 | 92 | Excellent | full retained `icon-audit.md` | Best surface coverage, approval gate, final route, and post-build evidence checks; could be more exact about target pixel sizes |
| Codex review | Codex | 1 | 90 | Excellent | full retained `icon-audit.md` | Good current-evidence and post-approval split; includes both runner routes but keeps the final Codex command correct |
| Codex review | Codex | 2 | 93 | Excellent | full retained `icon-audit.md` | Most complete actionable plan across stale files, public surfaces, manifest, metadata, local-tool inspection, and final route |

Median subjective score: 89.0
Score range: 84-93

## Common Strengths

- Every evaluated output selected the correct task: an audit-only Next App Router icon-surface report, not an immediate fix.
- Every output created `icon-audit.md`, identified the root SVG source asset, and treated the placeholder `favicon.ico` and `icon.png` files as stale or invalid.
- Every output preserved the approval boundary before overwriting binary icon assets or editing metadata/manifests.
- Every output placed build commands under verification rather than as the final next command.
- Every output ended with the correct runner-specific approval route, `/icon-handler fix calc-mascot-icon.svg` for Claude or `$icon-handler fix calc-mascot-icon.svg` for Codex.
- The Codex outputs consistently covered the broader public install/touch surfaces named in the skill contract.

## Common Weaknesses

- Manifest destination is inconsistent across outputs. Some recommend `src/app/manifest.ts`, some `src/app/manifest.webmanifest`, some `public/manifest.webmanifest`, and some leave the location open.
- Several outputs do not state exact intended dimensions or format expectations for generated assets, such as 512x512 app icon, 180x180 Apple icon, and multi-size favicon.
- Some outputs omit public install/touch surfaces that the `icon-handler` contract lists for Next App Router fixes.
- Validation commands often prove file magic bytes and build success, but only the strongest outputs also verify generated build artifacts and link references.
- Deterministic actionability scoring surfaced this gap directionally, but it does not distinguish "missing exact dimensions/manifest path" from other forms of weak actionability.

## Remediation

| Finding | Classification | Owner target | Proposed change | Validation check | Route |
| --- | --- | --- | --- | --- | --- |
| Audit outputs vary on the canonical manifest path for Next App Router, leaving the approved fix route with avoidable rediscovery | Target-skill contract | `global/claude/icon-handler/SKILL.md` and `global/codex/icon-handler/SKILL.md` | Add an explicit Next App Router manifest decision rule: prefer the existing project convention when present; otherwise choose one canonical default and require the audit to name that exact target path plus why it was chosen | `rg -n "manifest decision|canonical.*manifest|existing project convention" global/claude/icon-handler/SKILL.md global/codex/icon-handler/SKILL.md` plus `pnpm --dir tests verify --skill icon-handler` | `$targeted-skill-builder icon-handler Next App Router manifest path specificity` |
| Audit outputs do not consistently name exact generated asset sizes and format requirements before proposing writes | Target-skill contract | `global/claude/icon-handler/SKILL.md` and `global/codex/icon-handler/SKILL.md` | Tighten the audit report contract so proposed writes include target path, source asset, intended size, intended format, and conversion/tool prerequisite for each generated icon | `rg -n "target path.*size.*format|intended size|conversion tool" global/claude/icon-handler/SKILL.md global/codex/icon-handler/SKILL.md` plus focused layer1 contract coverage if added | `$targeted-skill-builder icon-handler audit output write-spec specificity` |
| Some Claude outputs omit public install/touch surfaces that the current Next App Router fix contract prefers | Benchmark rubric | `tests/layer4/setups/tier23-global-workflows.setup.ts` and `tests/layer4/setup-helpers/quality.ts` | Add an optional `icon-handler` quality criterion for public touch/install surface coverage so retained reviews and deterministic scores surface this exact omission | `pnpm --dir tests exec vitest run --project layer1 bench-setups bench-quality` | `$targeted-skill-builder icon-handler benchmark public surface coverage` |
| The generic deterministic `workflow-actionability` criterion is too broad to identify the specific icon-output gap | Benchmark rubric | `tests/layer4/setup-helpers/quality.ts` | Split or supplement actionability for icon-handler with target-path, format, size, and verification specificity checks | `pnpm --dir tests exec vitest run --project layer1 bench-quality` and a 1-run benchmark smoke for `icon-handler` | `$targeted-skill-builder icon-handler benchmark actionability specificity` |

## Deterministic-Rubric Notes

The deterministic benchmark result is directionally aligned with the subjective review: all outputs are passing and useful, while actionability is the lowest criterion. The rubric did not falsely pass a weak output as excellent. The only useful tightening is more diagnostic granularity for icon-specific actionability and public-surface coverage, so future reports point to the exact output-quality gap instead of a generic low actionability score.

## Next Work

Tighten the mirrored `icon-handler` skill contract so Next App Router audit reports must choose and justify a canonical manifest target path before the fix route.

Recommended next command: `$targeted-skill-builder icon-handler Next App Router manifest path specificity`
