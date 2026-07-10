# Lessons

## 2026-07-04 — Do not broaden model bans by family inference

When a user bans a specific benchmark model, enforce exactly that named model
unless they explicitly ask for a broader model family ban. In this session,
`fable-5` was banned from the live dashboard, while `gpt-5` and `gpt-5-codex`
remain valid benchmark targets.

Correction enforcement: `tests/layer1/dashboard.test.ts` now proves
`selectModelTargets("fable-5")` fails with a ban message while existing GPT-5
selection coverage remains valid.

## 2026-07-10 — Reuse authoritative provider telemetry

- Reuse authoritative provider telemetry already normalized by the owning app;
  do not manually transcribe dashboard percentages into automation inputs.
