import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveBenchSetup } from "../harness/bench-setups.js";
import { createTempProject } from "../harness/runner.js";
import type { RunResult } from "../harness/types.js";
import {
  alternateSkillCommand,
  recommendedRoutesFor,
  resolveRecommendedRoute,
  runnerRouteVariants,
  skillCommandForAgent,
  skillCommandPrefix,
} from "../layer4/setup-helpers/routing.js";

describe("runner skill-command conventions", () => {
  it("uses slash for Claude and Grok, dollar for Codex", () => {
    expect(skillCommandPrefix("claude")).toBe("/");
    expect(skillCommandPrefix("grok")).toBe("/");
    expect(skillCommandPrefix("codex")).toBe("$");
  });

  it("rewrites skill routes per agent and leaves shell/plain routes alone", () => {
    expect(skillCommandForAgent("claude", "$ship")).toBe("/ship");
    expect(skillCommandForAgent("grok", "$ship")).toBe("/ship");
    expect(skillCommandForAgent("codex", "/ship")).toBe("$ship");
    expect(skillCommandForAgent("grok", "node scripts/audit.mjs")).toBe("node scripts/audit.mjs");
  });

  it("builds the full Claude/Grok/Codex recommendedRoutes map", () => {
    expect(recommendedRoutesFor("ship")).toEqual({
      claude: "/ship",
      grok: "/ship",
      codex: "$ship",
    });
    expect(recommendedRoutesFor("/exec")).toEqual({
      claude: "/exec",
      grok: "/exec",
      codex: "$exec",
    });
    expect(recommendedRoutesFor("$targeted-skill-builder run gate")).toEqual({
      claude: "/targeted-skill-builder run gate",
      grok: "/targeted-skill-builder run gate",
      codex: "$targeted-skill-builder run gate",
    });
    expect(recommendedRoutesFor("node scripts/audit.mjs")).toEqual({
      claude: "node scripts/audit.mjs",
      grok: "node scripts/audit.mjs",
      codex: "node scripts/audit.mjs",
    });
  });

  it("lists both runner spellings for quality rubrics", () => {
    expect(runnerRouteVariants("/ship")).toEqual(["/ship", "$ship"]);
    expect(runnerRouteVariants("node scripts/x.mjs")).toEqual(["node scripts/x.mjs"]);
  });

  it("resolves Grok to Claude slash when grok is not explicitly listed", () => {
    const routes = { claude: "/ship", codex: "$ship" } as const;
    expect(resolveRecommendedRoute(routes, "claude")).toBe("/ship");
    expect(resolveRecommendedRoute(routes, "codex")).toBe("$ship");
    expect(resolveRecommendedRoute(routes, "grok")).toBe("/ship");
    expect(resolveRecommendedRoute(undefined, "grok", "$ship")).toBe("$ship");
    expect(resolveRecommendedRoute({ grok: "/roadmap" }, "grok", "/ship")).toBe("/roadmap");
  });

  it("flips slash and dollar spellings for alternate-runner checks", () => {
    expect(alternateSkillCommand("/exec")).toBe("$exec");
    expect(alternateSkillCommand("$exec")).toBe("/exec");
    expect(alternateSkillCommand("none")).toBeUndefined();
  });
});

const REPORT = "benchmark/test-run-2026-05-11.md";

function reportBody(nextCommand: string): string {
  return [
    "## Verify",
    "| check | result |",
    "| layer1 PASS | ok |",
    "| layer2 SKIPPED | ok |",
    "## Benchmark Metrics",
    "| metric | value |",
    "| passRate | passRate=1.0 |",
    "| p50 | p50=1200 |",
    "| totalCost | totalCost=0.42 |",
    "| raw session path | run-agent-abc |",
    "## Raw Evidence",
    "bench-output.txt verify-output.txt run-agent-abc",
    REPORT,
    "## Next Route",
    `Recommended next command: ${nextCommand}`,
  ].join("\n");
}

function makeResult(workDir: string, nextCommand: string): RunResult {
  mkdirSync(join(workDir, "benchmark"), { recursive: true });
  writeFileSync(join(workDir, REPORT), reportBody(nextCommand));
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    workDir,
    files: [REPORT],
  };
}

const created: string[] = [];
afterEach(() => {
  while (created.length) {
    try {
      rmSync(created.pop()!, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

describe("benchmark-test-skill route expectations include Grok slash", () => {
  it("expects /ship for Grok so Claude-compat handoffs do not false-fail", () => {
    const setup = resolveBenchSetup("benchmark-test-skill");
    expect(setup).toBeDefined();

    const slashDir = createTempProject();
    created.push(slashDir);
    const slashAssertions = setup!.assertResult(makeResult(slashDir, "/ship"), { agent: "grok" });
    const slashRoute = slashAssertions.find((a) => a.description === "Output recommends /ship");
    expect(slashRoute, "Grok must hard-assert Claude-compat /ship").toBeDefined();
    expect(slashRoute!.pass).toBe(true);

    const dollarDir = createTempProject();
    created.push(dollarDir);
    const dollarAssertions = setup!.assertResult(makeResult(dollarDir, "$ship"), { agent: "grok" });
    const wrongRoute = dollarAssertions.find((a) => a.description.startsWith("Output recommends"));
    expect(wrongRoute?.description).toBe("Output recommends /ship");
    expect(wrongRoute?.pass, "Grok must not accept Codex $ship as its active-runner route").toBe(false);
  });
});
