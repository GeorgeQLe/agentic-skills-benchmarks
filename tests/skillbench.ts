#!/usr/bin/env node
import { runSkillbenchCommand } from "./harness/cli/skillbench-command.js";

const code = await runSkillbenchCommand(process.argv.slice(2), process.env);
process.exit(code);
