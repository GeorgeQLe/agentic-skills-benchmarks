import type { BenchAgent } from "../bench-types.js";

/**
 * A single (CLI, model) target that the dashboard benchmarks. `cli` selects the
 * agent runner (claude / codex / grok); `model` is passed through to the CLI
 * (`--model` for claude/codex, `-m` for grok) so the same suite can be graded
 * across model tiers.
 */
export interface ModelTarget {
  /** Stable key used for state maps and CLI selection (`--models`). */
  id: string;
  /** Human label shown in the dashboard. */
  label: string;
  /** Which agent runner drives this target. */
  cli: BenchAgent;
  /** Model id/alias passed to the CLI's model flag. */
  model: string;
}

/**
 * Default competitor field. Model aliases (`opus`, `sonnet`, `haiku`) resolve to
 * the latest snapshot for each Claude tier; codex model ids follow the OpenAI
 * naming the `codex` CLI accepts; Grok uses the `grok` CLI model id (e.g.
 * `grok-4.5`). Fable 5 is intentionally banned from this benchmark because live
 * dashboard runs can consume a large quota quickly.
 */
export const DEFAULT_MODEL_MATRIX: ModelTarget[] = [
  { id: "claude-opus", label: "Claude Opus", cli: "claude", model: "opus" },
  { id: "claude-sonnet", label: "Claude Sonnet", cli: "claude", model: "sonnet" },
  { id: "claude-haiku", label: "Claude Haiku", cli: "claude", model: "haiku" },
  { id: "gpt-5-codex", label: "GPT-5 Codex", cli: "codex", model: "gpt-5-codex" },
  { id: "gpt-5", label: "GPT-5", cli: "codex", model: "gpt-5" },
  { id: "grok-4.5", label: "Grok 4.5", cli: "grok", model: "grok-4.5" },
];

const BANNED_MODEL_IDS = new Set(["fable-5"]);

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
    if (BANNED_MODEL_IDS.has(id)) {
      throw new Error(
        `model target "${id}" is banned for this dashboard benchmark; choose one of: ${
          matrix.map((t) => t.id).join(", ")
        }`,
      );
    }
    const target = byId.get(id);
    if (!target) {
      const valid = matrix.map((t) => t.id).join(", ");
      throw new Error(`unknown model target "${id}" (valid: ${valid})`);
    }
    resolved.push(target);
  }
  return resolved;
}
