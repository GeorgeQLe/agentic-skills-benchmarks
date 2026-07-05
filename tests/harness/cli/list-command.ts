import {
  supportedBenchScenarioRows,
  supportedBenchSkillRows,
} from "../bench-setups.js";
import { DEFAULT_MODEL_MATRIX } from "../dashboard/model-matrix.js";
import type { CommandIo } from "./bench-command.js";

function defaultIo(): CommandIo {
  return { stdout: process.stdout, stderr: process.stderr };
}

function writeLine(stream: Pick<NodeJS.WriteStream, "write">, text = ""): void {
  stream.write(`${text}\n`);
}

export function listCommand(rawArgs: string[], io: CommandIo = defaultIo()): number {
  const target = rawArgs[0];
  if (target === "skills") {
    for (const row of supportedBenchSkillRows()) {
      writeLine(io.stdout, `${row.skill}\t${row.coverage_status}\t${row.setup_path ?? ""}`);
    }
    return 0;
  }
  if (target === "scenarios") {
    for (const row of supportedBenchScenarioRows()) {
      writeLine(io.stdout, `${row.scenario}\t${row.setup_path}\t${row.description}`);
    }
    return 0;
  }
  if (target === "models") {
    for (const model of DEFAULT_MODEL_MATRIX) {
      writeLine(io.stdout, `${model.id.padEnd(16)} ${model.cli.padEnd(7)} ${model.model.padEnd(14)} ${model.label}`);
    }
    return 0;
  }
  writeLine(io.stderr, `unknown list target "${target ?? ""}" (expected skills, scenarios, or models)`);
  return 1;
}
