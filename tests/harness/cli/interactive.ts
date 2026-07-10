import { runBenchCommand } from "./bench-command.js";
import { runDashboardCommand } from "./dashboard-command.js";
import { listCommand } from "./list-command.js";
import { verifyCommand } from "./verify-command.js";

const ESC = "\x1b[";

interface MenuItem {
  label: string;
  description: string;
  action: () => Promise<void> | void;
}

function clear(): void {
  process.stdout.write(`${ESC}2J${ESC}H`);
}

function restore(): void {
  process.stdout.write(`${ESC}?25h`);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

function question(prompt: string, fallback: string): Promise<string> {
  restore();
  process.stdout.write(`${prompt} (${fallback}): `);
  return new Promise((resolve) => {
    process.stdin.once("data", (chunk) => {
      const value = String(chunk).trim();
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdout.write(`${ESC}?25l`);
      resolve(value || fallback);
    });
  });
}

async function promptArgs(kind: "run" | "dashboard"): Promise<string[]> {
  if (kind === "run") {
    const targetKind = await question("Target type: skill or scenario", "skill");
    const target = await question("Target name", "investigate");
    const agent = await question("Agent: claude, codex, grok, or both", "both");
    const runs = await question("Runs", "1");
    const chunkSize = await question("Chunk size", runs);
    const budget = await question("Budget USD", "1");
    return [
      targetKind === "scenario" ? "--scenario" : "--skill",
      target,
      "--agent",
      agent,
      "--runs",
      runs,
      "--chunk-size",
      chunkSize,
      "--budget",
      budget,
    ];
  }

  const models = await question("Dashboard models", "gpt-5");
  const skills = await question("Skills", "investigate");
  const runs = await question("Runs per cell", "1");
  const budget = await question("Budget USD", "1");
  const mode = await question("Mode: mock or live", "mock");
  return [
    "--models",
    models,
    "--skills",
    skills,
    "--runs",
    runs,
    "--budget",
    budget,
    "--no-live",
    ...(mode === "mock" ? ["--mock"] : []),
  ];
}

function render(items: MenuItem[], selected: number): void {
  clear();
  process.stdout.write("SkillBench\n\n");
  for (let i = 0; i < items.length; i++) {
    const marker = i === selected ? ">" : " ";
    process.stdout.write(`${marker} ${items[i].label.padEnd(22)} ${items[i].description}\n`);
  }
  process.stdout.write("\nUp/down or j/k to move. Enter selects. q, Esc, or Ctrl-C exits.\n");
}

async function pause(): Promise<void> {
  process.stdout.write("\nPress any key to return to SkillBench.");
  await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));
}

export async function runInteractiveShell(): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write("Interactive SkillBench requires a TTY. Run `pnpm skillbench help` for scriptable commands.\n");
    return 1;
  }

  let selected = 0;
  let done = false;
  const items: MenuItem[] = [
    {
      label: "Run benchmark",
      description: "Configure and launch a skill or scenario run",
      action: async () => {
        const args = await promptArgs("run");
        clear();
        runBenchCommand(args);
        await pause();
      },
    },
    {
      label: "Open model dashboard",
      description: "Run the live or mock model matrix",
      action: async () => {
        const args = await promptArgs("dashboard");
        clear();
        await runDashboardCommand(args);
        await pause();
      },
    },
    {
      label: "List skills",
      description: "Show benchmark coverage",
      action: async () => {
        listCommand(["skills"]);
        await pause();
      },
    },
    {
      label: "List scenarios",
      description: "Show runnable scenarios",
      action: async () => {
        listCommand(["scenarios"]);
        await pause();
      },
    },
    {
      label: "List models",
      description: "Show dashboard model targets",
      action: async () => {
        listCommand(["models"]);
        await pause();
      },
    },
    {
      label: "Verify harness",
      description: "Run catalog, coverage, and layer1 tests",
      action: async () => {
        verifyCommand();
        await pause();
      },
    },
    {
      label: "Help / quit",
      description: "Leave the shell",
      action: () => {
        done = true;
      },
    },
  ];

  process.stdout.write(`${ESC}?25l`);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const onSignal = () => {
    restore();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);

  try {
    while (!done) {
      render(items, selected);
      const key = await new Promise<Buffer>((resolve) => process.stdin.once("data", resolve));
      const text = key.toString("utf8");
      if (text === "\u0003" || text === "\u001b" || text === "q") break;
      if (text === "\r" || text === "\n") {
        clear();
        await items[selected].action();
      } else if (text === "\u001b[A" || text === "k") {
        selected = (selected - 1 + items.length) % items.length;
      } else if (text === "\u001b[B" || text === "j") {
        selected = (selected + 1) % items.length;
      }
    }
    return 0;
  } finally {
    process.off("SIGINT", onSignal);
    restore();
    clear();
  }
}
