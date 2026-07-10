import type { BenchAgent } from "../../harness/bench-types.js";
import type { Assertion } from "../../harness/types.js";

const nextRouteLabel = String.raw`(?:(?:recommended\s+)?next\s+(?:command|skill)(?:\s+line)?|next\s+work)`;
const optionalStrongMarker = String.raw`(?:\*\*|__)?`;
const nextRouteLabelPattern = String.raw`${optionalStrongMarker}${nextRouteLabel}\b${optionalStrongMarker}`;
const nextRoutePrefix = String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?${nextRouteLabelPattern}`;

export const nextCommandHandoffPattern = new RegExp(
  String.raw`${nextRoutePrefix}\s*:?\s*(?:\n|\x60|\$|\/|\S)`,
  "i",
);

/**
 * Runner skill-command prefix.
 *
 * Convention:
 * - Claude: `/skill` (slash commands)
 * - Codex: `$skill` (dollar commands)
 * - Grok: `/skill` — same as Claude, because Grok discovers Claude-compat
 *   skills and exposes them as slash commands
 */
export type SkillCommandPrefix = "/" | "$";

export function skillCommandPrefix(agent: BenchAgent): SkillCommandPrefix {
  return agent === "codex" ? "$" : "/";
}

/**
 * Rewrite a runner-native skill route for the given agent.
 * Non skill-prefixed commands (shell paths, plain prose) are returned unchanged.
 */
export function skillCommandForAgent(agent: BenchAgent, command: string): string {
  if (!/^[/$]/.test(command)) return command;
  return `${skillCommandPrefix(agent)}${command.slice(1)}`;
}

/**
 * Claude-slash / Grok-slash / Codex-dollar map for a skill command.
 * Accepts `"ship"`, `"/ship"`, or `"$ship"` (plus trailing args).
 * Shell paths and other non-skill commands are shared as-is for every agent.
 */
export function recommendedRoutesFor(command: string): Record<BenchAgent, string> {
  if (/^[/$]/.test(command)) {
    const bare = command.slice(1);
    return { claude: `/${bare}`, grok: `/${bare}`, codex: `$${bare}` };
  }

  // Shell / path commands must not gain skill prefixes.
  const firstToken = command.split(/\s+/, 1)[0] ?? command;
  if (
    firstToken.includes("/") ||
    /^(?:node|pnpm|npm|npx|yarn|bun|git|python|python3)\b/.test(command)
  ) {
    return { claude: command, grok: command, codex: command };
  }

  // Bare skill name (+ optional args): "ship", "exec", "project-fleet --status"
  return {
    claude: `/${command}`,
    grok: `/${command}`,
    codex: `$${command}`,
  };
}

/**
 * Quality rubrics accept either runner spelling of a skill command.
 * Non skill-prefixed commands yield a single-entry list.
 */
export function runnerRouteVariants(command: string): string[] {
  if (!/^[/$]/.test(command)) return [command];
  const bare = command.slice(1);
  return [`/${bare}`, `$${bare}`];
}

/**
 * Resolve the expected next route for an agent from a partial map.
 *
 * Lookup order:
 * 1. explicit `routes[agent]`
 * 2. for Grok, Claude's slash route (shared convention) when present
 * 3. shared `fallback` (literal `recommendedRoute` used by all runners)
 */
export function resolveRecommendedRoute(
  routes: Partial<Record<BenchAgent, string>> | undefined,
  agent: BenchAgent | undefined,
  fallback?: string,
): string | undefined {
  if (agent && routes?.[agent]) {
    return routes[agent];
  }
  if (agent === "grok" && routes?.claude) {
    return routes.claude;
  }
  return fallback;
}

/** Alternate runner spelling for a skill command (`/x` ↔ `$x`). */
export function alternateSkillCommand(command: string): string | undefined {
  if (command.startsWith("/")) return `$${command.slice(1)}`;
  if (command.startsWith("$")) return `/${command.slice(1)}`;
  return undefined;
}

export function assertNextCommand(content: string): Assertion {
  return {
    description: "Output includes next command handoff",
    pass: nextCommandHandoffPattern.test(content),
  };
}

export function assertRecommendedRoute(content: string, command: string): Assertion {
  // Anchor to the next-command handoff line so a route like `/ship` is not
  // spuriously satisfied by an unrelated substring (e.g. `/ship-end`).
  return {
    description: `Output recommends ${command}`,
    pass: recommendedExactNextRoutePattern(command).test(content),
  };
}

export function assertRecommendedNextRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends ${command}`,
    pass: recommendedNextRoutePattern(command).test(content),
  };
}

export function assertRecommendedExactNextRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends exactly ${command}`,
    pass: recommendedExactNextRoutePattern(command).test(content),
  };
}

export function recommendedNextRoutePattern(command: string): RegExp {
  return new RegExp(
    String.raw`${nextRoutePrefix}[\s\S]{0,300}${escapeRegExp(command)}`,
    "i",
  );
}

export function recommendedExactNextRoutePattern(command: string): RegExp {
  return new RegExp(
    String.raw`${nextRoutePrefix}\s*:?\s*${optionalStrongMarker}\s*(?:\x60{1,3}\s*)?${escapeRegExp(command)}(?:\s*\x60{1,3})?\s*(?:\r?\n|$)`,
    "i",
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
