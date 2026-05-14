# Benchmark Agent Review: content-programming

Date: 2026-05-14

## Source Evidence

- Curated benchmark report: `benchmark/test-content-programming-2026-05-14.md`
- Claude run directory: `tests/benchmarks/runs/content-programming-claude-9f0c62c8/`
- Codex run directory: `tests/benchmarks/runs/content-programming-codex-ff03c35c/`
- Reviewed artifacts: `pack-benchmark-output.md` snapshots retained in `run-000.json`, `run-001.json`, and `run-002.json` for both agents.
- Fixture facts: `pack-input.md` identifies `creator-foundation`, `content-programming`, focus `creator content programming calendar`, audience wants practical build notes, and cadence target weekly. `fixtures/local-evidence.md` says the fixture is local and deterministic and avoids external services.

## Deterministic Context

| Runner | Run Directory | Hard Assertions | Deterministic Quality | Infrastructure Blocked |
| --- | --- | ---: | ---: | ---: |
| Claude | `tests/benchmarks/runs/content-programming-claude-9f0c62c8/` | 3/3 | 96.7% | 0 |
| Codex | `tests/benchmarks/runs/content-programming-codex-ff03c35c/` | 3/3 | 97.5% | 0 |

The deterministic scores are context only. This review judges the retained generated artifacts for usefulness to a next operator.

## Output-Quality Verdict

The reviewed outputs are good overall. All six artifacts are fixture-grounded, avoid invented external evidence, respect the local-only constraint, include realistic risks, and route to the correct runner-specific `series-spec` successor. They are usable as benchmark smoke outputs and would let a next operator continue without redoing basic fixture discovery.

They are not excellent full `content-programming` outputs because the benchmark prompt only asks for a creator content programming calendar. The retained artifacts therefore omit large parts of the actual skill contract: durable pillars, recurring formats mapped to roles, portfolio balance, measurement plan, cleanup/refactor plan, and next series candidates. That is primarily a benchmark setup coverage gap, not a failure of the outputs against the narrow prompt.

## Agent-Review Scores

| Reviewer | Runner | Run | Score | Grade Band | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Codex reviewer | Claude | 0 | 86 | Good | Clear four-week rotation with strong fixture citations and risks; platform-agnostic and light on measurement. |
| Codex reviewer | Claude | 1 | 87 | Good | Best Claude artifact for handoff clarity; still template-like and not a full channel programming strategy. |
| Codex reviewer | Claude | 2 | 84 | Good | Concise and honest about missing persona/backlog evidence; less concrete about validation and audience jobs. |
| Codex reviewer | Codex | 0 | 88 | Good | Strong audience-job framing and evidence ties; risks are useful but measurement is deferred rather than scoped. |
| Codex reviewer | Codex | 1 | 89 | Good | Most complete evidence section and clear final handoff; still lacks full contract dimensions. |
| Codex reviewer | Codex | 2 | 90 | Excellent | Strongest output: thesis, audience jobs, evidence anchors, and explicit scope limits are all clear. |

Median subjective score: 87.5. Score range: 84-90.

## Common Strengths

- Every output names the `creator-foundation` pack and `content-programming` skill.
- Every output cites concrete local fixture facts from `pack-input.md` and `fixtures/local-evidence.md`.
- The calendars are plausible for weekly practical build notes and avoid unsupported platform or audience metrics.
- Risks and assumptions are generally useful, especially around missing creator niche, platform, backlog, analytics, and external validation.
- Next-route ergonomics are correct for the runner mode: Claude outputs use `/series-spec`, and Codex outputs use `$series-spec`.

## Common Weaknesses

- The artifacts are mostly four-week content calendars, not full programming strategies.
- Measurement is absent or deferred instead of proposing local, fixture-appropriate checks such as cadence completion, artifact readiness, or topic-to-evidence coverage.
- Portfolio balance, cleanup/refactor planning, and next series candidates are not meaningfully exercised.
- Several outputs are intentionally generic because the fixture lacks channel slug, creator niche, existing content inventory, and performance evidence.

## Remediation Handoff

| Finding | Classification | Owner Target | Proposed Change | Validation Check | Route |
| --- | --- | --- | --- | --- | --- |
| The benchmark passes useful smoke outputs but does not exercise the full `content-programming` skill contract. | Harness/setup issue | `tests/layer4/setups/packs/pack-workflows.setup.ts` and related layer1 benchmark setup coverage for `content-programming` | Add a `content-programming`-specific fixture or extension that asks for pillars, formats, cadence, portfolio balance, measurement, cleanup/refactor plan, and next series candidates, while preserving runner-specific `/series-spec` and `$series-spec` routing. | Add/extend layer1 setup tests proving the prompt and rubric require full contract dimensions, then run `pnpm --dir tests exec vitest run --project layer1 bench-setups` and `pnpm --dir tests verify --skill content-programming`. | `$targeted-skill-builder content-programming full-contract benchmark coverage` |
| Deterministic quality does not distinguish calendar-only output from a full programming strategy. | Benchmark rubric gap | `tests/layer4/setups/packs/pack-workflows.setup.ts` quality criteria for the `content-programming` route | Add non-critical scoring criteria for measurement plan, portfolio balance, cleanup/refactor plan, and next series candidate specificity once the richer fixture exists. | Add layer1 quality tests showing a calendar-only artifact scores lower than a full programming strategy without failing unrelated pack smoke skills. | `$targeted-skill-builder content-programming full-contract benchmark coverage` |

## Deterministic-Rubric Notes

The deterministic rubric was not misleading for the narrow prompt: all outputs did satisfy the requested calendar, fixture evidence, risk, and next-route checks. The gap is coverage breadth. The benchmark should retain this smoke value but add a richer `content-programming` fixture if the report is meant to support domain-quality claims.

## Next Work

Add full-contract benchmark coverage for `content-programming` so future deterministic and subjective reviews can evaluate the skill's actual programming-strategy obligations, not only the generic pack calendar smoke path.

Recommended next command: `$targeted-skill-builder content-programming full-contract benchmark coverage`
