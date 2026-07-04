import type { BenchAgent } from "../bench-types.js";

/**
 * A single (CLI, model) target that the dashboard benchmarks. `cli` selects the
 * agent runner (claude / codex); `model` is passed through as `--model` so the
 * same suite can be graded across Claude and GPT model tiers.
 */
export interface ModelTarget {
  /** Stable key used for state maps and CLI selection (`--models`). */
  id: string;
  /** Human label shown in the dashboard. */
  label: string;
  /** Which agent runner drives this target. */
  cli: BenchAgent;
  /** Model id/alias passed to the CLI's `--model` flag. */
  model: string;
}

/**
 * Default competitor field. Model aliases (`opus`, `sonnet`, `haiku`) resolve to
 * the latest snapshot for each Claude tier; codex model ids follow the OpenAI
 * naming the `codex` CLI accepts. Override any of this with `--models` or by
 * passing a custom matrix — nothing here is load-bearing beyond being sensible
 * defaults.
 */
export const DEFAULT_MODEL_MATRIX: ModelTarget[] = [
  { id: "claude-opus", label: "Claude Opus", cli: "claude", model: "opus" },
  { id: "claude-sonnet", label: "Claude Sonnet", cli: "claude", model: "sonnet" },
  { id: "claude-haiku", label: "Claude Haiku", cli: "claude", model: "haiku" },
  { id: "gpt-5-codex", label: "GPT-5 Codex", cli: "codex", model: "gpt-5-codex" },
  { id: "gpt-5", label: "GPT-5", cli: "codex", model: "gpt-5" },
];

/**
 * Resolve a comma-separated `--models` selection against the matrix. Accepts
 * target ids (`claude-opus`) case-insensitively. Unknown ids throw with the
 * valid set so a typo fails loudly instead of silently benchmarking nothing.
 */
export function selectModelTargets(
  selection: string | undefined,
  matrix: ModelTarget[] = DEFAULT_MODEL_MATRIX,
): ModelTarget[] {
  if (!selection || selection.trim() === "" || selection.trim() === "all") {
    return matrix;
  }
  const wanted = selection
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const byId = new Map(matrix.map((target) => [target.id.toLowerCase(), target]));
  const resolved: ModelTarget[] = [];
  for (const id of wanted) {
    const target = byId.get(id);
    if (!target) {
      const valid = matrix.map((t) => t.id).join(", ");
      throw new Error(`unknown model target "${id}" (valid: ${valid})`);
    }
    resolved.push(target);
  }
  return resolved;
}
