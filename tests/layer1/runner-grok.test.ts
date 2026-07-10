import { describe, expect, it } from "vitest";
import { BENCH_AGENTS, isBenchAgent } from "../harness/bench-types.js";
import { grokExecArgs } from "../harness/runner.js";
import { runBenchCommand } from "../harness/cli/bench-command.js";

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (chunk: string) => { stdout += chunk; return true; } },
      stderr: { write: (chunk: string) => { stderr += chunk; return true; } },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

describe("runGrok / BenchAgent grok", () => {
  it("exposes grok as a first-class BenchAgent", () => {
    expect(BENCH_AGENTS).toContain("grok");
    expect(isBenchAgent("grok")).toBe(true);
    expect(isBenchAgent("both")).toBe(false);
    expect(isBenchAgent("bot")).toBe(false);
  });

  it("builds unattended headless grok args with cwd, auto-approve, and turn bound", () => {
    const args = grokExecArgs("/tmp/skill-test-xyz", "Write DESIGN.md", "grok-4.5");
    expect(args).toEqual([
      "-p",
      "Write DESIGN.md",
      "--cwd",
      "/tmp/skill-test-xyz",
      "--always-approve",
      "--max-turns",
      "25",
      "--no-memory",
      "--no-auto-update",
      "--output-format",
      "plain",
      "-m",
      "grok-4.5",
    ]);
  });

  it("omits -m when no model override is set", () => {
    const args = grokExecArgs("/tmp/work", "hello");
    expect(args).not.toContain("-m");
    expect(args).toContain("--always-approve");
    expect(args).toContain("--no-memory");
  });

  it("accepts --agent grok and propagates BENCH_AGENT=grok to the worker", () => {
    const capture = captureIo();
    const envs: Record<string, string>[] = [];
    const code = runBenchCommand(
      ["--skill", "design-system", "--agent", "grok", "--runs", "1", "--budget", "1"],
      process.env,
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          envs.push(env);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(envs).toHaveLength(1);
    expect(envs[0].BENCH_AGENT).toBe("grok");
    expect(envs[0].BENCH_SKILL).toBe("design-system");
  });

  it("keeps --agent both as claude+codex only (no silent grok spend)", () => {
    const capture = captureIo();
    const agents: string[] = [];
    const code = runBenchCommand(
      ["--skill", "design-system", "--agent", "both", "--runs", "1", "--budget", "2"],
      process.env,
      {
        io: capture.io,
        spawn: (_command, _args, env = {}) => {
          if (env.BENCH_AGENT) agents.push(env.BENCH_AGENT);
          return 0;
        },
      },
    );

    expect(code).toBe(0);
    expect(agents.sort()).toEqual(["claude", "codex"]);
  });

  it("rejects unknown agents with a clear message that lists grok", () => {
    const capture = captureIo();
    const code = runBenchCommand(
      ["--skill", "design-system", "--agent", "bot", "--runs", "1", "--budget", "1"],
      process.env,
      { io: capture.io, spawn: () => 0 },
    );

    expect(code).toBe(1);
    expect(capture.stderr()).toMatch(/unknown agent "bot".*grok/i);
  });
});
