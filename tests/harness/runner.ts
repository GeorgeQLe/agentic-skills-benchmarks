import { execSync } from "node:child_process";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { RunResult } from "./types.js";

const execFileAsync = promisify(execFile);

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const PACK_SCRIPT = join(REPO_ROOT, "scripts/pack.sh");

export function createTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "skill-test-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  return dir;
}

export function installPack(workDir: string, pack: string): void {
  execSync(`bash "${PACK_SCRIPT}" install ${pack}`, {
    cwd: workDir,
    stdio: "pipe",
    env: { ...process.env, HOME: process.env.HOME },
  });
}

function listFilesRecursive(dir: string, base = ""): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...listFilesRecursive(full, rel));
      } else {
        results.push(rel);
      }
    } catch {
      // skip unreadable
    }
  }
  return results;
}

export interface RunOptions {
  prompt: string;
  workDir: string;
  maxBudgetUsd?: number;
  timeoutMs?: number;
}

export const CODEX_EXEC_STDIO = ["ignore", "pipe", "pipe"] as const;

export async function runClaude(opts: RunOptions): Promise<RunResult> {
  const { prompt, workDir, maxBudgetUsd = 0.5, timeoutMs = 120_000 } = opts;

  const args = [
    "--print",
    "--dangerously-skip-permissions",
    "--max-turns", "25",
    "--max-budget-usd", String(maxBudgetUsd),
    "-p", prompt,
  ];

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execFileAsync("claude", args, {
      cwd: workDir,
      timeout: timeoutMs,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: any) {
    stdout = err.stdout ?? "";
    stderr = err.stderr ?? "";
    exitCode = err.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? 1 : (err.status ?? err.code ?? 1);
  }

  return {
    stdout,
    stderr,
    exitCode,
    workDir,
    files: listFilesRecursive(workDir),
  };
}

export async function runCodex(opts: RunOptions): Promise<RunResult> {
  const { prompt, workDir, timeoutMs = 120_000 } = opts;

  const args = codexExecArgs(workDir, prompt);

  const result = await runSpawnedCommand("codex", args, {
    cwd: workDir,
    timeoutMs,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    workDir,
    files: listFilesRecursive(workDir),
  };
}

export function codexExecArgs(workDir: string, prompt: string): string[] {
  return [
    "exec",
    "--cd", workDir,
    "--sandbox", "workspace-write",
    "--ephemeral",
    prompt,
  ];
}

async function runSpawnedCommand(
  command: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      stdio: CODEX_EXEC_STDIO,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      child.kill("SIGTERM");
    }, opts.timeoutMs);

    child.stdout?.setEncoding("utf-8");
    child.stderr?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stderr += err.message;
      resolve({ stdout, stderr, exitCode: 1 });
    });

    child.on("close", (code: number | null, signal: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const exitCode = code ?? (signal ? 143 : 1);
      resolve({ stdout, stderr, exitCode });
    });
  });
}
