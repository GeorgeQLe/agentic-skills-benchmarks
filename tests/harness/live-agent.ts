import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type AgentName = "claude" | "codex";

export interface LiveAgentResult {
  agent: AgentName;
  stdout: string;
  stderr: string;
  exitCode: number;
  parsed: unknown;
  workDir: string;
}

export interface LiveAgentOptions {
  agent: AgentName;
  prompt: string;
  workDir: string;
  schema: object;
  timeoutMs?: number;
  maxBudgetUsd?: number;
}

export const REPO_ROOT = resolve(import.meta.dirname, "../..");

export function liveTestsEnabled(): boolean {
  return process.env.LIVE_AGENT_TESTS === "1";
}

export function agentEnabled(agent: AgentName): boolean {
  if (!liveTestsEnabled()) return false;
  const selected = process.env.LIVE_AGENT_TARGETS;
  if (!selected) return true;
  return selected
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes(agent);
}

export function commandAvailable(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

export function makeLiveTestRepo(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `skill-live-${name}-`));
  execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });
  writeFileSync(
    join(dir, "AGENTS.md"),
    [
      "# Test Agent Instructions",
      "",
      "- This is a controlled live skill test fixture.",
      "- Do not modify repository files.",
      "- Prefer evidence from files in this temp repo.",
      "",
    ].join("\n"),
  );
  return dir;
}

export function removeLiveTestRepo(dir: string | undefined): void {
  if (!dir) return;
  rmSync(dir, { recursive: true, force: true });
}

export function writeFixtureFiles(workDir: string): void {
  mkdirSync(join(workDir, "fixtures"), { recursive: true });
  writeFileSync(
    join(workDir, "fixtures", "session-incident.md"),
    [
      "# Session Incident Fixture",
      "",
      "User asked the agent to create a repo-managed skill in agentic-skills.",
      "The agent initially created a user-local skill under ~/.codex/skills.",
      "The user corrected the agent: repo-managed skills belong under global/codex and global/claude.",
      "The agent verified the repo contract and moved the work into the shared repository.",
      "",
      "Expected triage: this is one concrete incident, not a broad trend analysis.",
      "The report should classify the issue as verified from this fixture evidence.",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(workDir, "fixtures", "history-trends.md"),
    [
      "# History Trends Fixture",
      "",
      "- 2026-05-01: user asked `commit and push`.",
      "- 2026-05-02: user asked `commit and push these changes`.",
      "- 2026-05-03: user asked `can you commit and push`.",
      "- 2026-05-04: user asked for a repeated workflow automation recommendation.",
      "",
      "Expected analysis: this is a broad repeated-prompt trend suitable for analyze-sessions.",
      "",
    ].join("\n"),
  );
}

export const sessionAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "selectedSkill",
    "reason",
    "verificationVerdict",
    "timeline",
    "rootCause",
    "recommendedFix",
    "validationPlan",
    "recommendedNextSkill",
    "forbiddenAliasUsed",
  ],
  properties: {
    selectedSkill: {
      type: "string",
      enum: ["analyze-sessions", "session-triage"],
    },
    reason: { type: "string", minLength: 1 },
    verificationVerdict: {
      type: "string",
      enum: ["verified", "partially verified", "not verified", "inconclusive", "not applicable"],
    },
    timeline: {
      type: "array",
      items: { type: "string" },
    },
    rootCause: { type: "string" },
    recommendedFix: { type: "string" },
    validationPlan: {
      type: "array",
      items: { type: "string" },
    },
    recommendedNextSkill: { type: "string" },
    forbiddenAliasUsed: { type: "boolean" },
  },
} as const;

export function livePromptForScenario(scenario: "single-incident" | "broad-trends"): string {
  const fixture =
    scenario === "single-incident"
      ? "fixtures/session-incident.md"
      : "fixtures/history-trends.md";
  const task =
    scenario === "single-incident"
      ? "Investigate the one concrete issue in the fixture. Use the appropriate installed skill behavior for a focused immediate issue."
      : "Analyze the repeated prompt pattern in the fixture. Use the appropriate installed skill behavior for broad cross-session trends.";

  return [
    task,
    "",
    `Read ${fixture}.`,
    "",
    "Return only JSON matching the provided schema.",
    "Do not write files.",
    "Do not use or recommend an analyze-session command or alias.",
    "Set selectedSkill to the skill that should own this request.",
    "For a single incident, include a non-empty timeline, root cause, recommended fix, and validation plan.",
    "For broad trends, set verificationVerdict to not applicable unless the fixture supports a different verdict.",
  ].join("\n");
}

export function runLiveAgent(opts: LiveAgentOptions): LiveAgentResult {
  return opts.agent === "claude" ? runClaudeLive(opts) : runCodexLive(opts);
}

function runClaudeLive(opts: LiveAgentOptions): LiveAgentResult {
  const args = [
    "-p",
    opts.prompt,
    "--output-format",
    "json",
    "--max-budget-usd",
    String(opts.maxBudgetUsd ?? 0.75),
    "--no-session-persistence",
    "--permission-mode",
    "dontAsk",
    "--json-schema",
    JSON.stringify(opts.schema),
  ];

  return runCommandAndParseJson({
    command: "claude",
    args,
    cwd: opts.workDir,
    timeoutMs: opts.timeoutMs ?? 180_000,
    agent: "claude",
    extract: (stdout) => {
      const envelope = JSON.parse(stdout);
      if (
        typeof envelope === "object" &&
        envelope &&
        "structured_output" in envelope
      ) {
        return (envelope as { structured_output: unknown }).structured_output;
      }
      if (typeof envelope === "object" && envelope && "result" in envelope) {
        return JSON.parse(String((envelope as { result: unknown }).result));
      }
      return envelope;
    },
  });
}

function runCodexLive(opts: LiveAgentOptions): LiveAgentResult {
  const schemaPath = join(opts.workDir, "schema.json");
  const outputPath = join(opts.workDir, "codex-output.json");
  writeFileSync(schemaPath, JSON.stringify(opts.schema, null, 2));
  const args = [
    "exec",
    "--cd",
    opts.workDir,
    "--sandbox",
    "read-only",
    "--ephemeral",
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    opts.prompt,
  ];

  return runCommandAndParseJson({
    command: "codex",
    args,
    cwd: opts.workDir,
    timeoutMs: opts.timeoutMs ?? 180_000,
    agent: "codex",
    extract: (stdout) => {
      const raw = existsSync(outputPath) ? readFileSync(outputPath, "utf-8") : stdout;
      return JSON.parse(raw);
    },
  });
}

function runCommandAndParseJson(opts: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  agent: AgentName;
  extract: (stdout: string) => unknown;
}): LiveAgentResult {
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  let parsed: unknown = undefined;

  try {
    stdout = execFileSync(opts.command, opts.args, {
      cwd: opts.cwd,
      encoding: "utf-8",
      timeout: opts.timeoutMs,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
    parsed = opts.extract(stdout);
  } catch (err: any) {
    stdout = err.stdout?.toString() ?? stdout;
    stderr = err.stderr?.toString() ?? "";
    exitCode = err.status ?? 1;
    try {
      if (stdout.trim()) parsed = opts.extract(stdout);
      if (opts.agent === "claude" && claudeEnvelopeSucceeded(stdout)) {
        exitCode = 0;
      }
    } catch {
      // Keep the original command failure visible to the test assertion.
    }
  }

  return {
    agent: opts.agent,
    stdout,
    stderr,
    exitCode,
    parsed,
    workDir: opts.cwd,
  };
}

function claudeEnvelopeSucceeded(stdout: string): boolean {
  try {
    const envelope = JSON.parse(stdout);
    return (
      typeof envelope === "object" &&
      envelope !== null &&
      "is_error" in envelope &&
      (envelope as { is_error: unknown }).is_error === false
    );
  } catch {
    return false;
  }
}
