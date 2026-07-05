import { runBenchCommand, type BenchCommandOptions } from "./bench-command.js";

export function verifyCommand(opts: BenchCommandOptions = {}): number {
  return runBenchCommand(["--verify"], process.env, opts);
}
