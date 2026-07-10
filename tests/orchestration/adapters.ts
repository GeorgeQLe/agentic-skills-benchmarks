import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { subscriptionSafeEnv } from "./corpus.js";
import { MODEL_PINS } from "./design.js";
import type { Effort, Worker } from "./types.js";

export type ProviderRole = "candidate" | "worker" | "judge";

export interface ProviderCommandSpec {
  provider: "openai" | "anthropic";
  command: "codex" | "claude";
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  role: ProviderRole;
  model: string;
  ephemeral: true;
  readOnly: boolean;
  timeoutMs: number;
  maxOutputBytes: number;
}

export const WORKER_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["facts", "inferences", "risks", "recommendations", "verification"],
  properties: {
    facts: { type: "array", items: { type: "string" } },
    inferences: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    verification: { type: "array", items: { type: "string" } },
  },
} as const;

export const CANDIDATE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "verification", "pushback", "workerEvidenceUsed"],
  properties: {
    summary: { type: "array", items: { type: "string" } },
    verification: { type: "array", items: { type: "string" } },
    pushback: { type: "array", items: { type: "string" } },
    workerEvidenceUsed: { type: "array", items: { type: "integer" } },
  },
} as const;

export const JUDGE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["requirements", "codeQuality", "directionFollowing", "intentAndPushback", "criticalFailure", "pass", "evidence"],
  properties: {
    requirements: { type: "integer", minimum: 0, maximum: 30 },
    codeQuality: { type: "integer", minimum: 0, maximum: 25 },
    directionFollowing: { type: "integer", minimum: 0, maximum: 20 },
    intentAndPushback: { type: "integer", minimum: 0, maximum: 25 },
    criticalFailure: { type: "boolean" },
    pass: { type: "boolean" },
    evidence: { type: "array", items: { type: "string" } },
  },
} as const;

function effortConfig(effort: Effort): string {
  return `model_reasoning_effort=${JSON.stringify(effort)}`;
}

function safeEnv(env: NodeJS.ProcessEnv, denyShimDir?: string): NodeJS.ProcessEnv {
  const result = subscriptionSafeEnv(env);
  result.CI = "1";
  result.NO_COLOR = "1";
  result.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  if (denyShimDir) result.PATH = `${denyShimDir}${delimiter}${result.PATH ?? ""}`;
  return result;
}

function codexArgs(input: {
  cwd: string;
  prompt: string;
  model: string;
  effort: Effort;
  readOnly: boolean;
  schemaPath: string;
  outputPath: string;
}): string[] {
  return [
    "exec",
    "--json",
    "--sandbox", input.readOnly ? "read-only" : "workspace-write",
    "--ephemeral",
    "--ignore-user-config",
    "--strict-config",
    "--model", input.model,
    "--config", effortConfig(input.effort),
    "--cd", input.cwd,
    "--output-schema", input.schemaPath,
    "--output-last-message", input.outputPath,
    input.prompt,
  ];
}

export function codexCandidateSpec(input: {
  cwd: string;
  prompt: string;
  effort: Effort;
  schemaPath: string;
  outputPath: string;
  denyShimDir: string;
  env?: NodeJS.ProcessEnv;
}): ProviderCommandSpec {
  return {
    provider: "openai",
    command: "codex",
    args: codexArgs({ ...input, model: MODEL_PINS.orchestrator, readOnly: false }),
    cwd: input.cwd,
    env: safeEnv(input.env ?? process.env, input.denyShimDir),
    role: "candidate",
    model: MODEL_PINS.orchestrator,
    ephemeral: true,
    readOnly: false,
    timeoutMs: 20 * 60_000,
    maxOutputBytes: 20 * 1024 * 1024,
  };
}

export function codexWorkerSpec(input: {
  worker: Exclude<Worker, "opus-4.8">;
  cwd: string;
  prompt: string;
  effort: Effort;
  schemaPath: string;
  outputPath: string;
  denyShimDir: string;
  env?: NodeJS.ProcessEnv;
}): ProviderCommandSpec {
  const model = MODEL_PINS.workers[input.worker];
  return {
    provider: "openai",
    command: "codex",
    args: codexArgs({ ...input, model, readOnly: true }),
    cwd: input.cwd,
    env: safeEnv(input.env ?? process.env, input.denyShimDir),
    role: "worker",
    model,
    ephemeral: true,
    readOnly: true,
    timeoutMs: 8 * 60_000,
    maxOutputBytes: 8 * 1024 * 1024,
  };
}

function claudeArgs(input: {
  prompt: string;
  model: string;
  effort: Effort;
  schema: object;
  tools: string;
}): string[] {
  return [
    "--print",
    "--model", input.model,
    "--effort", input.effort,
    "--max-turns", "12",
    "--output-format", "json",
    "--json-schema", JSON.stringify(input.schema),
    "--no-session-persistence",
    "--permission-mode", "dontAsk",
    "--strict-mcp-config",
    "--mcp-config", JSON.stringify({ mcpServers: {} }),
    "--tools", input.tools,
    "--disallowed-tools", "Edit,Write,NotebookEdit,WebFetch,WebSearch",
    "-p", input.prompt,
  ];
}

export function claudeWorkerSpec(input: {
  cwd: string;
  prompt: string;
  effort: Effort;
  denyShimDir: string;
  env?: NodeJS.ProcessEnv;
}): ProviderCommandSpec {
  return {
    provider: "anthropic",
    command: "claude",
    args: claudeArgs({ prompt: input.prompt, model: MODEL_PINS.workers["opus-4.8"], effort: input.effort, schema: WORKER_OUTPUT_SCHEMA, tools: "Read,Glob,Grep" }),
    cwd: input.cwd,
    env: safeEnv(input.env ?? process.env, input.denyShimDir),
    role: "worker",
    model: MODEL_PINS.workers["opus-4.8"],
    ephemeral: true,
    readOnly: true,
    timeoutMs: 8 * 60_000,
    maxOutputBytes: 8 * 1024 * 1024,
  };
}

export function judgeSpec(input: {
  family: "gpt" | "claude";
  cwd: string;
  prompt: string;
  schemaPath: string;
  outputPath: string;
  denyShimDir: string;
  env?: NodeJS.ProcessEnv;
}): ProviderCommandSpec {
  if (input.family === "gpt") {
    return {
      provider: "openai",
      command: "codex",
      args: codexArgs({ cwd: input.cwd, prompt: input.prompt, model: MODEL_PINS.judges.gpt, effort: "high", readOnly: true, schemaPath: input.schemaPath, outputPath: input.outputPath }),
      cwd: input.cwd,
      env: safeEnv(input.env ?? process.env, input.denyShimDir),
      role: "judge",
      model: MODEL_PINS.judges.gpt,
      ephemeral: true,
      readOnly: true,
      timeoutMs: 8 * 60_000,
      maxOutputBytes: 8 * 1024 * 1024,
    };
  }
  return {
    provider: "anthropic",
    command: "claude",
    args: claudeArgs({ prompt: input.prompt, model: MODEL_PINS.judges.claude, effort: "high", schema: JUDGE_OUTPUT_SCHEMA, tools: "" }),
    cwd: input.cwd,
    env: safeEnv(input.env ?? process.env, input.denyShimDir),
    role: "judge",
    model: MODEL_PINS.judges.claude,
    ephemeral: true,
    readOnly: true,
    timeoutMs: 8 * 60_000,
    maxOutputBytes: 8 * 1024 * 1024,
  };
}

export function createDenyShimDirectory(root: string): string {
  const dir = resolve(root, "deny-model-subprocesses");
  mkdirSync(dir, { recursive: true });
  const script = "#!/bin/sh\necho 'direct model subprocess denied; use the metered delegation service' >&2\nexit 126\n";
  for (const command of ["codex", "claude"]) {
    const path = resolve(dir, command);
    writeFileSync(path, script, { mode: 0o755 });
    chmodSync(path, 0o755);
  }
  return dir;
}

export function resolveProviderExecutable(command: "codex" | "claude", env = process.env): string {
  try {
    return execFileSync("which", [command], { encoding: "utf8", env: subscriptionSafeEnv(env) }).trim();
  } catch {
    return command;
  }
}
