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

const QUOTA_MESSAGE = /(?:quota|usage\s+limit)\s+(?:has\s+been\s+)?(?:reached|exceeded)|too many requests|http(?:\/\S+)?\s+429|\b429\b[^\n]{0,80}rate.?limit|rate.?limit(?:ed|\s+(?:reached|exceeded|error))/i;

function structuredQuotaWarning(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(structuredQuotaWarning);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if ("rate_limit_reached_type" in record && record.rate_limit_reached_type !== null && record.rate_limit_reached_type !== undefined) return true;
  const classification = [record.type, record.event, record.level, record.severity, record.status]
    .filter((item): item is string => typeof item === "string")
    .join(" ");
  const providerWarning = /(?:^|[_.:-])(error|warning|warn)(?:$|[_.:-])/i.test(classification)
    || /^(?:error|warning|warn)$/i.test(classification);
  if (providerWarning) {
    const messages = [record.message, record.error, record.warning, record.detail, record.reason]
      .filter((item) => item !== undefined)
      .map((item) => typeof item === "string" ? item : JSON.stringify(item));
    if (messages.some((message) => QUOTA_MESSAGE.test(message))) return true;
  }
  return Object.values(record).some(structuredQuotaWarning);
}

function streamHasQuotaWarning(stream: string): boolean {
  return stream.split(/\r?\n/).some((line) => {
    const text = line.trim();
    if (!text) return false;
    try { return structuredQuotaWarning(JSON.parse(text)); }
    catch { return QUOTA_MESSAGE.test(text); }
  });
}

export function hasQuotaWarning(result: Pick<ProviderExecution, "stdout" | "stderr">): boolean {
  return streamHasQuotaWarning(result.stdout) || streamHasQuotaWarning(result.stderr);
}

export function prohibitedModelDescendants(psOutput: string, rootPid: number, providerRuntime?: "codex" | "claude"): number[] {
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
    .filter((process) => {
      if (!descendants.has(process.pid) || !/(?:^|[\\/])(?:codex|claude)(?:\.exe)?$/.test(process.command)) return false;
      const basename = process.command.split(/[\\/]/).at(-1)?.replace(/\.exe$/, "");
      // Script-based provider launchers (for example codex.js under node) spawn one
      // native provider runtime directly. Only that direct child is trusted; model
      // processes launched beneath it remain prohibited.
      return !(providerRuntime && process.ppid === rootPid && basename === providerRuntime);
    })
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
          if (ps.status === 0 && prohibitedModelDescendants(ps.stdout, child.pid, spec.command).length > 0) {
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
