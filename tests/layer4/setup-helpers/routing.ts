import type { Assertion } from "../../harness/types.js";

export function assertNextCommand(content: string): Assertion {
  return {
    description: "Output includes next command handoff",
    pass: /(?:^|\n)\s*(?:[-*]\s*)?(?:#{1,6}\s*)?(?:recommended\s+)?next command(?:\s+line)?\b\s*:?\s*(?:\n|`|\$)/i.test(content),
  };
}

export function assertRecommendedRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends ${command}`,
    pass: content.includes(command),
  };
}
