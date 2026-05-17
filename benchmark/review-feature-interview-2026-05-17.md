# Agent Review: `feature-interview` Benchmark Outputs 2026-05-17

## Source Evidence

- Curated benchmark report: `benchmark/test-feature-interview-2026-05-17.md`
- Claude run directory: `tests/benchmarks/runs/feature-interview-claude-e5b18930`
- Codex run directory: `tests/benchmarks/runs/feature-interview-codex-1ff31029`
- Reviewed evaluated artifacts:
  - Claude run 0: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 0: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 1: `specs/benchmark-reporting-feature-interview.md`
  - Codex run 2: `specs/benchmark-reporting-feature-interview.md`
- Excluded from subjective scoring: Claude runs 1 and 2, because both were infrastructure-blocked by `agent runner budget exceeded`.

## Deterministic Benchmark Context

| Agent | Session | Evaluated runs | Hard assertion pass rate | Infrastructure blocks | Deterministic quality | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Claude | `feature-interview-claude-e5b18930` | 1 | 100.0% | 2 | 92.9% | $0.75 |
| Codex | `feature-interview-codex-1ff31029` | 3 | 100.0% | 0 | 97.6% | $0.75 |

The deterministic rerun confirms the route-alignment fix: all evaluated artifacts now route to roadmap sequencing and avoid direct `spec-interview`. The only recurring deterministic quality issue is the `file-reference` criterion, which failed in Claude run 0 and Codex run 0.

## Subjective Review Verdict

Overall output quality is strong. Codex produced consistently excellent artifacts that are detailed, evidence-linked, and immediately usable as roadmap input. Claude produced a good artifact from the only evaluated run, but it was weaker on traceability and included one unsupported contextual claim about the installed skill ecosystem.

Median subjective score: **92.5/100**

Range: **84-96**

| Agent | Run | Score | Grade | Subjective verdict |
| --- | ---: | ---: | --- | --- |
| Claude | 0 | 84 | Good | Correct decision and risk framing, but weaker evidence traceability and one unsupported skill-list claim. |
| Codex | 0 | 91 | Excellent | Thorough and useful feature interview with clear assumptions and decision; slightly overlong and missed the explicit retained artifact path. |
| Codex | 1 | 96 | Excellent | Best output: concise enough, evidence-disciplined, and highly actionable for roadmap planning. |
| Codex | 2 | 94 | Excellent | Strong feature framing with useful implementation gotchas and route discipline; minor verbosity remains. |

## Strengths

- All evaluated outputs made the correct planning decision: route the confirmed planning destination to roadmap sequencing rather than direct `spec-interview`.
- The better outputs clearly separated source evidence, assumptions, human intent, agent interpretation, risks, and next command.
- Codex runs 1 and 2 translated the small idea into useful implementation boundaries: coverage state taxonomy, blocked-reason handling, report rendering, source-of-truth concerns, and backwards-compatibility risk.
- None of the evaluated outputs treated an infrastructure block as a skill failure.

## Weaknesses

- Retained artifact traceability is not consistent. Claude run 0 and Codex run 0 did not satisfy the deterministic `file-reference` quality criterion for the expected generated path.
- Claude run 0 cited broad "available skill list" context that was not present in the minimal fixture evidence. The artifact still labeled assumptions well enough to be useful, but this weakens evidence discipline.
- Some Codex output is heavier than the tiny fixture requires. The extra structure is mostly useful, but a future benchmark could reward a tighter evidence brief.

## Remediation

| Finding | Classification | Owner | Proposed change | Validation | Route |
| --- | --- | --- | --- | --- | --- |
| Generated artifacts do not always name their retained file path, causing deterministic `file-reference` failures and reducing operator traceability. | Narrow skill-output quality gap with benchmark visibility impact. | `feature-interview` contract and benchmark setup. | Add a small retained-artifact traceability requirement to the `feature-interview` benchmark-facing path: the generated artifact should include its own path or an explicit "Artifact" line when the prompt names a required output file. | Focused layer1 setup/rubric coverage, `pnpm verify --skill feature-interview`, one-run Codex smoke benchmark, then full `$benchmark-test-skill feature-interview` rerun if changed. | `$targeted-skill-builder feature-interview benchmark artifact path evidence` |
| One Claude artifact referenced installed/session skill-list context instead of only fixture-local evidence. | Runner output evidence-discipline weakness; not yet a verified skill contract defect. | Benchmark rubric if it recurs. | Keep current note as review evidence. Add a rubric guard only if future runs repeat non-fixture evidence claims. | Recheck during the next full benchmark rerun. | Covered by the same targeted follow-up only if the path-evidence edit touches the fixture prompt. |

## Next Work

The route-alignment benchmark failure is resolved. The next useful improvement is narrower: make retained benchmark artifacts consistently cite their generated output path so deterministic quality and human review agree on traceability.

**Recommended next command:** `$targeted-skill-builder feature-interview benchmark artifact path evidence`
