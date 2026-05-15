import type { Assertion } from "../../harness/types.js";

const nextRouteLabel = String.raw`(?:(?:recommended\s+)?next\s+(?:command|skill)(?:\s+line)?|next\s+work)`;
const optionalStrongMarker = String.raw`(?:\*\*|__)?`;
const nextRouteLabelPattern = String.raw`${optionalStrongMarker}${nextRouteLabel}\b${optionalStrongMarker}`;
const nextRoutePrefix = String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?${nextRouteLabelPattern}`;

export const nextCommandHandoffPattern = new RegExp(
  String.raw`${nextRoutePrefix}\s*:?\s*(?:\n|\x60|\$|\/|\S)`,
  "i",
);

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
