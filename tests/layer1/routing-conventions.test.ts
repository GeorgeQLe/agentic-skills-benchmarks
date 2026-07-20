import { describe, expect, it } from "vitest";
import {
  alternateSkillCommand,
  recommendedRoutesFor,
  resolveRecommendedRoute,
  runnerRouteVariants,
  skillCommandForAgent,
  skillCommandPrefix,
} from "../layer4/setup-helpers/routing.js";

describe("runner skill-command conventions", () => {
  it("uses slash for Claude and dollar for Codex", () => {
    expect(skillCommandPrefix("claude")).toBe("/");
    expect(skillCommandPrefix("codex")).toBe("$");
  });

  it("rewrites skill routes per agent and leaves shell/plain routes alone", () => {
    expect(skillCommandForAgent("claude", "$ship")).toBe("/ship");
    expect(skillCommandForAgent("codex", "/ship")).toBe("$ship");
  });

  it("builds the full Claude/Codex recommendedRoutes map", () => {
    expect(recommendedRoutesFor("ship")).toEqual({
      claude: "/ship",
      codex: "$ship",
    });
    expect(recommendedRoutesFor("/exec")).toEqual({
      claude: "/exec",
      codex: "$exec",
    });
    expect(recommendedRoutesFor("$targeted-skill-builder run gate")).toEqual({
      claude: "/targeted-skill-builder run gate",
      codex: "$targeted-skill-builder run gate",
    });
    expect(recommendedRoutesFor("node scripts/audit.mjs")).toEqual({
      claude: "node scripts/audit.mjs",
      codex: "node scripts/audit.mjs",
    });
  });

  it("lists both runner spellings for quality rubrics", () => {
    expect(runnerRouteVariants("/ship")).toEqual(["/ship", "$ship"]);
    expect(runnerRouteVariants("node scripts/x.mjs")).toEqual(["node scripts/x.mjs"]);
  });

  it("resolves explicit runner routes and shared fallbacks", () => {
    const routes = { claude: "/ship", codex: "$ship" } as const;
    expect(resolveRecommendedRoute(routes, "claude")).toBe("/ship");
    expect(resolveRecommendedRoute(routes, "codex")).toBe("$ship");
    expect(resolveRecommendedRoute(undefined, "codex", "$ship")).toBe("$ship");
  });

  it("flips slash and dollar spellings for alternate-runner checks", () => {
    expect(alternateSkillCommand("/exec")).toBe("$exec");
    expect(alternateSkillCommand("$exec")).toBe("/exec");
    expect(alternateSkillCommand("none")).toBeUndefined();
  });
});
