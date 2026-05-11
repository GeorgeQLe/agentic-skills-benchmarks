import type { Assertion } from "../../harness/types.js";

export function assertNextCommand(content: string): Assertion {
  return {
    description: "Output includes next command handoff",
    pass: /next command:/i.test(content),
  };
}

export function assertRecommendedRoute(content: string, command: string): Assertion {
  return {
    description: `Output recommends ${command}`,
    pass: content.includes(command),
  };
}
