import { spawn, spawnSync } from "node:child_process";
import type { ProviderCommandSpec } from "./adapters.js";
import { resolveProviderExecutable } from "./adapters.js";

export interface ProviderExecution {
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  outputLimited: boolean;
  directModelViolation?: boolean;
  usage: ParsedUsage;
}

export interface ParsedUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  calls: number;
}

export function parseUsage(output: string): ParsedUsage {
  const usage: ParsedUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: 0 };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value === null || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const numeric = (keys: string[]) => {
      for (const key of keys) if (typeof record[key] === "number") return record[key] as number;
      return 0;
    };
    if ("usage" in record || "input_tokens" in record || "inputTokens" in record) {
      usage.inputTokens += numeric(["input_tokens", "inputTokens"]);
      usage.cachedInputTokens += numeric(["cache_read_input_tokens", "cached_input_tokens", "cachedInputTokens"]);
      usage.outputTokens += numeric(["output_tokens", "outputTokens"]);
      usage.reasoningTokens += numeric(["reasoning_tokens", "reasoningTokens"]);
      usage.calls++;
    }
    for (const child of Object.values(record)) visit(child);
  };
  for (const line of output.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    try { visit(JSON.parse(line)); } catch { /* non-JSON provider output */ }
  }
  return usage;
}

function quotaWarning(text: string): boolean {
  return /rate.?limit|quota|usage.?limit|allowance|too many requests|reset (?:at|in)/i.test(text);
}

export function hasQuotaWarning(result: Pick<ProviderExecution, "stdout" | "stderr">): boolean {
  return quotaWarning(`${result.stdout}\n${result.stderr}`);
}

export function prohibitedModelDescendants(psOutput: string, rootPid: number): number[] {
  const processes = psOutput.split("\n").flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)/);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), command: match[3] }] : [];
  });
  const descendants = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const process of processes) {
      if ((process.ppid === rootPid || descendants.has(process.ppid)) && !descendants.has(process.pid)) {
        descendants.add(process.pid);
        changed = true;
      }
    }
  }
  return processes
    .filter((process) => descendants.has(process.pid) && /(?:^|\/)(?:codex|claude)$/.test(process.command))
    .map((process) => process.pid);
}

export function executeProvider(spec: ProviderCommandSpec): Promise<ProviderExecution> {
  return new Promise((resolve) => {
    const started = Date.now();
    const executable = resolveProviderExecutable(spec.command);
    const child = spawn(executable, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    let stdout = "";
    let stderr = "";
    let outputLimited = false;
    let directModelViolation = false;
    let timedOut = false;
    let settled = false;

    const terminateTree = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch {
        try { child.kill(signal); } catch { /* process already exited */ }
      }
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      terminateTree("SIGTERM");
      setTimeout(() => terminateTree("SIGKILL"), 2_000).unref();
    }, spec.timeoutMs);
    const processGuard = spec.role === "candidate"
      ? setInterval(() => {
          if (!child.pid || settled) return;
          const ps = spawnSync("ps", ["-axo", "pid=,ppid=,comm="], { encoding: "utf8" });
          if (ps.status === 0 && prohibitedModelDescendants(ps.stdout, child.pid).length > 0) {
            directModelViolation = true;
            stderr += "\nDirect candidate-launched model subprocess denied.\n";
            terminateTree("SIGTERM");
          }
        }, 200)
      : undefined;

    const capture = (target: "stdout" | "stderr", chunk: Buffer) => {
      const current = target === "stdout" ? stdout : stderr;
      if (Buffer.byteLength(current) + chunk.byteLength > spec.maxOutputBytes) {
        outputLimited = true;
        terminateTree("SIGTERM");
        return;
      }
      if (target === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };
    child.stdout?.on("data", (chunk: Buffer) => capture("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => capture("stderr", chunk));
    child.on("error", (error) => { stderr += error.message; });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (processGuard) clearInterval(processGuard);
      resolve({
        exitCode: code ?? 1,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
        outputLimited,
        directModelViolation,
        usage: parseUsage(stdout),
      });
    });
  });
}
