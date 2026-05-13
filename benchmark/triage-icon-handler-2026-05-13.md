# Triage: icon-handler Benchmark Failure — 2026-05-13

## Target

- Scope: `$benchmark-test-skill icon-handler` failure from 2026-05-13.
- Repository: `/Users/georgele/projects/tools/agentic-skills`
- Skill under test: `global/claude/icon-handler/SKILL.md` and `global/codex/icon-handler/SKILL.md`
- Benchmark setup: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Persisted run evidence:
  - `benchmark/test-icon-handler-2026-05-13.md`
  - `tests/benchmarks/runs/icon-handler-claude-7d05699b/`
  - `tests/benchmarks/runs/icon-handler-codex-e4f1a34a/`

## User-Identified Issue

`icon-handler` benchmark failed and needs focused triage before remediation.

## Verification Verdict

Verified.

The benchmark report shows Claude passed 1/3 evaluated hard-assertion runs while Codex passed 3/3, with no infrastructure-blocked runs recorded. Claude failed runs #0 and #1 on:

- `Agent command exited successfully`
- `icon-audit.md created in project root`

The persisted failed Claude run JSON records the same stdout in both failed runs:

```text
API Error: 400 Could not process image
```

The failed runs did not produce `icon-audit.md`, so all downstream quality criteria also failed. Claude run #2 did pass by writing `icon-audit.md`, and all Codex runs passed. The passing runs treated `calc-mascot-icon.png` as a fixture placeholder, used local file inspection, identified stale/missing Next App Router icon surfaces, preserved the audit-first approval gate, and recommended the expected next route.

## Timeline

1. `$benchmark-test-skill icon-handler` resolved `icon-handler` as a custom benchmark target in `tests/layer4/setups/tier23-global-workflows.setup.ts`.
2. `pnpm verify --skill icon-handler` passed layer1; layer2 skipped because no target-specific layer2 tests matched.
3. The benchmark fixture created a Next App Router project with root `calc-mascot-icon.png`, `src/app/favicon.ico`, and `src/app/icon.png` as ASCII placeholder files.
4. Claude runs #0 and #1 exited before producing the audit artifact with `API Error: 400 Could not process image`.
5. Claude run #2 and all Codex runs completed by auditing the placeholder files as invalid/stale local files and writing `icon-audit.md`.
6. The final benchmark report routed to this triage because Claude hard assertions failed.

## Root Cause

The responsible issue is a benchmark fixture robustness gap, not an `icon-handler` skill contract gap.

The fixture names the source asset `calc-mascot-icon.png` but writes ASCII text (`fixture-png-placeholder`) into that file. For `icon-handler`, the `.png` filename is semantically important because the skill searches root icon-like image filenames. But using invalid image bytes under a `.png` name can trigger runner/tooling behavior that attempts to process the file as an image before the agent can inspect it with `file`, `sips`, or equivalent commands. In the failed Claude runs, that produced an API-level image processing error and prevented the skill workflow from running.

The mirrored skill contracts are adequate for the intended behavior:

- Both Claude and Codex contracts require read-only audit by default.
- Both require source asset format/dimension inspection using local tools.
- Both require reporting missing/stale icon surfaces, proposed writes, verification commands, and approval before modification.
- Both preserve runner-specific next routes (`/icon-handler` for Claude, `$icon-handler` for Codex).

The benchmark setup recently fixed runner-specific route assertions, and the current failure is different: fixture bytes are not robust for a benchmark runner that may treat `.png` files as image inputs.

## Responsible Contract Gap

Benchmark harness fixture, specifically `tests/layer4/setups/tier23-global-workflows.setup.ts`.

No change is justified in:

- `global/claude/icon-handler/SKILL.md`
- `global/codex/icon-handler/SKILL.md`

## Recommended Fix

Update the `icon-handler` benchmark fixture so the root source asset is a small valid PNG rather than ASCII placeholder text.

Concrete target:

- File: `tests/layer4/setups/tier23-global-workflows.setup.ts`
- Section: `skill: "icon-handler"` fixture definition
- Replace:

```ts
"calc-mascot-icon.png": "fixture-png-placeholder\n",
```

with valid PNG fixture content written in a way the harness can persist as binary-safe data. If the fixture file map is text-only, use a small valid base64-decoded PNG helper or extend fixture creation to support binary fixture entries. Keep `src/app/favicon.ico` and `src/app/icon.png` as stale placeholders if the benchmark still needs stale-surface evidence, but make the canonical source asset decodable.

Add layer1 regression coverage that proves the icon-handler fixture source asset is binary-valid or at least PNG-signature valid before benchmark execution. A focused assertion should fail if `calc-mascot-icon.png` is reintroduced as plain ASCII placeholder content.

Suggested behavior wording for the fixture prompt:

> Audit the Next App Router fixture using local file inspection tools. Treat stale existing icon files as stale if their format checks fail; do not call external image generation or image-analysis services.

That wording is optional; the durable fix is valid source bytes. The prompt alone would not prevent pre-agent image processing failures.

## Validation Plan

Run:

```bash
pnpm --dir tests test:layer1 -- bench-setups bench-quality
pnpm --dir tests bench:coverage
pnpm --dir tests verify --skill icon-handler
pnpm --dir tests bench --skill icon-handler --agent claude --runs 1 --chunk-size 1 --pause 0
git diff --check
```

The smoke benchmark should produce a Claude run with:

- `Agent command exited successfully`
- `icon-audit.md created in project root`
- `Output recommends /icon-handler`
- no `API Error: 400 Could not process image`

## Confidence And Evidence Gaps

Confidence: high.

Evidence is direct from persisted benchmark JSON and the current fixture definition. The main unverified implementation detail is whether the fixture-writing helper currently supports binary files directly. If it does not, the remediation should add a narrowly scoped binary-fixture path or generate the tiny PNG inside the setup helper before running agents.

No broad `$analyze-sessions` pass is needed. This is a concrete benchmark fixture failure, not a recurrence question.

Recommended next skill: `$targeted-skill-builder icon-handler benchmark valid source asset`
