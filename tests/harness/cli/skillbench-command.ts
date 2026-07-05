import { benchHelpText, runBenchCommand, type CommandIo } from "./bench-command.js";
import { dashboardHelpText, runDashboardCommand } from "./dashboard-command.js";
import { runInteractiveShell } from "./interactive.js";
import { listCommand } from "./list-command.js";
import { stressCommand } from "./stress-command.js";
import { verifyCommand } from "./verify-command.js";

function defaultIo(): CommandIo {
  return { stdout: process.stdout, stderr: process.stderr };
}

function writeLine(stream: Pick<NodeJS.WriteStream, "write">, text = ""): void {
  stream.write(`${text}\n`);
}

export function skillbenchHelpText(): string {
  return [
    "SkillBench",
    "",
    "Usage:",
    "  pnpm skillbench",
    "  pnpm skillbench run --skill <name> [bench options]",
    "  pnpm skillbench dashboard [dashboard options]",
    "  pnpm skillbench list skills|scenarios|models",
    "  pnpm skillbench stress [--json]",
    "  pnpm skillbench verify",
    "  pnpm skillbench help",
    "",
    "Commands:",
    "  run          Run the benchmark harness",
    "  dashboard    Run the model dashboard",
    "  list         Print skills, scenarios, or models",
    "  stress       Run deterministic fake-data CLI stress checks",
    "  verify       Run catalog, coverage, and layer1 checks",
    "  help         Show this help",
    "",
    benchHelpText("pnpm skillbench run").trimEnd(),
    "",
    dashboardHelpText("pnpm skillbench dashboard").trimEnd(),
    "",
  ].join("\n");
}

export interface SkillbenchCommandOptions {
  io?: CommandIo;
  interactive?: () => Promise<number>;
  runBench?: typeof runBenchCommand;
  runDashboard?: typeof runDashboardCommand;
  verify?: typeof verifyCommand;
  list?: typeof listCommand;
  stress?: typeof stressCommand;
}

export async function runSkillbenchCommand(
  rawArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
  opts: SkillbenchCommandOptions = {},
): Promise<number> {
  const io = opts.io ?? defaultIo();
  const [command, ...rest] = rawArgs;

  if (!command) return (opts.interactive ?? runInteractiveShell)();

  if (command === "help" || command === "--help" || command === "-h") {
    writeLine(io.stdout, skillbenchHelpText());
    return 0;
  }
  if (command === "run") return (opts.runBench ?? runBenchCommand)(rest, env, { io });
  if (command === "dashboard") return (opts.runDashboard ?? runDashboardCommand)(rest, env, { io });
  if (command === "list") return (opts.list ?? listCommand)(rest, io);
  if (command === "stress") return (opts.stress ?? stressCommand)(rest, io);
  if (command === "verify") return (opts.verify ?? verifyCommand)({ io });

  writeLine(io.stderr, `unknown command "${command}"`);
  writeLine(io.stderr, "Run `pnpm skillbench help` for usage.");
  return 1;
}
