import type { Assertion } from "../../harness/types.js";

export const nextCommandHandoffPattern =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?(?:(?:recommended\s+)?next\s+(?:command|skill)(?:\s+line)?|next\s+work)\b\s*:?\s*(?:\n|`|\$|\/|\S)/i;

export function assertNextCommand(content: string): Assertion {
  return {
    description: "Output includes next command handoff",
    pass: nextCommandHandoffPattern.test(content),
  };
}

export function assertRecommendedRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends ${command}`,
    pass: content.includes(command),
  };
}

export function assertRecommendedNextRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends ${command}`,
    pass: recommendedNextRoutePattern(command).test(content),
  };
}

export function recommendedNextRoutePattern(command: string): RegExp {
  const nextRouteLabel = String.raw`(?:(?:recommended\s+)?next\s+(?:command|skill)(?:\s+line)?|next\s+work)`;
  return new RegExp(
    String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?${nextRouteLabel}\b[\s\S]{0,300}${escapeRegExp(command)}`,
    "i",
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
